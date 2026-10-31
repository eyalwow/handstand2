import {seekVideoFrame} from './video-sampling.js';

// Handstand-only acquisition: a completed seek updates the media clock before
// some decoders present pixels. Wait for the presented frame, and use its source
// timestamp for both VIDEO inference and measurement. Never use wall-clock time.
export async function scanHandstandFrames({video,times,capture,signal,onProgress=()=>{},timeoutMs=15000}) {
  video.pause();
  const frames=[],timestamps=[];
  const presented=typeof video.requestVideoFrameCallback==='function';
  const oldStyle=video.getAttribute?.('style');
  // The app's video is display:none. A tiny compositor surface permits paused
  // frame callbacks without adding another player or decoding the video twice.
  if(presented&&video.style)Object.assign(video.style,{display:'block',position:'fixed',width:'1px',height:'1px',opacity:'.01',pointerEvents:'none',bottom:'0',left:'0'});
  try {
    for(let i=0;i<times.length;i++) {
      if(signal?.aborted)throw signal.reason;
      let actual;
      if(presented) {
        let callback,timer,onAbort;
        const frame=new Promise((resolve,reject)=>{
          onAbort=()=>reject(signal.reason);
          signal?.addEventListener('abort',onAbort,{once:true});
          timer=setTimeout(()=>reject(new DOMException('Video frame was not presented in time.','TimeoutError')),timeoutMs);
          callback=video.requestVideoFrameCallback((_now,metadata)=>resolve(metadata.mediaTime));
        });
        try {
          const result=await Promise.all([seekVideoFrame(video,times[i],signal,timeoutMs),frame]);
          actual=result[1];
        } finally {
          clearTimeout(timer);signal?.removeEventListener('abort',onAbort);
          video.cancelVideoFrameCallback(callback);
        }
      } else actual=await seekVideoFrame(video,times[i],signal,timeoutMs);
      if(!Number.isFinite(actual)||actual<0||(i&&actual<=timestamps.at(-1).actual))
        throw Object.assign(new Error('Video source frames did not advance.'),{code:'video-decode'});
      frames.push(await capture(actual*1000));
      timestamps.push({requested:times[i],actual,clock:presented?'presented-frame':'seek-clock'});
      onProgress((i+1)/times.length);
    }
    return {frames,timestamps};
  } finally {
    if(presented&&video.setAttribute) {
      if(oldStyle===null)video.removeAttribute('style');else video.setAttribute('style',oldStyle);
    }
  }
}
