const abortReason=signal=>signal?.reason||new DOMException("הניתוח בוטל.","AbortError");
export function sampleTimes(duration,fps=10){
  if(!Number.isFinite(duration)||duration<=.1||duration>120||!Number.isFinite(fps)||fps<=0)return [];
  return Array.from({length:Math.floor((duration-.1)*fps)},(_,i)=>(50+i*1000/fps)/1000);
}

function videoWait(video,{signal,timeoutMs=15000,events,ready,start}){
  if(signal?.aborted)return Promise.reject(abortReason(signal));
  return new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timer);for(const event of events)video.removeEventListener(event,check);video.removeEventListener("error",error);signal?.removeEventListener("abort",abort)};
    const finish=(problem)=>{cleanup();problem?reject(problem):resolve()};
    const check=event=>{if(ready(event))finish()};
    const error=()=>finish(Object.assign(new Error("הסרטון אינו ניתן לפענוח בדפדפן זה."),{code:"video-decode"}));
    const abort=()=>finish(abortReason(signal));
    const timer=setTimeout(()=>finish(new DOMException("פענוח פריים מהסרטון לא הושלם בזמן.","TimeoutError")),timeoutMs);
    for(const event of events)video.addEventListener(event,check);
    video.addEventListener("error",error);signal?.addEventListener("abort",abort,{once:true});
    try{start?.();check()}catch(problem){finish(problem)}
  });
}

export async function loadVideo(video,url,signal){
  video.pause();
  await videoWait(video,{signal,timeoutMs:20000,events:["loadedmetadata","loadeddata","canplay"],
    ready:()=>video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0,
    start:()=>{video.src=url;video.load()}});
  if(!Number.isFinite(video.duration)||video.duration<=0)throw Object.assign(new Error("לא ניתן לקרוא את משך הסרטון. נסו לייצא אותו מחדש."),{code:"video-decode"});
}

export async function seekVideoFrame(video,time,signal,timeoutMs=15000){
  const alreadyThere=Math.abs(video.currentTime-time)<.00001&&!video.seeking&&video.readyState>=2;
  if(alreadyThere){if(signal?.aborted)throw abortReason(signal);return video.currentTime}
  let seeked=false;
  await videoWait(video,{signal,timeoutMs,events:["seeked","loadeddata","canplay"],
    // WebKit's media clock can differ from the requested time after a completed
    // seek. The seeked event plus decoded data is the readiness boundary; an
    // exact floating-point currentTime comparison can wait forever on Safari.
    ready:event=>{if(event?.type==="seeked")seeked=true;return seeked&&!video.seeking&&video.readyState>=2},
    start:()=>{video.currentTime=time}});
  return video.currentTime;
}

export async function scanVideoFrames({video,times,capture,signal,onProgress=()=>{}}){
  video.pause();const frames=[],timestamps=[];
  // Chronological, exhaustive traversal: VIDEO tracking must never run a sparse
  // probe then rewind while reusing cached, differently warmed tracking state.
  for(let i=0;i<times.length;i++){
    if(signal?.aborted)throw abortReason(signal);
    const actual=await seekVideoFrame(video,times[i],signal);
    frames.push(await capture(Math.round(times[i]*1000)));
    timestamps.push({requested:times[i],actual});onProgress((i+1)/times.length);
  }
  return {frames,timestamps};
}
