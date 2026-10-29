import test from "node:test";
import assert from "node:assert/strict";
import {loadVideo,seekVideoFrame,scanVideoFrames,sampleTimes} from "../vercel-app/video-sampling.js";
import {PoseRuntime,PoseWorkerRuntime} from "../vercel-app/pose-runtime.js";

class Video extends EventTarget{
 constructor({stall=false}={}){super();this.readyState=2;this.seeking=false;this.time=0;this.stall=stall;this.seeks=[]}
 pause(){}
 get currentTime(){return this.time}
 set currentTime(value){this.seeking=true;this.seeks.push(value);if(!this.stall)setTimeout(()=>{this.time=value;this.seeking=false;this.dispatchEvent(new Event("seeked"))},1)}
}
test("same duration yields a fixed exhaustive chronological schedule despite inference delays",async()=>{
 const times=sampleTimes(2.5),runs=[];
 assert.equal(times.length,24);assert.deepEqual(times.slice(0,3),[.05,.15,.25]);
 for(const delay of [0,2,5]){
  const video=new Video(),detected=[],progress=[];
  const result=await scanVideoFrames({video,times,capture:async timestamp=>{await new Promise(r=>setTimeout(r,delay));detected.push(timestamp);return video.currentTime},onProgress:n=>progress.push(n)});
  assert.deepEqual(video.seeks,times);assert.deepEqual(detected,times.map(t=>Math.round(t*1000)));assert.equal(progress.at(-1),1);runs.push(result);
 }
 assert.deepEqual(runs[0],runs[1]);assert.deepEqual(runs[1],runs[2]);
 for(const duration of [NaN,Infinity,0,121])assert.deepEqual(sampleTimes(duration),[]);
});
test("cancel during seek stops without inference or a stale capture; retry starts clean",async()=>{
 const video=new Video({stall:true}),controller=new AbortController();let captures=0;
 const pending=scanVideoFrames({video,times:[.05,.15],signal:controller.signal,capture:()=>captures++});
 controller.abort(new DOMException("cancel","AbortError"));await assert.rejects(pending,{name:"AbortError"});assert.equal(captures,0);
 const retry=await scanVideoFrames({video:new Video(),times:[.05],capture:()=>42});assert.deepEqual(retry.frames,[42]);
});
test("a seek timeout rejects instead of treating an old frame as the requested one",async()=>{
 const video=new Video({stall:true});
 await assert.rejects(seekVideoFrame(video,.05,undefined,5),{name:"TimeoutError"});
 assert.equal(video.currentTime,0);
});
test("completed WebKit seeks can expose a media clock different from the target",async()=>{
 const video=new Video({stall:true});const pending=seekVideoFrame(video,.05,undefined,100);
 video.time=.0095578;video.seeking=false;video.dispatchEvent(new Event("seeked"));
 assert.equal(await pending,.0095578);
});
test("decode errors propagate and metadata listeners register before load starts",async()=>{
 const video=new Video();video.readyState=0;video.videoWidth=0;video.videoHeight=0;
 video.load=()=>video.dispatchEvent(new Event("error"));
 await assert.rejects(loadVideo(video,"blob:invalid"),{code:"video-decode"});
 video.load=()=>{video.readyState=2;video.videoWidth=360;video.videoHeight=640;video.duration=3;video.dispatchEvent(new Event("loadedmetadata"))};
 await loadVideo(video,"blob:valid");assert.equal(video.src,"blob:valid");
});
test("Worker setup errors retain a machine-readable capability cause",async()=>{
 const worker={postMessage(message){queueMicrotask(()=>this.onmessage({data:{id:message.id,type:"error",code:"worker-canvas-unavailable",message:"no canvas"}}))},terminate(){}};
 const runtime=new PoseWorkerRuntime({workerFactory:()=>worker});
 await assert.rejects(runtime.init(),{code:"worker-canvas-unavailable"});runtime.terminate();
});
test("network failures never silently fall back or change analysis backend",async()=>{
 const worker={postMessage(message){queueMicrotask(()=>this.onmessage({data:{id:message.id,type:"error",message:"Network blocked"}}))},terminate(){this.stopped=true}};
 const runtime=new PoseRuntime({workerFactory:()=>worker});await assert.rejects(runtime.init(),/Network blocked/);runtime.terminate();assert.equal(worker.stopped,true);
});
test("postMessage failure rejects immediately and terminates the failed worker",async()=>{
 const worker={postMessage(){throw new DOMException("invalid transfer","DataCloneError")},terminate(){this.stopped=true}};
 const runtime=new PoseWorkerRuntime({workerFactory:()=>worker});await assert.rejects(runtime.init(),{name:"DataCloneError"});assert.equal(worker.stopped,true);
});
