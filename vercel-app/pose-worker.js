import {PoseLandmarker,FilesetResolver} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

let landmarker=null,delegate="none";
async function createLandmarker(){
  const files=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
  const modelAssetPath="https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
  const create=d=>PoseLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath,delegate:d},runningMode:"VIDEO",numPoses:1});
  try{landmarker=await create("GPU");delegate="GPU"}
  catch{landmarker=await create("CPU");delegate="CPU"}
}

self.onmessage=async event=>{
  const {id,type}=event.data||{};
  try{
    if(type==="init"){
      if(!landmarker)await createLandmarker();
      self.postMessage({id,type:"ready",delegate});return;
    }
    if(type==="detect"){
      if(!landmarker)await createLandmarker();
      const {bitmap,timestamp}=event.data,started=performance.now();
      try{
        const result=landmarker.detectForVideo(bitmap,timestamp),points=result.landmarks?.[0]||null;
        self.postMessage({id,type:"result",inferenceMs:performance.now()-started,landmarks:points?points.map(p=>({x:p.x,y:p.y,v:p.visibility??0})):null});
      }finally{bitmap?.close?.()}
    }
  }catch(error){
    event.data?.bitmap?.close?.();
    self.postMessage({id,type:"error",message:String(error?.message||error||"Pose analysis failed")});
  }
};
