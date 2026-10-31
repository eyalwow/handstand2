import {visiblePoint, angle, median, longestObservedRun} from './analysis-pipeline.js';
export const FRONT_LEVER_VARIANTS = Object.freeze(['tuck','advanced-tuck','one-leg','straddle','full']);
const sides = [[11,13,15,23,25,27],[12,14,16,24,26,28]];
// Provisional research gates, NOT calibrated skill/variation recognition.
// A side-view projection cannot prove hanging support, depth, or the chosen variation.
export function analyzeFrontLever({frames, timestamps, width, height, exerciseId, sideViewConfirmed=false}, {onDebug} = {}) {
  const variant=exerciseId?.replace(/^front-lever-/, '');
  const base={exerciseId, model:'front-lever-observation-v1', validated:false, score:null, variantVerified:false};
  // Explicit developer callback only: no result fields, UI, storage, console or network output.
  const debug=typeof onDebug==='function';
  const records=debug?[]:null;
  const finish=result=>{
    if(debug){
      const counts={},firstRejectionCounts={};
      for(const r of records)for(const reason of r.reasons)counts[reason]=(counts[reason]||0)+1;
      for(const r of records)if(r.reasons[0])firstRejectionCounts[r.reasons[0]]=(firstRejectionCounts[r.reasons[0]]||0)+1;
      onDebug({type:'summary',status:result.status,reason:result.reason,samples:records.length,
        coreSamples:records.filter(r=>r.coreAccepted).length,stableSamples:records.filter(r=>r.stableAccepted).length,
        maxCandidateSeconds:Math.max(0,...records.map(r=>r.candidateSeconds||0)),maxCandidateSamples:Math.max(0,...records.map(r=>r.candidateSamples||0)),
        rejectionCounts:counts,firstRejectionCounts,
        requirements:{minimumSeconds:1.5,minimumSamples:15,maximumGap:.16}});
    }
    return result;
  };
  const reject=reason=>finish({...base,status:'insufficient',reason,hold:null,metrics:null});
  if(!FRONT_LEVER_VARIANTS.includes(variant))return reject('choose-variation');
  if(!sideViewConfirmed)return reject('camera-angle');
  if(!Array.isArray(frames)||!Array.isArray(timestamps)||frames.length!==timestamps.length||!(width>0&&height>0))return reject('invalid-input');
  if(timestamps.some((t,i)=>!Number.isFinite(t)||(i&&t<=timestamps[i-1])))return reject('invalid-timing');
  const isVisible=p=>visiblePoint(p,width,height);
  const core=frames.map((f,index)=>{
    const record=debug?{type:'sample',index,time:timestamps[index],reasons:[],sides:[],coreAccepted:false,stableAccepted:false,candidateSeconds:0,candidateSamples:0}:null;
    if(debug){records.push(record);record.sides=sides.map((ids,side)=>{
      const points=ids.map(id=>f?.[id]);
      const [s,e,w,h,k,a]=points, valid=points.map(isVisible);
      const torso=valid[0]&&valid[3]?Math.hypot(h.x-s.x,h.y-s.y):null;
      const other=f?.[side===0?12:11];
      const measure=(ids)=>ids.every(i=>valid[i])?angle(...ids.map(i=>points[i])):null;
      return {side:side===0?'left':'right',joints:ids.map((id,i)=>({id,visibility:Number.isFinite(points[i]?.v)?points[i].v:null,
        usable:valid[i],issues:!points[i]?['missing']:[
          ...(!Number.isFinite(points[i].v)||points[i].v<.65?['low-visibility']:[]),
          ...(!Number.isFinite(points[i].x)||!Number.isFinite(points[i].y)?['invalid-coordinates']:[]),
          ...(points[i].x<0||points[i].x>width||points[i].y<0||points[i].y>height?['out-of-bounds']:[])]})),
        torso,shoulderSeparationRatio:torso>0&&isVisible(other)?Math.hypot(other.x-s.x,other.y-s.y)/torso:null,
        tilt:torso>0?Math.atan2(Math.abs(h.y-s.y),Math.abs(h.x-s.x))*180/Math.PI:null,
        elbow:measure([0,1,2]),shoulder:measure([1,0,3]),hip:measure([0,3,4]),knee:measure([3,4,5]),
        line:torso>0&&valid[5]?Math.abs((h.x-s.x)*(a.y-s.y)-(h.y-s.y)*(a.x-s.x))/(torso*torso):null,
        wristAboveShoulderTorsoLengths:torso>0&&valid[2]?(s.y-w.y)/torso:null};
    });}
    const fail=reason=>{if(debug)record.reasons.push(reason);return null;};
    if(!f)return fail('missing-pose');
    const options=sides.map(ids=>ids.map(i=>f[i])).filter(p=>p.slice(0,4).every(isVisible));
    if(!options.length)return fail('core-joint-quality');
    const p=options.sort((a,b)=>Math.min(...b.slice(0,4).map(x=>x.v))-Math.min(...a.slice(0,4).map(x=>x.v)))[0];
    if(debug){record.selectedSide=p[0]===f[11]?'left':'right';record.coreConfidence=Math.min(...p.slice(0,4).map(x=>x.v));}
    const [s,e,w,h,k,a]=p, torso=Math.hypot(h.x-s.x,h.y-s.y);
    if(torso<Math.min(width,height)*.08)return fail('torso-too-short');
    // Frontal/foreshortened trunk cannot support a horizontal side-view measure.
    const other=f[s===f[11]?12:11];
    if(isVisible(other)&&Math.hypot(other.x-s.x,other.y-s.y)>torso*.65)return fail('side-view-separation');
    const tilt=Math.atan2(Math.abs(h.y-s.y),Math.abs(h.x-s.x))*180/Math.PI;
    const elbow=angle(s,e,w), shoulder=angle(e,s,h);
    const failed=[];
    if(tilt>25)failed.push('trunk-tilt');
    if(elbow===null||elbow<145)failed.push('elbow-extension');
    if(shoulder===null)failed.push('shoulder-degenerate');
    if(w.y>s.y-torso*.25)failed.push('wrist-not-overhead');
    if(failed.length){if(debug)record.reasons.push(...failed);return null;}
    if(debug)record.coreAccepted=true;
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
    const fail=reason=>{if(debug&&p)records[i].reasons.push(reason);return null;};
    if(!p)return null;
    if(!previous)return fail('previous-core-missing');
    if(p.side!==previous.side)return fail('side-switch');
    if(!(dt>0&&dt<=.16))return fail('timing-gap');
    const speed=Math.hypot(p.hipX-previous.hipX,p.hipY-previous.hipY)/dt;
    if(debug)records[i].normalizedHipSpeed=speed;
    if(!(speed<=.35))return fail('motion');
    if(debug)records[i].stableAccepted=true;
    return p;
  });
  if(debug){
    let start=null,count=0;
    records.forEach((r,i)=>{
      if(!stable[i]){start=null;count=0;}
      else{if(start===null||timestamps[i]-timestamps[i-1]>.16){start=i;count=0;}count++;}
      r.candidateSamples=count;r.candidateSeconds=start===null?0:timestamps[i]-timestamps[start];
      // A passing sample can still be in a run too short to qualify as a hold.
      onDebug(r);
    });
  }
  const run=longestObservedRun(stable,timestamps);
  if(!run.length)return reject(core.some(Boolean)?'no-hold':'tracking-or-view');
  const observations=run.map(i=>stable[i]);
  const metric=key=>{
    const values=observations.map(x=>x[key]).filter(Number.isFinite);
    return values.length>=Math.ceil(observations.length*.8)?median(values):null;
  };
  return finish({...base,status:'observed',reason:null,
    hold:{start:timestamps[run[0]],end:timestamps[run.at(-1)],seconds:timestamps[run.at(-1)]-timestamps[run[0]],samples:run.length},
    metrics:{trunkTiltDegrees:metric('tilt'),elbowDegrees:metric('elbow'),shoulderDegrees:metric('shoulder'),
      hipDegrees:metric('hip'),kneeDegrees:metric('knee'),leftKneeDegrees:metric('leftKnee'),rightKneeDegrees:metric('rightKnee'),observedSide:observations[0].side,lineDeviationTorsoLengths:['full','one-leg','straddle'].includes(variant)?metric('line'):null,
      trackingConfidence:metric('confidence')},
    limitations:['experimental-2d','selected-variation-not-verified','support-not-detected','depth-not-measured']});
}
