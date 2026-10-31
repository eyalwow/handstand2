// Offline research only. No upload, score fitting, model calls or timing changes.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute,basename,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';
import {createHash} from 'node:crypto';
import {measureHandstand} from '../vercel-app/handstand-measurement.js';
import {extractTemporalSamples,median} from '../vercel-app/handstand-temporal.js';
import {HANDSTAND_SCORE_POLICY,projectedMetricScore,separateScoreDimensions} from '../vercel-app/handstand-score-policy.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const angle=(a,b,c)=>{
  const u=a.map((x,i)=>x-b[i]),v=c.map((x,i)=>x-b[i]);
  const norm=Math.hypot(...u)*Math.hypot(...v);
  return norm>0?Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/norm)))*180/Math.PI:null;
};

export function cameraProjectionExperiment() {
  const results=[];
  for(const bend of [0,20,40]) {
    const source=[[0,0,0],[-.5*Math.tan(bend*Math.PI/360),.5,0],[0,1,0]];
    for(const yaw of [0,45,75])for(const pitch of [0,30,60]) {
      const yr=yaw*Math.PI/180,pr=pitch*Math.PI/180;
      const projected=source.map(([x,y,z])=>{
        const u=x*Math.cos(yr)+z*Math.sin(yr),d=-x*Math.sin(yr)+z*Math.cos(yr);
        const v=y*Math.cos(pr)-d*Math.sin(pr),depth=3+y*Math.sin(pr)+d*Math.cos(pr);
        return [u/depth,v/depth];
      });
      const [s,h,a]=projected,dx=a[0]-s[0],dy=a[1]-s[1],lengthSquared=dx*dx+dy*dy;
      const offset=Math.abs((h[0]-s[0])*dy-(h[1]-s[1])*dx)/lengthSquared;
      results.push({kind:'analytic-pinhole-projection-not-video-inference',trueHipDeficitDegrees:180-angle(...source),
        yawDegrees:yaw,pitchDegrees:pitch,projectedHipDeficitDegrees:180-angle(...projected),
        projectedOffset:offset,lineIndex:projectedMetricScore('banana',offset)});
    }
  }
  return results;
}

function summarizeRows(rows) {
  const measured=rows.map(p=>{
    const s=p.shoulder,h=p.hip,a=p.ankle,w=p.wrist,e=p.elbow,dx=a.x-s.x,dy=a.y-s.y,body=Math.hypot(dx,dy);
    if(body<1e-9 || [[h,s],[s,e],[e,w]].some(([u,v])=>Math.hypot(u.x-v.x,u.y-v.y)<1e-9))return null;
    return {banana:Math.abs((h.x-s.x)*dy-(h.y-s.y)*dx)/(body*body),
      lean:Math.atan2(Math.abs(a.x-w.x),Math.abs(a.y-w.y))*180/Math.PI,
      shoulder:180-angle([h.x,h.y],[s.x,s.y],[e.x,e.y]),
      elbow:180-angle([s.x,s.y],[e.x,e.y],[w.x,w.y]),hipx:(h.x-w.x)/body};
  });
  if(measured.some(m=>!m||Object.values(m).some(v=>!Number.isFinite(v))))return null;
  const center=median(measured.map(x=>x.hipx));
  const values=Object.fromEntries(['banana','lean','shoulder','elbow'].map(k=>[k,median(measured.map(x=>x[k]))]));
  values.sway=1.4826*median(measured.map(x=>Math.abs(x.hipx-center)));
  return Object.fromEntries(Object.keys(values).map(k=>[k,projectedMetricScore(k,values[k])]));
}

function pixelStress(rows,durationSeconds,radius) {
  const names=['shoulder','elbow','wrist','hip','ankle'];
  const corners=[[-1,-1],[-1,1],[1,-1],[1,1]];
  const combined=[],technique=[],components=Object.fromEntries(Object.keys(HANDSTAND_SCORE_POLICY.bands).map(k=>[k,[]]));
  // 4^5 systematic joint-offset patterns, held constant through the interval.
  // Corner scenarios are not an exhaustive bound over continuous coordinates.
  for(let pattern=0;pattern<1024;pattern++) {
    let bits=pattern;
    const deltas=names.map(()=>{const d=corners[bits%4];bits=Math.floor(bits/4);return d;});
    const displaced=rows.map(p=>Object.fromEntries(names.map((n,i)=>[n,{x:p[n].x+radius*deltas[i][0],y:p[n].y+radius*deltas[i][1]}])));
    const scores=summarizeRows(displaced),dimensions=separateScoreDimensions(scores,durationSeconds);
    if(!dimensions)continue;
    combined.push(dimensions.combinedIndex);technique.push(dimensions.techniqueOnlyIndex);
    for(const k in scores)components[k].push(scores[k]);
  }
  const range=a=>a.length?{min:Math.min(...a),max:Math.max(...a)}:null;
  return {kind:'fixed-window-systematic-coordinate-stress',perAxisPixelOffset:radius,maxJointDistancePixels:Math.SQRT2*radius,scenarios:combined.length,invalidScenarios:1024-combined.length,
    interpretation:'scenario envelope; not a confidence interval, accuracy estimate or camera correction',
    combinedIndex:range(combined),techniqueOnlyIndex:range(technique),components:Object.fromEntries(Object.entries(components).map(([k,a])=>[k,range(a)]))};
}

function modelWorldComparison(trace,interval,side) {
  if(!trace.worldPoses?.some(Boolean)||!interval||!side)return null;
  const rows=[];
  const indices=['shoulder','elbow','wrist','hip','ankle'].map(k=>side[k]);
  for(let i=interval.startFrame;i<=interval.endFrame;i++) {
    const f=trace.worldPoses[i];
    if(!f||!indices.every(k=>['x','y','z'].every(n=>Number.isFinite(f[k]?.[n]))))continue;
    const [s,e,w,h,a]=indices.map(k=>['x','y','z'].map(n=>f[k][n]));
    if([[h,s],[s,e],[e,w],[s,a],[h,a]].some(([u,v])=>Math.hypot(...u.map((x,j)=>x-v[j]))<1e-9))continue;
    const v=a.map((x,j)=>x-s[j]),u=h.map((x,j)=>x-s[j]);
    const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    rows.push({hipDeficitDegrees:180-angle(s,h,a),shoulderDeficitDegrees:180-angle(h,s,e),
      elbowDeficitDegrees:180-angle(s,e,w),bodyLineRatio:Math.hypot(...cross)/Math.hypot(...v)**2});
  }
  if(!rows.length)return null;
  return {interpretation:'same model own 3D predictions; not independent motion capture, camera calibration or a replacement grade',
    samples:rows.length,landmarkIndices:indices,medians:Object.fromEntries(Object.keys(rows[0]).map(k=>[k,median(rows.map(x=>x[k]))]))};
}

async function main() {
  const {values}=parseArgs({options:{trace:{type:'string',multiple:true},out:{type:'string'},baseline:{type:'string'},'pixel-stress':{type:'boolean',default:false}}});
  if(!values.trace?.length||!values.out)throw new Error('Provide --trace FILE (repeatable) and --out FILE outside the repository');
  const rel=relative(root,resolve(values.out));
  if(!(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)))throw new Error('Output must be outside the repository');
  const baseline=values.baseline?(await import(pathToFileURL(resolve(values.baseline)))).measureHandstand:null;
  const report={policy:HANDSTAND_SCORE_POLICY,cameraExperiment:cameraProjectionExperiment(),inputs:[]};
  for(const path of values.trace) {
    const bytes=readFileSync(path),trace=JSON.parse(bytes);
    const input={frames:trace.poses.map(f=>f?.map(p=>({x:p.x*trace.width,y:p.y*trace.height,v:p.v}))||null),
      timestamps:trace.timestamps.map(t=>t.actual),width:trace.width,height:trace.height};
    const result=measureHandstand(input),reference=baseline?.(input);
    const entry={trace:basename(path),traceSha256:createHash('sha256').update(bytes).digest('hex'),
      seconds:result.timeline.hold?.seconds??null,components:result.hold?.sc??null,dimensions:result.hold?.scoreDimensions??null,
      evidence:result.diagnostics.metricEvidence??null,modelWorldComparison:modelWorldComparison(trace,result.timeline.hold,result.hold?.k)};
    if(reference) {
      const numeric=r=>JSON.stringify({hold:r.timeline.hold,val:r.hold?.val,scores:r.hold?.sc,total:r.hold?.total});
      entry.numericParity=numeric(result)===numeric(reference);
    }
    if(values['pixel-stress']&&result.hold) {
      const samples=extractTemporalSamples(input.frames,input.timestamps,input),h=result.timeline.hold;
      const rows=samples.slice(h.startFrame,h.endFrame+1).map(s=>s.p);
      entry.coordinateStress=result.diagnostics.validFrames===rows.length?[2,4,8].map(r=>pixelStress(rows,h.seconds,r)):
        {status:'not-run',reason:'interval contains geometry-filtered observations'};
    }
    report.inputs.push(entry);
  }
  writeFileSync(values.out,JSON.stringify(report,null,2));
  if(report.inputs.some(x=>x.numericParity===false))throw new Error('Numeric regression against baseline; see report');
  console.log(JSON.stringify(report.inputs.map(x=>({trace:x.trace,seconds:x.seconds,dimensions:x.dimensions,numericParity:x.numericParity}))));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
