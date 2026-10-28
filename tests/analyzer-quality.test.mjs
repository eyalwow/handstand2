import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {analyzeCoachIssues,buildCoachEvidence,buildCoachLocalPlan,validateCoachResponse} from "../vercel-app/ai-feedback.js";
import {PoseWorkerRuntime,analysisTimeoutMs} from "../vercel-app/pose-runtime.js";

const html=readFileSync(new URL("../vercel-app/index.html",import.meta.url),"utf8");
const begin=html.indexOf("const K={"),end=html.indexOf("const sideOf=fr=>",begin);
const context={};
vm.runInNewContext(html.slice(begin,end)+"\nglobalThis.analyze=analyze;globalThis.reliableResult=reliableResult;",context);
function frame(visibility=1,offset=0){
 const points=Array.from({length:33},()=>({x:100,y:100,v:visibility}));
 for(const [idx,y] of [[15,400],[13,320],[11,240],[23,160],[27,80],[16,400],[14,320],[12,240],[24,160],[28,80]]){
  points[idx]={x:100+offset,y,v:visibility};
 }
 return points;
}
test("clear held line yields a high single overall score and is eligible to compare",()=>{
 const res=context.analyze(Array.from({length:25},()=>frame()),10);
 assert.ok(res.total>=95);
 assert.equal(res.hold,2.5);
 assert.equal(context.reliableResult(res,10),true);
});
test("short, poorly visible and fragmented tracks do not qualify for a score",()=>{
 const short=context.analyze(Array.from({length:7},()=>frame()),10);
 const low=context.analyze(Array.from({length:25},()=>frame(.4)),10);
 const segmented=context.analyze(Array.from({length:25},(_,i)=>i%3?frame():null),10);
 assert.equal(context.reliableResult(short,10),false);
 assert.equal(context.reliableResult(low,10),false);
 assert.equal(context.reliableResult(segmented,10),false);
 assert.equal(context.reliableResult(null,10),false);
});
test("a split-leg hold is not scored as if the visible ankle were the body line",()=>{
 const frames=Array.from({length:25},()=>{const f=frame();f[28]={...f[28],x:240};return f});
 const res=context.analyze(frames,10);
 assert.equal(res.diagnostics.legsApart,true);
 assert.equal(context.reliableResult(res,10),false);
});
test("measured problems are actionable, bounded and do not expose technical scores",()=>{
 const res={val:{banana:.11,lean:6,shoulder:30,elbow:7,sway:.005},sc:{banana:30,lean:75,shoulder:42,elbow:90,sway:92},total:61,hold:3.3,swayOk:true};
 const issues=analyzeCoachIssues(res,null);
 assert.deepEqual(issues.map(i=>i.key),["hold_banana","hold_shoulder","hold_lean"]);
 assert.ok(!issues.some(i=>/°|מעלות|ציון|\/100/.test(i.finding+i.correction)));
 const evidence=buildCoachEvidence(res,null,issues),local=buildCoachLocalPlan(issues,evidence);
 assert.ok(local.drills.length>=2&&local.drills.length<=3);
 assert.equal(evidence.hold.metrics.leanDegrees,6);
 assert.equal(evidence.hold.metrics.shoulderDeficitDegrees,30);
 assert.ok(!JSON.stringify(issues).includes("Degrees"));
 const raw={summary:"פציעה 45°",observations:[{key:"hold_banana",finding:"שקר",correction:"שקר"}],drills:[{id:"hollow",reason:"שקר"}]};
 const ai=validateCoachResponse(raw,evidence,issues);
 assert.equal(ai.observations[0].key,issues[0].key);
 assert.ok(!JSON.stringify(ai).includes("שקר"));
 assert.ok(ai.drills.length>=2);
 assert.ok(!ai.summary.includes("פציעה"));
});

test("pose inference runs through a cancellable worker with increasing timestamps",async()=>{
 const timestamps=[];
 class FakeWorker{
  postMessage(message){
   if(message.type==="init")queueMicrotask(()=>this.onmessage({data:{id:message.id,type:"ready",delegate:"CPU"}}));
   else{timestamps.push(message.timestamp);queueMicrotask(()=>this.onmessage({data:{id:message.id,type:"result",inferenceMs:12,landmarks:[]} }))}
  }
  terminate(){this.terminated=true}
 }
 const worker=new FakeWorker(),runtime=new PoseWorkerRuntime({workerFactory:()=>worker,requestTimeoutMs:50});
 assert.equal((await runtime.init()).delegate,"CPU");
 assert.equal((await runtime.detect({},null)).inferenceMs,12);
 assert.equal((await runtime.detect({},null)).inferenceMs,12);
 assert.deepEqual(timestamps,[100,200]);
 const stalledWorker=new FakeWorker();stalledWorker.postMessage=message=>{if(message.type==="init")queueMicrotask(()=>stalledWorker.onmessage({data:{id:message.id,type:"ready",delegate:"CPU"}}))};
 const stalled=new PoseWorkerRuntime({workerFactory:()=>stalledWorker,requestTimeoutMs:50}),controller=new AbortController();
 await stalled.init();const pending=stalled.detect({},controller.signal);controller.abort(new DOMException("cancelled","AbortError"));
 await assert.rejects(pending,error=>error.name==="AbortError");assert.equal(stalledWorker.terminated,true);
 const timeoutWorker=new FakeWorker();timeoutWorker.postMessage=message=>{if(message.type==="init")queueMicrotask(()=>timeoutWorker.onmessage({data:{id:message.id,type:"ready",delegate:"CPU"}}))};
 const timed=new PoseWorkerRuntime({workerFactory:()=>timeoutWorker,requestTimeoutMs:5});await timed.init();
 await assert.rejects(timed.detect({},null),error=>error.name==="TimeoutError");assert.equal(timeoutWorker.terminated,true);
 assert.equal(analysisTimeoutMs(16.83),60000);assert.equal(analysisTimeoutMs(120),180000);
});
