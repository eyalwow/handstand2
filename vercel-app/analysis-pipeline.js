// Shared local acquisition boundary. Exercise adapters receive pixel-space poses
// and decoded source timestamps; they never create their own model or clock.
// Keep the established Handstand eligibility/scoring policy in its legacy adapter.
export { PoseRuntime, analysisTimeoutMs } from './pose-runtime.js';
export { sampleTimes, loadVideo, seekVideoFrame, scanVideoFrames } from './video-sampling.js';

export function visiblePoint(point, width, height, minimum = .65) {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y) &&
    Number.isFinite(point.v) && point.v >= minimum &&
    point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height;
}
export function angle(a, b, c) {
  const ux=a.x-b.x, uy=a.y-b.y, vx=c.x-b.x, vy=c.y-b.y;
  const length=Math.hypot(ux,uy)*Math.hypot(vx,vy);
  return length > 1e-6 ? Math.acos(Math.max(-1,Math.min(1,(ux*vx+uy*vy)/length)))*180/Math.PI : null;
}
export const median = values => {
  const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b), n=sorted.length;
  return n ? (sorted[(n-1)>>1]+sorted[n>>1])/2 : null;
};
// No gap bridging: a missing joint, duplicated timestamp or tracking gap ends a run.
export function longestObservedRun(samples, times, {maximumGap=.16, minimumSeconds=1.5, minimumSamples=15}={}) {
  let current=[], best=[];
  const flush=()=>{if(current.length>=minimumSamples && times[current.at(-1)]-times[current[0]]>=minimumSeconds &&
    (!best.length || times[current.at(-1)]-times[current[0]]>times[best.at(-1)]-times[best[0]]))best=current;current=[];};
  samples.forEach((sample,i)=>{
    if(!sample || !Number.isFinite(times[i])){flush();return;}
    if(current.length && (times[i]<=times[current.at(-1)] || times[i]-times[current.at(-1)]>maximumGap))flush();
    current.push(i);
  });
  flush();return best;
}
