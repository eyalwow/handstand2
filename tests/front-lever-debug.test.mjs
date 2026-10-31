import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFrontLever} from '../vercel-app/front-lever-analysis.js';
const input=()=>({exerciseId:'front-lever-full',sideViewConfirmed:true,width:640,height:480,
 timestamps:Array.from({length:35},(_,i)=>.05+i*.1),frames:Array.from({length:35},()=>{
 const f=Array.from({length:33},()=>({x:0,y:0,v:0}));
 for(const [offset,dx] of [[0,0],[1,2]])for(const [id,x,y] of [[11,200,300],[13,200,200],[15,200,100],[23,350,300],[25,430,300],[27,510,300]])f[id+offset]={x:x+dx,y,v:.95};
 return f;
 })});
function trace(d){const events=[];const before=structuredClone(d);const plain=analyzeFrontLever(d);const result=analyzeFrontLever(d,{onDebug:e=>events.push(e)});assert.deepEqual(result,plain);assert.deepEqual(d,before);assert.equal('debug' in result,false);return events;}
test('debug is opt-in and reports sample geometry, visibility and an unchanged positive result',()=>{
 const events=trace(input()),s=events.at(-1);assert.equal(events.length,36);assert.equal(s.coreSamples,35);assert.equal(s.stableSamples,34);assert.ok(Math.abs(s.maxCandidateSeconds-3.3)<1e-9);
 assert.equal(events[1].sides[0].elbow,180);assert.equal(events[1].sides[0].hip,180);assert.equal(events[1].sides[0].knee,180);assert.equal(events[1].sides[0].line,0);assert.equal(events[1].sides[0].joints[0].visibility,.95);
 assert.equal(events[1].candidateSamples,1);assert.equal(events[1].candidateSeconds,0);
});
test('diagnostics name quality, side view and geometric rejection without changing negative results',()=>{
 for(const [change,reason] of [
 [d=>d.frames.fill(null),'missing-pose'],
 [d=>d.frames.forEach(f=>{f[23].v=f[24].v=.2;}),'core-joint-quality'],
 [d=>d.frames.forEach(f=>{f[12].x=400;}),'side-view-separation'],
 [d=>d.frames.forEach(f=>{f[23].y=f[24].y=440;}),'trunk-tilt'],
 [d=>d.frames.forEach(f=>{f[15].y=f[16].y=310;}),'wrist-not-overhead'],
 ]){const d=input();change(d);const events=trace(d);assert.equal(events.at(-1).rejectionCounts[reason],35,reason);}
 const d=input();d.frames.forEach(f=>{f[25].v=0;});const e=trace(d);assert.equal(e[0].sides[0].knee,null);assert.deepEqual(e[0].sides[0].joints[4].issues,['low-visibility']);
});
test('debug preserves timing, motion, missing previous pose and too-short candidate boundaries',()=>{
 for(const [change,reason] of [
 [d=>{d.timestamps=d.timestamps.map(t=>t*3);},'timing-gap'],
 [d=>d.frames.forEach((f,i)=>f.forEach(p=>p.x+=i*9)),'motion'],
 [d=>{d.frames[4]=null;},'previous-core-missing']
 ]){const d=input();change(d);const e=trace(d);assert.ok(e.at(-1).rejectionCounts[reason]>0);}
 const d=input();d.frames=d.frames.slice(0,10);d.timestamps=d.timestamps.slice(0,10);const e=trace(d);assert.equal(e.at(-1).status,'insufficient');assert.ok(Math.abs(e.at(-1).maxCandidateSeconds-.8)<1e-9);
 const f=input();f.timestamps[3]=f.timestamps[2];assert.equal(trace(f).at(-1).reason,'invalid-timing');
 const g=input();g.sideViewConfirmed=false;assert.equal(trace(g).at(-1).reason,'camera-angle');
});
