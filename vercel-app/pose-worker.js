let landmarker=null,delegate="none",vision=null;
async function createLandmarker(options={}){
  if(typeof OffscreenCanvas!=="function"){
    const error=new Error("This browser does not provide a Worker canvas.");
    error.code="worker-canvas-unavailable";throw error;
  }
  const visionModuleUrl=options.visionModuleUrl||"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
  const wasmRoot=options.wasmRoot||"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
  const modelAssetPath=options.modelAssetPath||"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
  if(!vision){
    vision=await import(visionModuleUrl);
    if(typeof vision.FilesetResolver!=="function"||typeof vision.PoseLandmarker!=="function")throw new Error("MediaPipe worker module did not expose the required APIs.");
  }
  const {FilesetResolver,PoseLandmarker}=vision;
  const files=await FilesetResolver.forVisionTasks(wasmRoot);
  const create=d=>PoseLandmarker.createFromOptions(files,{canvas:new OffscreenCanvas(1,1),baseOptions:{modelAssetPath,delegate:d},runningMode:"VIDEO",numPoses:1});
  if(options.preferredDelegate==="CPU"){landmarker=await create("CPU");delegate="CPU";return}
  try{landmarker=await create("GPU");delegate="GPU"}catch{landmarker=await create("CPU");delegate="CPU"}
}

self.onmessage=async event=>{
  const {id,type}=event.data||{};
  try{
    if(type==="init"){
      if(!landmarker)await createLandmarker(event.data);
      self.postMessage({id,type:"ready",delegate});return;
    }
    if(type==="detect"){
      if(!landmarker)throw new Error("MediaPipe worker was not initialized.");
      const {bitmap,timestamp}=event.data,started=performance.now();
      try{
        const result=landmarker.detectForVideo(bitmap,timestamp),points=result.landmarks?.[0]||null;
        self.postMessage({id,type:"result",inferenceMs:performance.now()-started,landmarks:points?points.map(p=>({x:p.x,y:p.y,v:p.visibility??0})):null});
      }finally{bitmap?.close?.()}
    }
  }catch(error){
    event.data?.bitmap?.close?.();
    self.postMessage({id,type:"error",code:error?.code,message:String(error?.message||error||"Pose analysis failed")});
  }
};
