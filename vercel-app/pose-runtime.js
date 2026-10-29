const abortError = reason => reason instanceof Error ? reason : new DOMException("הניתוח בוטל.","AbortError");

export class PoseWorkerRuntime {
  constructor({workerFactory,workerUrl=new URL("./pose-worker.js",import.meta.url),requestTimeoutMs=15000,initOptions={}}={}){
    this.workerFactory=workerFactory||(()=>new Worker(workerUrl));
    this.requestTimeoutMs=requestTimeoutMs;
    this.initOptions=initOptions;
    this.worker=null;this.pending=new Map();this.nextId=1;this.timestamp=0;this.ready=null;
  }
  ensureWorker(){
    if(this.worker)return this.worker;
    const worker=this.workerFactory();this.worker=worker;
    worker.onmessage=event=>this.settle(event.data);
    worker.onerror=event=>this.failAll(new Error(event?.message||"רכיב ניתוח התנועה נעצר."));
    worker.onmessageerror=()=>this.failAll(new Error("רכיב ניתוח התנועה החזיר מידע לא תקין."));
    return worker;
  }
  request(type,payload={},signal,timeoutMs=this.requestTimeoutMs,transfer=[]){
    if(signal?.aborted)return Promise.reject(abortError(signal.reason));
    const worker=this.ensureWorker(),id=this.nextId++;
    return new Promise((resolve,reject)=>{
      const finish=()=>{clearTimeout(timer);signal?.removeEventListener("abort",onAbort)};
      const onAbort=()=>{finish();this.pending.delete(id);this.terminate();reject(abortError(signal.reason))};
      const timer=setTimeout(()=>{finish();this.pending.delete(id);this.terminate();reject(new DOMException("עיבוד התנועה לא השיב בזמן.","TimeoutError"))},timeoutMs);
      this.pending.set(id,{resolve:value=>{finish();resolve(value)},reject:error=>{finish();reject(error)}});
      signal?.addEventListener("abort",onAbort,{once:true});
      try{worker.postMessage({id,type,...payload},transfer)}catch(error){this.failAll(error)}
    });
  }
  settle(message){
    const item=this.pending.get(message?.id);if(!item)return;
    this.pending.delete(message.id);
    if(message.type==="error")item.reject(Object.assign(new Error(message.message||"ניתוח התנוחה נכשל."),{code:message.code}));else item.resolve(message);
  }
  failAll(error){
    for(const item of this.pending.values())item.reject(error);
    this.pending.clear();this.terminate();
  }
  init(signal){
    if(!this.ready)this.ready=this.request("init",this.initOptions,signal,45000).catch(error=>{this.ready=null;throw error});
    return this.ready;
  }
  async detect(bitmap,signal,timestamp){
    try{await this.init(signal)}catch(error){bitmap?.close?.();throw error}
    if(signal?.aborted){bitmap?.close?.();this.terminate();throw abortError(signal.reason)}
    this.timestamp=timestamp??this.timestamp+100;
    return this.request("detect",{bitmap,timestamp:this.timestamp},signal,this.requestTimeoutMs,[bitmap]);
  }
  terminate(){
    const worker=this.worker;this.worker=null;this.ready=null;
    if(worker)worker.terminate();
    for(const item of this.pending.values())item.reject(abortError());
    this.pending.clear();
  }
}

// Feature-based fallback, never a user-agent guess or a retry for network failures.
export class PoseRuntime {
  constructor(options={}){this.options=options;this.runtime=new PoseWorkerRuntime(options);this.stopped=false}
  async init(signal){
    try{return {...await this.runtime.init(signal),execution:"worker"}}
    catch(error){
      if(error.code!=="worker-canvas-unavailable"||this.stopped||signal?.aborted)throw error;
      this.runtime.terminate();
      const {PoseMainRuntime}=await import("./pose-main.js");
      if(this.stopped||signal?.aborted)throw abortError(signal?.reason);
      this.runtime=new PoseMainRuntime({...this.options.initOptions,requestTimeoutMs:this.options.requestTimeoutMs});
      return new Promise((resolve,reject)=>{
        const finish=(error,value)=>{clearTimeout(timer);signal?.removeEventListener("abort",onAbort);if(error){this.runtime.terminate();reject(error)}else resolve(value)};
        const onAbort=()=>finish(abortError(signal.reason));
        const timer=setTimeout(()=>finish(new DOMException("טעינת המודל לא הושלמה בזמן.","TimeoutError")),45000);
        signal?.addEventListener("abort",onAbort,{once:true});
        this.runtime.init(signal).then(value=>finish(null,value),finish);
      });
    }
  }
  detect(bitmap,signal,timestamp){return this.runtime.detect(bitmap,signal,timestamp)}
  terminate(){this.stopped=true;this.runtime.terminate()}
}

// Exhaustive seeking trades throughput for repeatable frames. Allow six times
// source duration, bounded to eight minutes, independently of scoring gates.
export const analysisTimeoutMs = durationSeconds => Math.min(480000,Math.max(90000,Math.ceil(durationSeconds*6000)));
