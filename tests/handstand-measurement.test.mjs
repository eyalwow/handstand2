import test from 'node:test';
import assert from 'node:assert/strict';
import {measureHandstand} from '../vercel-app/handstand-measurement.js';
import {analyzeHandstandTimeline,extractTemporalSamples,establishedHoldRuns} from '../vercel-app/handstand-temporal.js';
import {scanHandstandFrames} from '../vercel-app/handstand-sampling.js';
import {readAnalysisHistory} from '../vercel-app/analysis-history.js';

// Analytic landmarks verify geometry and event logic, not athlete accuracy.
function pose({hipX=300,ankleY=120,hipY=330,elbowX=300,elbowY=600,vis=1}={}) {
  const f=Array.from({length:33},()=>({x:300,y:200,v:vis}));
  for(const side of [0,1])for(const [i,x,y] of [[11,300,500],[13,elbowX,elbowY],[15,300,700],[23,hipX,hipY],[27,300,ankleY]])f[i+side]={x,y,v:vis};
  return f;
}
const data=frames=>({frames,timestamps:frames.map((_,i)=>i/10),width:600,height:800});
const held=(n=81,options)=>Array.from({length:n},()=>pose(options));

test('three identical inputs give identical duration and every score component',()=>{
  const input=data(held()),copy=structuredClone(input),runs=Array.from({length:3},()=>measureHandstand(input));
  assert.deepEqual(runs[0],runs[1]);assert.deepEqual(runs[1],runs[2]);assert.deepEqual(input,copy);
  assert.equal(runs[0].hold.hold,8);assert.equal(runs[0].hold.total,100);
  assert.equal(runs[0].hold.hold,runs[0].timeline.hold.seconds);
});
test('ankle correction above old velocity gate does not split an established inverted hold',()=>{
  const frames=held();frames[40]=pose({ankleY:165});
  const result=measureHandstand(data(frames));
  assert.equal(result.timeline.hold.seconds,8);
  assert.equal(result.hold.diagnostics.validFrames,81);
});
test('real exit, large leg lowering and occlusion cannot join separate holds',()=>{
  for(const middle of [[null],[pose({hipY:600,ankleY:740})],[pose({ankleY:230})]]) {
    const result=measureHandstand(data([...held(31),...middle,...held(31)]));
    assert.ok(result.timeline.hold.seconds<=3);
  }
  const frames=[...held(31),...Array.from({length:10},(_,i)=>pose({hipY:360+i*30,ankleY:190+i*65}))];
  assert.ok(measureHandstand(data(frames)).timeline.hold.seconds<=3.1);
});
test('a fast kick through inversion cannot establish a hold',()=>{
  const frames=Array.from({length:9},(_,i)=>pose({ankleY:300-i*30}));
  assert.equal(measureHandstand(data(frames)).hold,null);
});
test('slow progressive leg lowering is bounded against the initial established extension',()=>{
  const frames=[...held(31),...Array.from({length:15},(_,i)=>pose({ankleY:130+i*10}))];
  const result=measureHandstand(data(frames));
  assert.ok(result.timeline.hold.seconds<4);
  assert.ok(result.timeline.hold.endFrame<frames.length-1);
});
function supportLoweringFrames({recover=false,translate=false}={}) {
  return [...held(31),...Array.from({length:20},(_,i)=>{
    const step=recover?Math.max(0,3-Math.abs(i-2)):i+1;
    const f=pose({elbowX:300+step*2,elbowY:600+step*2});
    for(const s of [0,1]){f[11+s].y+=step*5;f[23+s].y+=step*5;}
    return translate?pose().map(p=>({...p,y:p.y+step*5})):f;
  })];
}
test('sustained support lowering ends the hold before inversion is lost',()=>{
  const input=data(supportLoweringFrames()),result=measureHandstand(input);
  assert.ok(result.hold.hold<=3.2);
  assert.equal(result.timeline.hold.endReason,'support-lowering');
  assert.equal(result.timeline.hold.endObserved,true);
  assert.notEqual(result.timeline.ending.kind,'possible-balance-loss');
  const runs=establishedHoldRuns(extractTemporalSamples(input.frames,input.timestamps,input));
  assert.equal(runs.length,1,'continued lowering must not establish another hold');
});
test('occluded or collapsed support evidence cannot certify coordinated lowering',()=>{
  for(const collapse of [false,true]) {
    const input=data(supportLoweringFrames());
    input.frames=input.frames.map(f=>f.map(p=>({...p})));
    for(let i=31;i<input.frames.length;i++)for(const side of [0,1]) {
      if(collapse) input.frames[i][13+side]={...input.frames[i][11+side]};
      else input.frames[i][13+side].v=.2;
    }
    const result=measureHandstand(input);
    assert.notEqual(result.timeline.hold?.endReason,'support-lowering');
    assert.equal(result.timeline.hold?.endObserved,false);
  }
});
test('a recovered support or a new attempt can establish another hold after lowering',()=>{
  for(const reset of [[],[pose({hipY:600,ankleY:740})]]) {
    const frames=[...supportLoweringFrames(),...reset,...held(51)];
    const result=measureHandstand(data(frames));
    assert.ok(result.timeline.hold.seconds>=4.8 && result.timeline.hold.seconds<=5);
    assert.ok(result.timeline.hold.start>=5.1);
  }
});
test('constant bent arms, a brief correction and camera translation do not imply support lowering',()=>{
  const bent=held(81,{elbowX:330});
  assert.equal(measureHandstand(data(bent)).timeline.hold.seconds,8);
  for(const options of [{recover:true},{translate:true}]) {
    const result=measureHandstand(data(supportLoweringFrames(options)));
    assert.equal(result.timeline.hold.seconds,5);
    assert.notEqual(result.timeline.hold.endReason,'support-lowering');
  }
});
test('a finite measured body-line deviation beyond the zero band stays zero; weak hidden-side arms are excluded',()=>{
  const frames=held(81,{hipX:390});
  for(const f of frames)f[13].v=.4;
  const result=measureHandstand(data(frames));
  assert.equal(result.hold.k.shoulder,12);
  assert.equal(result.hold.sc.banana,0);
  assert.ok(result.hold.val.banana>=.18);
  assert.ok(Number.isFinite(result.hold.total)&&result.hold.total>=1);
});
test('low visibility, nonfinite, repeated source times, upright and split legs do not receive a grade',()=>{
  for(const frames of [held(31,{vis:.5}),held(31,{hipY:600,ankleY:740}),held().map(f=>{f[28].x=550;return f}),held().map(f=>{f[11].x=NaN;f[12].x=NaN;return f})])assert.equal(measureHandstand(data(frames)).hold,null);
  const input=data(held());input.timestamps[20]=input.timestamps[19];assert.equal(measureHandstand(input).hold,null);
});
test('collapsed arm segments are unavailable rather than receiving a spurious zero',()=>{
  const result=measureHandstand(data(held(81,{elbowY:500})));
  assert.equal(result.hold,null);assert.equal(result.diagnostics.reason,'insufficient-geometry');
});
test('isolated arm tracking jumps are excluded from technique measurements',()=>{
  const frames=held();frames[40]=pose({elbowX:490});
  const result=measureHandstand(data(frames));
  assert.equal(result.hold.total,100);assert.equal(result.hold.diagnostics.validFrames,80);
});
test('body-line distance is invariant under rotation; technical grades still distinguish quality',()=>{
  const input=data(held(81,{hipX:350}));
  const tilted=structuredClone(input),theta=15*Math.PI/180;
  tilted.frames=tilted.frames.map(f=>f.map(p=>({x:300+(p.x-300)*Math.cos(theta)-(p.y-500)*Math.sin(theta),y:500+(p.x-300)*Math.sin(theta)+(p.y-500)*Math.cos(theta),v:p.v})));
  const a=measureHandstand(input).hold,b=measureHandstand(tilted).hold;
  assert.ok(Math.abs(a.sc.banana-b.sc.banana)<1e-9);
  const scores=[{}, {hipX:350}, {hipX:390,elbowX:360}].map(options=>measureHandstand(data(held(81,options))).hold.total);
  assert.ok(scores[0]>scores[1]&&scores[1]>scores[2]);assert.ok(scores.every(s=>s>=1&&s<=100));
});
test('duration is not a technique component and score uses the selected longest interval',()=>{
  const short=measureHandstand(data(held(31))),long=measureHandstand(data(held(201)));
  assert.equal(short.hold.total,long.hold.total);
  const result=measureHandstand(data([...held(31,{hipX:380}),null,...held(81)]));
  assert.equal(result.hold.total,100);assert.equal(result.hold.diagnostics.startFrame,result.timeline.hold.startFrame);
});
test('clipped footage stays censored and the new history model never overwrites legacy data',()=>{
  assert.equal(analyzeHandstandTimeline(data(held())).hold.censored,true);
  const entries=[{score:80,model:'v3-fixed-hold',date:'2026-10-30'},{score:90,model:'v4-observed-hold',date:'2026-10-31'}];
  assert.equal(readAnalysisHistory({getItem:()=>JSON.stringify(entries)}).length,2);
});

class PresentedVideo extends EventTarget {
  constructor({stall=false,duplicate=false}={}) {super();this.readyState=2;this.seeking=false;this.time=0;this.stall=stall;this.duplicate=duplicate;this.callbacks=new Map();this.next=0;}
  pause(){}
  get currentTime(){return this.time;}
  set currentTime(t){this.seeking=true;setTimeout(()=>{this.time=t;this.seeking=false;this.dispatchEvent(new Event('seeked'));if(!this.stall)setTimeout(()=>{for(const [id,fn] of this.callbacks){this.callbacks.delete(id);fn(0,{mediaTime:this.duplicate?0:t-.02});}},2);},1);}
  requestVideoFrameCallback(fn){const id=++this.next;this.callbacks.set(id,fn);return id;}
  cancelVideoFrameCallback(id){this.callbacks.delete(id);}
}
test('capture waits for presented pixels and sends source frame times to inference',async()=>{
  const video=new PresentedVideo(),seen=[];
  const result=await scanHandstandFrames({video,times:[.05,.15,.25],capture:ms=>{seen.push(ms);assert.equal(video.callbacks.size,0);return ms;}});
  assert.deepEqual(seen,result.timestamps.map(t=>t.actual*1000));
  assert.deepEqual(result.timestamps.map(t=>t.clock),Array(3).fill('presented-frame'));
});
test('presentation timeout, duplicate source frames and cancellation never capture a stale frame',async()=>{
  let captures=0;const capture=()=>captures++;
  const stalled=new PresentedVideo({stall:true});
  await assert.rejects(scanHandstandFrames({video:stalled,times:[.05],capture,timeoutMs:15}),{name:'TimeoutError'});
  assert.equal(captures,0);assert.equal(stalled.callbacks.size,0);
  await assert.rejects(scanHandstandFrames({video:new PresentedVideo({duplicate:true}),times:[.05,.15],capture}),{code:'video-decode'});
  const controller=new AbortController(),video=new PresentedVideo({stall:true});
  const pending=scanHandstandFrames({video,times:[.05],capture,signal:controller.signal});
  controller.abort(new DOMException('cancel','AbortError'));await assert.rejects(pending,{name:'AbortError'});assert.equal(video.callbacks.size,0);
});
