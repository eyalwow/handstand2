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
      worker.postMessage({id,type,...payload},transfer);
    });
  }
  settle(message){
    const item=this.pending.get(message?.id);if(!item)return;
    this.pending.delete(message.id);
    if(message.type==="error")item.reject(new Error(message.message||"ניתוח התנוחה נכשל."));else item.resolve(message);
  }
  failAll(error){
    for(const item of this.pending.values())item.reject(error);
    this.pending.clear();this.terminate();
  }
  init(signal){
    if(!this.ready)this.ready=this.request("init",this.initOptions,signal,45000).catch(error=>{this.ready=null;throw error});
    return this.ready;
  }
  async detect(bitmap,signal){
    await this.init(signal);
    if(signal?.aborted){bitmap?.close?.();this.terminate();throw abortError(signal.reason)}
    this.timestamp+=100;
    return this.request("detect",{bitmap,timestamp:this.timestamp},signal,this.requestTimeoutMs,[bitmap]);
  }
  terminate(){
    const worker=this.worker;this.worker=null;this.ready=null;
    if(worker)worker.terminate();
    for(const item of this.pending.values())item.reject(abortError());
    this.pending.clear();
  }
}

export const analysisTimeoutMs = durationSeconds => Math.min(180000,Math.max(60000,Math.ceil(durationSeconds*3000)));
