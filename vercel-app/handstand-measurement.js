import {analyzeHandstandTimeline, extractTemporalSamples, median} from './handstand-temporal.js';

export const HANDSTAND_MEASUREMENT_VERSION = 'handstand-v4-observed';
// Keep the established technical bands. Duration never contributes points.
const BANDS = {banana:[.045,.18], lean:[4.5,22.5], shoulder:[12,52.5], elbow:[12,45], sway:[.015,.075]};
const WEIGHTS = {banana:.3, lean:.2, shoulder:.2, elbow:.15, sway:.15};
const band = (x,[good,bad]) => Math.max(0,Math.min(100,100*(bad-x)/(bad-good)));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const segments = [['shoulder','hip'],['hip','ankle'],['shoulder','elbow'],['elbow','wrist']];

export function measureHandstand({frames,timestamps,width,height}={}) {
  const timeline = analyzeHandstandTimeline({frames,timestamps,width,height});
  const diagnostics = {version:HANDSTAND_MEASUREMENT_VERSION, reason:'no-established-hold'};
  if (!timeline.hold) return {hold:null,timeline,diagnostics};
  // The exact same selected side and interval drive timing and technique.
  const samples = extractTemporalSamples(frames,timestamps,{width,height});
  const {startFrame,endFrame} = timeline.hold;
  const run = samples.slice(startFrame,endFrame+1);
  const lengths = segments.map(([a,b]) => median(run.map(s => distance(s.p[a],s.p[b]))));
  const rows = run.filter(s => segments.every(([a,b],i) => {
    const length=distance(s.p[a],s.p[b]);
    // Collapsed projected segments cannot support angles; detector jumps must
    // not become a bent-arm penalty. No interpolated/smoothed pose is graded.
    return length >= s.scale*.025 && length >= lengths[i]*.65 && length <= lengths[i]*1.35;
  }));
  Object.assign(diagnostics,{startFrame,endFrame,samples:run.length,validFrames:rows.length});
  if (timeline.hold.seconds<1.5 || rows.length<10 || rows.length/run.length<.8) {
    diagnostics.reason=timeline.hold.seconds<1.5?'hold-too-short':'insufficient-geometry';
    return {hold:null,timeline,diagnostics};
  }
  const left=frames[startFrame].indexOf(run[0].p.shoulder)===11;
  const ear=left?7:8;
  const facing=median(rows.map(s=>frames[s.i]).filter(f=>f[0]?.v>=.65&&f[ear]?.v>=.65).map(f=>f[0].x-f[ear].x))>=0?1:-1;
  const metrics = rows.map(s => {
    const {shoulder,hip,ankle,wrist}=s.p, dx=ankle.x-shoulder.x,dy=ankle.y-shoulder.y;
    const body=distance(ankle,shoulder);
    // Perpendicular distance to the shoulder–ankle axis / axis length. The
    // previous horizontal intercept adds a tilt-dependent 1/cos(tilt) penalty.
    const banana=-facing*((hip.x-shoulder.x)*dy-(hip.y-shoulder.y)*dx)/(body*body);
    return {banana,lean:Math.abs(s.tilt),shoulder:180-s.shoulder,elbow:180-s.elbow,hipx:s.hipOffset/body};
  });
  if (metrics.some(m=>Object.values(m).some(x=>!Number.isFinite(x)))) {
    diagnostics.reason='invalid-geometry';
    return {hold:null,timeline,diagnostics};
  }
  const center=median(metrics.map(m=>m.hipx));
  const val=Object.fromEntries(['banana','lean','shoulder','elbow'].map(n=>[n,median(metrics.map(m=>m[n]))]));
  val.sway=1.4826*median(metrics.map(m=>Math.abs(m.hipx-center)));
  const sc=Object.fromEntries(Object.keys(BANDS).map(n=>[n,band(n==='banana'?median(metrics.map(m=>Math.abs(m.banana))):val[n],BANDS[n])]));
  const total=Math.max(1,Object.keys(sc).reduce((sum,n)=>sum+sc[n]*WEIGHTS[n],0));
  const k=Object.fromEntries(Object.entries(run[0].p).map(([name,p])=>[name,frames[startFrame].indexOf(p)]));
  k.ear=ear;
  // Preserve the existing consumer contract; third summaries use measured rows.
  const thirds=[0,1,2].map(j=>{
    const subset=metrics.slice(Math.floor(j*metrics.length/3),Math.floor((j+1)*metrics.length/3));
    const m=n=>median(subset.map(x=>x[n]));
    return {phase:['start','middle','end'][j],pelvisOffsetPercent:Math.abs(m('banana'))*100,leanDegrees:m('lean'),shoulderDeficitDegrees:m('shoulder'),elbowDeficitDegrees:m('elbow')};
  });
  Object.assign(diagnostics,{reason:'measured',visibilityPercent:100*median(rows.map(s=>Math.min(...Object.values(s.p).map(p=>p.v)))),relaxed:false,legsApart:false,thirds});
  const hold={val,sc,total,swayOk:true,k,series:frames.map(()=>null),fps:10,
    hold:timeline.hold.seconds,mid:rows[Math.floor(rows.length/2)].i,diagnostics};
  return {hold,timeline,diagnostics};
}
