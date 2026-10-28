// Conservative scoring policy: absent or uncertain phases never become zero scores.
export function overallHandstandScore(hold,entry) {
  const phases=[];
  if(hold && Number.isFinite(hold.total)) phases.push({score:hold.total,weight:.7});
  if(entry && Number.isFinite(entry.total)) phases.push({score:entry.total,weight:.3});
  if(!phases.length) return null;
  return Math.round(Math.max(0,Math.min(100,phases.reduce((s,p)=>s+p.score*p.weight,0)/phases.reduce((s,p)=>s+p.weight,0))));
}
export function bestMeasuredStrength(hold,entry) {
  const candidates=[];
  if(hold) for(const [key,label] of Object.entries({
    banana:"קו הגוף נשמר ישר בחלק שנמדד.",shoulder:"הכתפיים נשארו פתוחות בחלק שנמדד.",
    elbow:"הזרועות נשארו ישרות בחלק שנמדד.",sway:"ההחזקה נראתה יציבה בחלק שנמדד."
  })) if((key!=="sway"||hold.swayOk)&&Number.isFinite(hold.sc[key])&&hold.sc[key]>=80) candidates.push({key:"hold_"+key,score:hold.sc[key],text:label});
  if(entry) for(const [key,label] of Object.entries({
    reach:"העלייה הגיעה לקו האנכי.",shoulder:"הכתפיים נשארו פתוחות במהלך העלייה.",
    elbow:"הזרועות נשארו ישרות במהלך העלייה."
  })) if(Number.isFinite(entry.sc[key])&&entry.sc[key]>=80)candidates.push({key:"entry_"+key,score:entry.sc[key],text:label});
  return candidates.sort((a,b)=>b.score-a.score)[0]||null;
}
// Require an observed transition, never relabel an already-held position as an entry.
export function observedEntryWindow(fr,fps,hold) {
  const stop=hold?.diagnostics?.startFrame ?? fr.length-1;
  const side=hold?.k || {wrist:15,elbow:13,shoulder:11,hip:23,ankle:27};
  const required=[side.wrist,side.elbow,side.shoulder,side.hip,side.ankle];
  const valid=f=>f&&required.every(i=>f[i]&&f[i].v>=.65&&Number.isFinite(f[i].x)&&Number.isFinite(f[i].y));
  const inverted=f=>valid(f)&&f[side.hip].y<f[side.shoulder].y&&f[side.ankle].y<f[side.shoulder].y&&f[side.wrist].y>f[side.shoulder].y;
  let end=-1;
  for(let i=0;i<=Math.min(fr.length-3,stop+3);i++) if(inverted(fr[i])&&inverted(fr[i+1])&&inverted(fr[i+2])){end=i+2;break;}
  if(end<0)return null;
  let start=-1;
  for(let i=Math.max(0,end-Math.round(2*fps));i<end-2;i++){
    const f=fr[i];
    if(valid(f)&&f[side.hip].y>f[side.shoulder].y&&f[side.ankle].y>f[side.shoulder].y&&f[side.wrist].y>f[side.shoulder].y){start=i;break;}
  }
  if(start<0 || end-start<Math.ceil(.5*fps))return null;
  // Include the last pre-entry half-second so coverage is not based on a single frame.
  start=Math.max(0,start-Math.round(.3*fps));
  const segment=fr.slice(start,end+1),good=segment.filter(valid);
  if(good.length<8||good.length/segment.length<.8)return null;
  const first=good[0],last=good.at(-1);
  const body=Math.hypot(last[side.ankle].x-last[side.shoulder].x,last[side.ankle].y-last[side.shoulder].y);
  if(body<=0 || first[side.hip].y-last[side.hip].y<body*.15)return null;
  return segment.map(f=>valid(f)?f:null);
}

// Replay boundaries are only labelled when adjacent reliable body samples show
// a standing-to-inverted or inverted-to-standing transition. Missing phases
// fall back to a bounded context window around the measured hold.
export function observedExerciseWindow(fr,fps,hold) {
  const diag=hold?.diagnostics;
  if(!diag)return null;
  const side=hold.k || {wrist:15,shoulder:11,hip:23,ankle:27};
  const body=[side.wrist,side.shoulder,side.hip,side.ankle];
  const visible=(f,min)=>f&&body.every(i=>f[i]&&f[i].v>=min&&Number.isFinite(f[i].x)&&Number.isFinite(f[i].y));
  const inverted=f=>visible(f,.6)&&f[side.hip].y<f[side.shoulder].y&&f[side.ankle].y<f[side.shoulder].y&&f[side.wrist].y>f[side.shoulder].y;
  const standing=f=>visible(f,.65)&&f[side.hip].y>f[side.shoulder].y&&f[side.ankle].y>f[side.shoulder].y;
  const st=diag.startFrame,en=diag.endFrame;
  let start=Math.max(0,st-Math.round(fps*2)),end=Math.min(fr.length-1,en+Math.round(fps*.9));
  let observedStart=false,observedEnd=false;
  for(let i=st-2;i>=Math.max(1,st-Math.round(fps*5));i--){
    if(standing(fr[i])&&standing(fr[i-1])&&fr.slice(i+1,st+1).some(inverted)){
      start=Math.max(0,i-Math.round(fps*.2));observedStart=true;break;
    }
  }
  for(let i=en+1;i<Math.min(fr.length-1,en+Math.round(fps*5));i++){
    if(standing(fr[i])&&standing(fr[i+1])){
      end=Math.min(fr.length-1,i+Math.round(fps*.2));observedEnd=true;break;
    }
  }
  return {start,end,observedStart,observedEnd};
}
