import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFrontLever,FRONT_LEVER_VARIANTS} from '../vercel-app/front-lever-analysis.js';
import {ANALYSIS_CATALOG,exerciseById} from '../vercel-app/analysis-catalog.js';
import {analysisFor} from '../vercel-app/analysis-registry.js';
import {readVariationHistory,saveVariationObservation,VARIATION_HISTORY_KEY} from '../vercel-app/variation-history.js';
import {longestObservedRun,visiblePoint} from '../vercel-app/analysis-pipeline.js';
function pose(variant='full'){
 const f=Array.from({length:33},()=>({x:0,y:0,v:0}));
 for(const [offset,dx] of [[0,0],[1,2]]){
  const leg=variant==='tuck'||variant==='advanced-tuck'?[[290,330],[300,365]]:[[430,300],[510,300]];
  [[11,200,300],[13,200,200],[15,200,100],[23,350,300],[25,...leg[0]],[27,...leg[1]]].forEach(([i,x,y])=>{f[i+offset]={x:x+dx,y,v:.95};});
 }
 return f;
}
const input=(variant='full')=>({exerciseId:'front-lever-'+variant,sideViewConfirmed:true,width:640,height:480,
 frames:Array.from({length:35},()=>pose(variant)),timestamps:Array.from({length:35},(_,i)=>.05+i*.1)});
test('all five explicitly chosen variations yield only provisional 2D observations, never a grade or validation',()=>{
 for(const variant of FRONT_LEVER_VARIANTS){
  const data=input(variant),before=JSON.stringify(data),r=analyzeFrontLever(data);
  assert.equal(r.status,'observed',variant);assert.equal(r.validated,false);assert.equal(r.score,null);assert.equal(r.variantVerified,false);
  assert.ok(r.hold.seconds>=3);assert.equal(r.metrics.trunkTiltDegrees,0);assert.equal(r.metrics.elbowDegrees,180);
  assert.ok(r.metrics.kneeDegrees>0);assert.equal(JSON.stringify(data),before);
 }
});
test('no pose, unrelated upright video, poor camera view and missing overhead arm evidence are rejected',()=>{
 for(const mutate of [
  d=>{d.frames.fill(null);},
  d=>{d.frames.forEach(f=>{f[23].y=f[24].y=440;});},
  d=>{d.sideViewConfirmed=false;},
  d=>{d.frames.forEach(f=>{f[12].x=400;});},
  d=>{d.frames.forEach(f=>{f[15].y=f[16].y=310;});},
 ]){const d=input();mutate(d);const r=analyzeFrontLever(d);assert.equal(r.status,'insufficient');assert.equal(r.metrics,null);assert.equal(r.score,null);}
});
test('occluded core joints, weak tracking, out-of-frame and degenerate poses never manufacture a hold',()=>{
 for(const mutate of [
  f=>{f[23].v=f[24].v=.1;}, f=>{f.forEach(p=>p.v=.3);},
  f=>{f[15].x=f[16].x=-10;},f=>{f[23]={...f[11]};f[24]={...f[12]};}
 ]){const d=input();d.frames.forEach(mutate);assert.equal(analyzeFrontLever(d).status,'insufficient');}
});
test('hidden knees stay unmeasured while visible trunk can be observed without inferring knee extension',()=>{
 const d=input();d.frames.forEach(f=>{f[25].v=f[26].v=0;});
 const r=analyzeFrontLever(d);assert.equal(r.status,'observed');assert.equal(r.metrics.kneeDegrees,null);assert.equal(r.metrics.hipDegrees,null);
});
test('short, moving, gapped, duplicated and nonmonotonic timing cannot be called a hold',()=>{
 for(const mutate of [
  d=>{d.frames=d.frames.slice(0,10);d.timestamps=d.timestamps.slice(0,10);},
  d=>{d.frames.forEach((f,i)=>f.forEach(p=>p.x+=i*9));},
  d=>{d.timestamps=d.timestamps.map(t=>t*3);},
  d=>{d.timestamps[17]=d.timestamps[16];},d=>{d.timestamps[17]=0;},
  d=>{d.frames=d.frames.map((f,i)=>i%8===0?null:f);}
 ]){const d=input();mutate(d);assert.equal(analyzeFrontLever(d).status,'insufficient');}
});
test('family IDs, unknown variations and future exercises never dispatch a fallback Handstand analysis',()=>{
 for(const id of ['front-lever','front-lever-unknown','planche-full','l-sit-full','__proto__']){
  assert.equal(analysisFor(id,{allowExperimental:true}),null);
  assert.equal(analyzeFrontLever({...input(),exerciseId:id}).status,'insufficient');
 }
 for(const variant of FRONT_LEVER_VARIANTS){
  const id='front-lever-'+variant,item=exerciseById(id);
  assert.equal(item.status,'coming-soon');assert.equal(item.validation,'unvalidated');assert.equal(analysisFor(id),null);
  assert.ok(analysisFor(id,{allowExperimental:true}));assert.equal(item.historyId,id);assert.ok(item.filming&&item.difficulty);
 }
 assert.equal(ANALYSIS_CATALOG.filter(x=>x.status==='available').length,1);
});
function memory(initial={}){const data=new Map(Object.entries(initial));return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),data};}
test('variation history stays separate across reload and preserves legacy scores, corrupt storage and failed writes',()=>{
 const storage=memory({'handstand-lab-analyses-v1':'legacy'});
 saveVariationObservation(storage,analyzeFrontLever(input('full')),'2026-10-31T12:00:00Z');
 saveVariationObservation(storage,analyzeFrontLever(input('tuck')),'2026-10-31T13:00:00Z');
 assert.equal(readVariationHistory(storage,'front-lever-full').length,1);assert.equal(readVariationHistory(storage,'front-lever-tuck').length,1);
 assert.equal(storage.getItem('handstand-lab-analyses-v1'),'legacy');assert.equal(readVariationHistory(storage)[0].exerciseId,'front-lever-tuck');
 for(const raw of ['broken','{}','[{}]']){const bad=memory({[VARIATION_HISTORY_KEY]:raw});assert.throws(()=>saveVariationObservation(bad,analyzeFrontLever(input())));assert.equal(bad.getItem(VARIATION_HISTORY_KEY),raw);}
 assert.throws(()=>saveVariationObservation({getItem:()=>null,setItem:()=>{throw Error('quota');}},analyzeFrontLever(input())));
 assert.throws(()=>saveVariationObservation(storage,analyzeFrontLever({...input(),frames:input().frames.map(()=>null)})));
});
test('shared gates reject invalid coordinates and never bridge missing pose samples',()=>{
 assert.equal(visiblePoint({x:NaN,y:0,v:1},640,480),false);
 assert.deepEqual(longestObservedRun([true,null,true],[0,.1,.2]),[]);
});
