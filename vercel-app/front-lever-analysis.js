import {visiblePoint, angle, median, longestObservedRun} from './analysis-pipeline.js';
export const FRONT_LEVER_VARIANTS = Object.freeze(['tuck','advanced-tuck','one-leg','straddle','full']);
const sides = [[11,13,15,23,25,27],[12,14,16,24,26,28]];
// Provisional research gates, NOT calibrated skill/variation recognition.
// A side-view projection cannot prove hanging support, depth, or the chosen variation.
export function analyzeFrontLever({frames, timestamps, width, height, exerciseId, sideViewConfirmed=false}) {
  const variant=exerciseId?.replace(/^front-lever-/, '');
  const base={exerciseId, model:'front-lever-observation-v1', validated:false, score:null, variantVerified:false};
  const reject=reason=>({...base,status:'insufficient',reason,hold:null,metrics:null});
  if(!FRONT_LEVER_VARIANTS.includes(variant))return reject('choose-variation');
  if(!sideViewConfirmed)return reject('camera-angle');
  if(!Array.isArray(frames)||!Array.isArray(timestamps)||frames.length!==timestamps.length||!(width>0&&height>0))return reject('invalid-input');
  if(timestamps.some((t,i)=>!Number.isFinite(t)||(i&&t<=timestamps[i-1])))return reject('invalid-timing');
  const isVisible=p=>visiblePoint(p,width,height);
  const core=frames.map(f=>{
    if(!f)return null;
    const options=sides.map(ids=>ids.map(i=>f[i])).filter(p=>p.slice(0,4).every(isVisible));
    if(!options.length)return null;
    const p=options.sort((a,b)=>Math.min(...b.slice(0,4).map(x=>x.v))-Math.min(...a.slice(0,4).map(x=>x.v)))[0];
    const [s,e,w,h,k,a]=p, torso=Math.hypot(h.x-s.x,h.y-s.y);
    if(torso<Math.min(width,height)*.08)return null;
    // Frontal/foreshortened trunk cannot support a horizontal side-view measure.
    const other=f[s===f[11]?12:11];
    if(isVisible(other)&&Math.hypot(other.x-s.x,other.y-s.y)>torso*.65)return null;
    const tilt=Math.atan2(Math.abs(h.y-s.y),Math.abs(h.x-s.x))*180/Math.PI;
    const elbow=angle(s,e,w), shoulder=angle(e,s,h);
    if(tilt>25 || elbow===null || elbow<145 || shoulder===null || w.y>s.y-torso*.25)return null;
    // Optional leg metrics never borrow missing/hidden points or merge two sides.
    const knee=isVisible(k)&&isVisible(a)?angle(h,k,a):null;
    const hip=isVisible(k)?angle(s,h,k):null;
    const line=isVisible(a)?Math.abs((h.x-s.x)*(a.y-s.y)-(h.y-s.y)*(a.x-s.x))/(torso*torso):null;
    const kneeOn=ids=>ids.every(i=>isVisible(f[i]))?angle(...ids.map(i=>f[i])):null;
    return {tilt,elbow,shoulder,knee,hip,line,leftKnee:kneeOn([23,25,27]),rightKnee:kneeOn([24,26,28]),confidence:Math.min(...p.slice(0,4).map(x=>x.v)),hipX:h.x/torso,hipY:h.y/torso,side:s===f[11]?'left':'right'};
  });
  // Fast movement is not a static hold. Do not join left/right tracks across occlusion.
  const stable=core.map((p,i)=>{
    const previous=core[i-1],dt=timestamps[i]-timestamps[i-1];
    if(!p||!previous||p.side!==previous.side||!(dt>0&&dt<=.16))return null;
    return Math.hypot(p.hipX-previous.hipX,p.hipY-previous.hipY)/dt<=.35?p:null;
  });
  const run=longestObservedRun(stable,timestamps);
  if(!run.length)return reject(core.some(Boolean)?'no-hold':'tracking-or-view');
  const observations=run.map(i=>stable[i]);
  const metric=key=>{
    const values=observations.map(x=>x[key]).filter(Number.isFinite);
    return values.length>=Math.ceil(observations.length*.8)?median(values):null;
  };
  return {...base,status:'observed',reason:null,
    hold:{start:timestamps[run[0]],end:timestamps[run.at(-1)],seconds:timestamps[run.at(-1)]-timestamps[run[0]],samples:run.length},
    metrics:{trunkTiltDegrees:metric('tilt'),elbowDegrees:metric('elbow'),shoulderDegrees:metric('shoulder'),
      hipDegrees:metric('hip'),kneeDegrees:metric('knee'),leftKneeDegrees:metric('leftKnee'),rightKneeDegrees:metric('rightKnee'),observedSide:observations[0].side,lineDeviationTorsoLengths:['full','one-leg','straddle'].includes(variant)?metric('line'):null,
      trackingConfidence:metric('confidence')},
    limitations:['experimental-2d','selected-variation-not-verified','support-not-detected','depth-not-measured']};
}
