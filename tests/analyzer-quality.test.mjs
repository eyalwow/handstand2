import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import {analyzeCoachIssues,buildCoachEvidence,buildCoachLocalPlan,validateCoachResponse} from "../vercel-app/ai-feedback.js";

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
 assert.ok(!JSON.stringify(evidence).includes("Degrees"));
 const raw={summary:"פציעה 45°",observations:[{key:"hold_banana",finding:"שקר",correction:"שקר"}],drills:[{id:"hollow",reason:"שקר"}]};
 const ai=validateCoachResponse(raw,evidence,issues);
 assert.equal(ai.observations[0].key,issues[0].key);
 assert.ok(!JSON.stringify(ai).includes("שקר"));
 assert.ok(ai.drills.length>=2);
 assert.ok(!ai.summary.includes("פציעה"));
});

test("reused landmarker receives increasing timestamps across videos and resets after a detection failure",()=>{
 const begin=html.indexOf("let poseTimestamp=0;"),end=html.indexOf("function scanPlay",begin);
 assert.ok(begin>=0&&end>begin);
 const detectorContext={LM:{}};
 vm.runInNewContext(html.slice(begin,end)+"\nglobalThis.detectPoseFrame=detectPoseFrame;",detectorContext);
 const times=[];
 const lm={detectForVideo(_canvas,t){times.push(t);if(times.length===3)throw Error("failed");return {}},close(){this.closed=true}};
 detectorContext.detectPoseFrame(lm,{});
 detectorContext.detectPoseFrame(lm,{});
 assert.throws(()=>detectorContext.detectPoseFrame(lm,{}),/failed/);
 assert.equal(lm.closed,true);
 assert.equal(detectorContext.LM,null);
 detectorContext.detectPoseFrame({detectForVideo(_canvas,t){times.push(t);return {}}},{});
 assert.deepEqual(times,[100,200,300,400]);
});
