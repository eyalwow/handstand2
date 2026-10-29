// Compatibility path for WebKit builds without OffscreenCanvas in Workers.
// No video is uploaded. Each run owns and closes its model and canvas.
const aborted=signal=>{if(signal?.aborted)throw signal.reason||new DOMException("הניתוח בוטל.","AbortError")};
export class PoseMainRuntime {
  constructor(options={}){this.options=options;this.model=null;this.stopped=false;this.timestamp=0}
  async init(signal){
    aborted(signal);
    const options=this.options;
    const {FilesetResolver,PoseLandmarker}=await import(options.visionModuleUrl||"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs");
    aborted(signal);if(this.stopped)throw new DOMException("Stopped","AbortError");
    const files=await FilesetResolver.forVisionTasks(options.wasmRoot||"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
    aborted(signal);if(this.stopped)throw new DOMException("Stopped","AbortError");
    const model=await PoseLandmarker.createFromOptions(files,{canvas:document.createElement("canvas"),baseOptions:{modelAssetPath:options.modelAssetPath||"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",delegate:"CPU"},runningMode:"VIDEO",numPoses:1});
    if(this.stopped||signal?.aborted){model.close();aborted(signal);throw new DOMException("Stopped","AbortError")}
    this.model=model;return {delegate:"CPU",execution:"main-thread-compatibility"};
  }
  async detect(bitmap,signal,timestamp){
    try{
      // Give cancel, progress and paint a turn between synchronous inferences.
      await new Promise(resolve=>setTimeout(resolve,0));aborted(signal);
      if(this.stopped||!this.model)throw new DOMException("Stopped","AbortError");
      this.timestamp=timestamp??this.timestamp+100;
      const start=performance.now(),result=this.model.detectForVideo(bitmap,this.timestamp);
      if(performance.now()-start>(this.options.requestTimeoutMs??15000))throw new DOMException("עיבוד התנועה לא השיב בזמן.","TimeoutError");
      const points=result.landmarks?.[0]||null;
      return {inferenceMs:performance.now()-start,landmarks:points?points.map(p=>({x:p.x,y:p.y,v:p.visibility??0})):null};
    }finally{bitmap?.close?.()}
  }
  terminate(){this.stopped=true;this.model?.close();this.model=null}
}
