import {analyzeHandstandTimeline} from "./handstand-temporal.js";
import {buildIntelligentCoaching} from "./handstand-coaching.js";
import {renderHandstandInsights} from "./handstand-insights-ui.js";
import {smoothDisplayTrack,poseAtTime,drawPoseOverlay} from "./pose-overlay.js";
import {analysisUI} from "./movalyt-ui.js";
import {overallHandstandScore,observedEntryWindow,observedExerciseWindow} from "./handstand-summary.js";
import {setupCoach,resetCoachFeedback,showCoachFeedback} from "./ai-feedback.js";
import {reportAnalysisTiming} from "./analysis-performance.js";
import {PoseRuntime,analysisTimeoutMs} from "./pose-runtime.js";
import {sampleTimes,loadVideo,seekVideoFrame,scanVideoFrames} from "./video-sampling.js";
const $=id=>document.getElementById(id);
setupCoach();
let stopReplay=()=>{};
const K={L:{ear:7,shoulder:11,elbow:13,wrist:15,hip:23,ankle:27},R:{ear:8,shoulder:12,elbow:14,wrist:16,hip:24,ankle:28}};
const TH={banana:[.03,.12],lean:[3,15],shoulder:[8,35],elbow:[8,30],sway:[.01,.05]};
const WT={banana:.3,lean:.2,shoulder:.2,elbow:.15,sway:.15};
const NAME={banana:"קו הגוף",lean:"איזון",shoulder:"כתפיים",elbow:"ידיים",sway:"יציבות"};
const TIP={
 arch:"האגן בורח קדימה מעבר לקו (גב מקושת). כווץ ישבן, הכנס צלעות פנימה והחזר את האגן מעל הכתפיים.",
 back:"האגן נשאר מאחורי הקו. הבא את האגן קדימה מעל הכתפיים וכווץ ישבן.",
 lean:"הגוף נוטה מהאנך. תאזן עם לחץ באצבעות: נופל קדימה = לחץ בקצות האצבעות, נופל אחורה = לחץ בכף היד.",
 shoulder:"הכתפיים לא פתוחות עד הסוף. דחוף גבוה דרך הכתפיים, אוזניים בין הידיים.",
 elbow:"המרפקים מתכופפים. נעל את הידיים והמשך לדחוף את הרצפה.",
 sway:"הרבה התנדנדות. תתרגל החזקות קצרות עם לחץ יציב באצבעות, או החזקות על קיר.",
 short:"ההחזקה קצרה (פחות מ-5 שניות), אז הציון פחות מדויק. נסה להחזיק 5 שניות ומעלה כדי לקבל תמונה מלאה."};
const SCALE=1.5;let LAST=null;
const med=a=>{const s=[...a].sort((x,y)=>x-y),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const std=a=>{const m=a.reduce((x,y)=>x+y,0)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
const ang=(a,b,c)=>{const u=[a[0]-b[0],a[1]-b[1]],w=[c[0]-b[0],c[1]-b[1]];
 const cs=(u[0]*w[0]+u[1]*w[1])/(Math.hypot(...u)*Math.hypot(...w)+1e-9);return Math.acos(Math.max(-1,Math.min(1,cs)))*180/Math.PI};
const band=(v,[g,b])=>v<=g?100:v>=b?0:100*(b-v)/(b-g);
function longestRun(mask,gapMax){let best=null,s=null,last=null,gap=0;
 mask.forEach((m,i)=>{if(m){if(s===null)s=i;last=i;gap=0}else if(s!==null){gap++;if(gap>gapMax){if(!best||last-s>best[1]-best[0])best=[s,last];s=null}}});
 if(s!==null&&(!best||last-s>best[1]-best[0]))best=[s,last];return best}
function analyze(fr,fps){
 const vis={L:0,R:0};
 fr.forEach(f=>{if(f)for(const s of["L","R"])for(const i of Object.values(K[s]))vis[s]+=f[i].v});
 const side=vis.L>=vis.R?"L":"R",k=K[side];
 const P=f=>Object.fromEntries(Object.entries(k).map(([n,i])=>[n,[f[i].x,f[i].y]]));
 const inv=f=>{if(!f||!["shoulder","elbow","wrist","hip","ankle"].every(n=>f[k[n]].v>=.5))return false;
  const p=P(f);return p.ankle[1]<p.hip[1]&&p.hip[1]<p.shoulder[1]&&p.shoulder[1]<p.wrist[1]&&Math.abs(p.ankle[0]-p.wrist[0])<Math.abs(p.ankle[1]-p.wrist[1])};
 const gap=Math.max(1,Math.round(.3*fps));
 let mask=fr.map(inv),run=longestRun(mask,gap),relaxed=false;
 if(!run||run[1]-run[0]+1<3){
  const loose=f=>{if(!f||!["shoulder","elbow","wrist","hip","ankle"].every(n=>f[k[n]].v>=.3))return false;const p=P(f);return p.ankle[1]<p.hip[1]&&p.hip[1]<p.shoulder[1]};
  mask=fr.map(loose);run=longestRun(mask,gap);relaxed=true}
 if(!run||run[1]-run[0]+1<3)return null;
 const idx=[];for(let i=run[0];i<=run[1];i++)if(mask[i])idx.push(i);
 const facing=med(idx.map(i=>fr[i][0].x-fr[i][k.ear].x))>=0?1:-1;
 const metr=f=>{const p=P(f),{shoulder:s,hip:h,ankle:a,wrist:w,elbow:e}=p;
  const body=Math.hypot(a[0]-s[0],a[1]-s[1])+1e-9,t=(h[1]-s[1])/(a[1]-s[1]),lx=s[0]+t*(a[0]-s[0]);
  return{banana:facing*(h[0]-lx)/body,lean:Math.atan2(Math.abs(a[0]-w[0]),Math.abs(a[1]-w[1])+1e-9)*180/Math.PI,
   shoulder:180-ang(h,s,e),elbow:180-ang(s,e,w),hipx:(h[0]-w[0])/body}};
 const ms=idx.map(i=>metr(fr[i]));
 const m=n=>med(ms.map(x=>x[n]));
 const val={banana:m("banana"),lean:m("lean"),shoulder:Math.max(0,m("shoulder")),elbow:Math.max(0,m("elbow")),sway:std(ms.map(x=>x.hipx))};
 const swayOk=idx.length>=5;
 // Preserve raw sway diagnostics, but prevent isolated detector jumps dominating the score.
 const rawSway=val.sway;val.sway=1.4826*med(ms.map(x=>Math.abs(x.hipx-med(ms.map(y=>y.hipx)))));
 const sc={};let total=0;
 for(const n in TH){sc[n]=band(n==="banana"?Math.abs(val[n]):val[n],TH[n].map(x=>x*SCALE));if(n!=="sway"||swayOk)total+=sc[n]*WT[n]}
 if(!swayOk)total/=1-WT.sway;
 const sf=m=>{const q=(n,v)=>band(v,TH[n].map(x=>x*SCALE))*WT[n];return(q("banana",Math.abs(m.banana))+q("lean",m.lean)+q("shoulder",Math.max(0,m.shoulder))+q("elbow",Math.max(0,m.elbow)))/.85};
 const series=fr.map((f,i)=>mask[i]?sf(metr(f)):null);
 const thirds=[0,1,2].map(j=>{
  const a=Math.floor(j*ms.length/3),b=Math.floor((j+1)*ms.length/3),subset=ms.slice(a,b);
  const metric=k=>{const scale=k==="banana"?1000:10;return subset.length?Math.round(med(subset.map(x=>x[k]))*scale)/scale:null};
  return{phase:["start","middle","end"][j],pelvisOffsetPercent:subset.length?Math.round(metric("banana")*1000)/10:null,leanDegrees:metric("lean"),shoulderDeficitDegrees:metric("shoulder"),elbowDeficitDegrees:metric("elbow")};
 });
 const visibilityPercent=Math.round(100*med(idx.map(i=>Math.min(...["shoulder","elbow","wrist","hip","ankle"].map(n=>fr[i][k[n]].v)))));
 // A single ankle cannot describe the body's central line when the legs are apart.
 const legGaps=idx.map(i=>{
  const f=fr[i],left=f[K.L.ankle],right=f[K.R.ankle],shoulder=f[k.shoulder];
  if(left.v<.5||right.v<.5)return null;
  const body=Math.hypot(f[k.ankle].x-shoulder.x,f[k.ankle].y-shoulder.y);
  return body>0?Math.hypot(left.x-right.x,left.y-right.y)/body:null;
 }).filter(x=>x!==null);
 const legsApart=legGaps.length>=Math.max(5,idx.length*.4)&&med(legGaps)>.35;
 return{val,sc,total,swayOk,k,series,fps,hold:(run[1]-run[0]+1)/fps,mid:idx[idx.length>>1],
  diagnostics:{startFrame:run[0],endFrame:run[1],validFrames:idx.length,visibilityPercent,thirds,relaxed,legsApart,rawSway}}}
function reliableResult(res,fps){
 return !!(res&&!res.diagnostics.relaxed&&!res.diagnostics.legsApart&&res.hold>=1.5&&res.diagnostics.validFrames>=10&&
  res.diagnostics.visibilityPercent>=65&&res.diagnostics.validFrames/(res.hold*fps)>=.7);
}
const sideOf=fr=>{const v={L:0,R:0};fr.forEach(f=>{if(f)for(const sd of["L","R"])for(const i of Object.values(K[sd]))v[sd]+=f[i].v});return v.L>=v.R?"L":"R"};
function analyzeEntry(fr,fps){
 const k=K[sideOf(fr)],P=f=>Object.fromEntries(Object.entries(k).map(([n,i])=>[n,[f[i].x,f[i].y]]));
 const up=f=>{if(!f||!["shoulder","elbow","wrist","hip","ankle"].every(n=>f[k[n]].v>=.5))return false;const p=P(f);return p.hip[1]<p.shoulder[1]&&p.wrist[1]>p.shoulder[1]};
 const mask=fr.map(up),run=longestRun(mask,Math.max(1,Math.round(.3*fps)));
 if(!run||run[1]-run[0]+1<3)return null;
 const idx=[];for(let i=run[0];i<=run[1];i++)if(mask[i])idx.push(i);
 const facing=med(idx.map(i=>fr[i][0].x-fr[i][k.ear].x))>=0?1:-1;
 const ms=idx.map(i=>{const p=P(fr[i]),s=p.shoulder,h=p.hip,a=p.ankle,w=p.wrist,e=p.elbow,body=Math.hypot(a[0]-s[0],a[1]-s[1])+1e-9,t=(h[1]-s[1])/(a[1]-s[1]||1e-9),lx=s[0]+t*(a[0]-s[0]);
  return{up:a[1]<h[1],hi:a[1]<s[1],ay:a[1],a:Math.atan2(Math.abs(a[0]-w[0]),Math.abs(a[1]-w[1])+1e-9)*180/Math.PI,side:facing*(a[0]-w[0]),
   ban:facing*(h[0]-lx)/body,sh:Math.max(0,180-ang(h,s,e)),el:Math.max(0,180-ang(s,e,w))}});
 const ups=ms.filter(m=>m.up),best=(ups.length?ups:ms).reduce((x,y)=>y.ay<x.ay?y:x);
 const hiF=ms.filter(m=>m.hi&&m.a<12),arch=hiF.length>=2?med(hiF.map(m=>m.ban)):null;
 const sc={reach:ups.length?band(best.a,[8,40]):0,arch:arch==null?100:band(Math.max(0,arch),[.04,.15]),shoulder:band(med(ms.map(m=>m.sh)),[10,40]),elbow:band(med(ms.map(m=>m.el)),[10,35])};
 return{sc,total:sc.reach*.4+sc.arch*.25+sc.shoulder*.2+sc.elbow*.15,minAng:best.a,over:best.side<0,reached:ups.length>0&&best.a<=10,arch}}
const ENAME={reach:"גובה הבעיטה",arch:"קו הגוף",shoulder:"כתפיים",elbow:"ידיים"};
const ENTRYD={reach:["בעיטות לקיר: 5 x 5, מתמקדים בכוח הבעיטה ובכתפיים מעל הידיים","בעיטה בפעימה אחת עם רגל מובילה ישרה, ולא קפיצה על שתי הרגליים"],
 arch:["הולו בודי: 3 סטים של 20-30 שניות","בעיטות לקיר עם צלעות פנימה וישבן מכווץ כבר מההתחלה, גם אם הבעיטה קצרה יותר"]};
function showEntry(e){
 const T={reach:e.reached?"הרגליים הגיעו עד הקו האנכי מעל הידיים.":e.over?"עברת את הקו האנכי עם הרגליים. האט את הבעיטה ושמור על הגוף ישר כשאתה מגיע.":"הרגליים לא הגיעו עד הקו האנכי (עצרו בערך "+f1(e.minAng)+"° ממנו). בעט חזק יותר, והבא את הכתפיים מעל הידיים לפני הבעיטה.",
  arch:e.sc.arch>=80?"הגוף נשאר ישר בעלייה, בלי קשת.":"הגב מתקשת בעלייה. התחל כבר בהתחלה עם צלעות פנימה, ישבן מכווץ וגב קעור (הולו), ורק אז בעט.",
  shoulder:e.sc.shoulder>=80?"הכתפיים נשארות פתוחות בעלייה.":"הכתפיים נסגרות בעלייה. דחוף את הרצפה והרם את הכתפיים לכיוון האוזניים כבר בבעיטה.",
  elbow:e.sc.elbow>=80?"הידיים נשארות ישרות בעלייה.":"המרפקים מתכופפים בעלייה. נעל את הידיים לפני שאתה בועט."};
 const col=x=>x>=80?"good":x>=50?"mid":"bad";
 $("entrySum").textContent="ציון עלייה: "+Math.round(e.total)+" מתוך 100";
 $("entryList").innerHTML=Object.keys(T).map(n=>`<li><b>${ENAME[n]}</b> · <span style="color:var(--${col(e.sc[n])})">${lab(e.sc[n])}</span><br>${T[n]}</li>`).join("");
 const wk=Object.keys(T).filter(n=>e.sc[n]<80).sort((a,b)=>e.sc[a]-e.sc[b]).slice(0,2);
 $("entryDrills").innerHTML=wk.length?wk.map(n=>`<li style="margin:10px 0"><b>${ENAME[n]}</b><br>${(ENTRYD[n]||DRILLS[n]).map(d=>"• "+d).join("<br>")}</li>`).join(""):"<li>עלייה טובה. נסה להאריך את ההחזקה אחרי העלייה.</li>"}
let poseRuntime=null,activeAnalysis=null;
const seek=(v,t)=>seekVideoFrame(v,t);
let videoObjectUrl=null;
for(const inputId of ["file","cameraFile"]) $(inputId).addEventListener("change",async e=>{
 if(activeAnalysis)return;
 const file=e.target.files[0];if(!file)return;
 const timing={kind:"video-analysis",outcome:"error",capturePath:"none",stage:"decode"},analysisStarted=performance.now();
 const controller=new AbortController();activeAnalysis=controller;let analysisTimer;
 poseRuntime=new PoseRuntime({initOptions:{preferredDelegate:"CPU"}});
 $("retryAnalysis").hidden=true;$("analyzerView").setAttribute("aria-busy","true");
 $("file").disabled=true;$("cameraFile").disabled=true;
 stopReplay();LAST=null;analysisUI.start();
  resetCoachFeedback();
 const st=$("status"),pg=$("prog"),v=$("v"),cancel=$("cancelAnalysis");$("out").style.display="none";pg.style.display="block";pg.value=0;cancel.hidden=false;
 try{
  analysisUI.stage("decode");const decodeStarted=performance.now();st.textContent="בודק את הסרטון...";
  v.muted=true;if(videoObjectUrl)URL.revokeObjectURL(videoObjectUrl);videoObjectUrl=URL.createObjectURL(file);
  await loadVideo(v,videoObjectUrl,controller.signal);
  timing.decodeMs=performance.now()-decodeStarted;
  if(v.duration>120){timing.outcome="too-long";pg.style.display="none";st.textContent="הסרטון ארוך מדי לניתוח. נסו לבחור סרטון של עד שתי דקות.";return}
  const w=v.videoWidth,h=v.videoHeight,fps=10,times=sampleTimes(v.duration,fps),n=times.length;
  analysisUI.preview(v,w,h);
  if(!w||!h||!(n>0))throw Object.assign(new Error("הסרטון קצר מדי או שאינו ניתן לפענוח."),{code:"video-decode"});
  const cvs=document.createElement("canvas");const sc=Math.min(1,480/Math.max(w,h));cvs.width=Math.round(w*sc);cvs.height=Math.round(h*sc);const cx=cvs.getContext("2d");
  analysisUI.stage("model");timing.stage="model";st.textContent="טוען מודל (בפעם הראשונה לוקח כמה שניות)...";const modelStarted=performance.now();
  const ready=await poseRuntime.init(controller.signal);timing.modelMs=performance.now()-modelStarted;timing.poseDelegate=ready.delegate;timing.execution=ready.execution;
  analysisTimer=setTimeout(()=>controller.abort(new DOMException("הניתוח עבר את מגבלת הזמן.","TimeoutError")),analysisTimeoutMs(v.duration));
  let fr=null,poseMs=0,poseRoundTripMs=0,frameExtractionMs=0,poseFrames=0;let sampledTimes=[];
  const det=async timestamp=>{const extractionStarted=performance.now(),bitmap=await createImageBitmap(cvs);frameExtractionMs+=performance.now()-extractionStarted;const started=performance.now();
   const result=await poseRuntime.detect(bitmap,controller.signal,timestamp);poseRoundTripMs+=performance.now()-started;poseMs+=result.inferenceMs;poseFrames++;
   const landmarks=result.landmarks?result.landmarks.map(p=>({x:p.x*w,y:p.y*h,v:p.v})):null;analysisUI.frame(cvs,landmarks,w,h,v.currentTime);return landmarks};
  analysisUI.stage("scan");timing.stage="scan";st.textContent="מנתח את הסרטון...";
  const samplingStarted=performance.now();
  timing.capturePath="fixed-sequential-seek";
  const sampled=await scanVideoFrames({video:v,times,signal:controller.signal,
   capture:async timestamp=>{cx.drawImage(v,0,0,cvs.width,cvs.height);return det(timestamp)},
   onProgress:value=>{analysisUI.progress(value);pg.value=value;st.textContent="מנתח את הסרטון... "+Math.round(value*100)+"%"}});
  fr=sampled.frames;sampledTimes=sampled.timestamps;
  timing.scanMs=performance.now()-samplingStarted;timing.poseMs=poseMs;timing.poseRoundTripMs=poseRoundTripMs;timing.workerOverheadMs=Math.max(0,poseRoundTripMs-poseMs);timing.frameExtractionMs=frameExtractionMs;timing.samplingWaitMs=Math.max(0,timing.scanMs-poseRoundTripMs-frameExtractionMs);timing.poseFrames=poseFrames;
  pg.style.display="none";
  analysisUI.stage("scoring");timing.stage="scoring";const scoringStarted=performance.now();LAST={fr,fps,v,w,h};const measuredHold=analyze(fr,fps);
  const res=reliableResult(measuredHold,fps)?measuredHold:null;
  const legacyEntryTrace={};
  const entryFrames=observedEntryWindow(fr,fps,res,legacyEntryTrace);
  const ent=entryFrames?analyzeEntry(entryFrames,fps):null;
  if(ent && ent.arch===null) ent.total=(ent.sc.reach*.4+ent.sc.shoulder*.2+ent.sc.elbow*.15)/.75;
  const overall=overallHandstandScore(res,ent);
  const poseTimes=sampledTimes.map(t=>t.actual);
  const timeline=analyzeHandstandTimeline({frames:fr,timestamps:poseTimes,width:w,height:h,hold:res,entry:ent});
  const reliable=overall!==null;
  // Local diagnostics only; no file bytes or poses leave the browser.
  window.dispatchEvent(new CustomEvent("movalyt:analysis-diagnostic",{detail:{input:{bytes:file.size,type:file.type,duration:v.duration},sampling:"fixed-sequential-v1",delegate:ready.delegate,execution:ready.execution,timestamps:sampledTimes,score:overall,legacyEntryTrace,timeline,hold:res?{start:res.diagnostics.startFrame,end:res.diagnostics.endFrame,seconds:res.hold,metrics:res.val,scores:res.sc}:null,entry:ent?{total:ent.total,scores:ent.sc}:null}}));
  if(controller.signal.aborted)throw controller.signal.reason;

  timing.scoringMs=performance.now()-scoringStarted;
  const seen=fr.map((f,i)=>f?i:-1).filter(i=>i>=0);
  if(!seen.length){timing.outcome="no-pose";$("retryAnalysis").hidden=false;st.textContent="לא הצלחנו לזהות גוף בסרטון. נסו לצלם מהצד כשכל הגוף מופיע בפריים.";return}
  st.textContent="";
  $("measurementNotice").hidden=reliable;
  $("holdSec").style.display=reliable?"block":"none";
  analysisUI.stage("render");timing.stage="render";if(reliable){
   const renderStarted=performance.now();
   await show(res,fr,v,w,h,overall,poseTimes);
   if(controller.signal.aborted)throw controller.signal.reason;
   showCoachFeedback(res,ent);
   renderHandstandInsights(timeline,buildIntelligentCoaching(timeline,res,ent));
   $("measurementNotice").hidden=false;
    $("measurementNotice").textContent=(res&&ent?"הציון כולל את העלייה וההחזקה שנצפו. ":res?"הציון מתייחס להחזקה בלבד; העלייה לא נצפתה בביטחון. ":"הציון מתייחס לעלייה בלבד; לא נמדדה החזקה מספקת. ")+"הציון משקף טכניקת גוף בלבד; אין אפשרות לקבוע מהצילום אם הייתה תמיכת קיר.";
   timing.renderMs=performance.now()-renderStarted;timing.outcome="scored";
    if(res?.hold>=2){
    try{const key="handstand-lab-analyses-v1",old=JSON.parse(localStorage.getItem(key)||"[]");
     if(Array.isArray(old)){old.push({date:new Date().toISOString(),score:overall,model:ent?"v3-fixed-entry-hold":"v3-fixed-hold"});localStorage.setItem(key,JSON.stringify(old.slice(-100)));window.dispatchEvent(new Event("analysis-saved"));}
    }catch{}
   }
  }else{
   $("measurementNotice").textContent=measuredHold?.diagnostics.legsApart
    ?"בפיסוק הרגליים קשה לנו להעריך את קו הגוף בצורה הוגנת. נסו סרטון נוסף עם רגליים קרובות, כשהגוף כולו בפריים."
    :"לא הצלחנו למדוד את העמידה בביטחון. נסו לצלם מהצד, עם כל הגוף בפריים והחזקה ברורה של כמה שניות.";
   await replay(fr,v,w,h,K[sideOf(fr)],null,fps,seen[seen.length>>1],null,poseTimes);
   $("out").style.display="block";
   timing.outcome="unreliable";
  }
 }catch(err){pg.style.display="none";console.error(err);timing.errorName=err?.name;timing.errorCode=err?.code;$("out").style.display="none";$("retryAnalysis").hidden=false;
  if(err?.name==="AbortError"){timing.outcome="cancelled";st.textContent="הניתוח בוטל. לא נשמרה ולא הוצגה תוצאה."}
  else if(err?.name==="TimeoutError"){timing.outcome="timeout";st.textContent="הניתוח נעצר כי העיבוד ארך יותר מדי. לא הוצגה תוצאה; אפשר לנסות סרטון קצר יותר."}
  else if(err?.code==="video-decode"){timing.outcome="decode-error";st.textContent=err.message+" נסו לשמור עותק MP4 תואם ולבחור אותו שוב."}
  else if(timing.stage==="model"){timing.outcome="model-error";st.textContent="רכיב ניתוח התנועה לא נטען. בדקו את החיבור לרשת ונסו שוב. לא הוצגה תוצאה."}
  else st.textContent="לא הצלחנו לנתח את הסרטון. בדקו שהוא מתנגן במכשיר, שהחיבור לרשת פעיל, ונסו שוב."}
 finally{analysisUI.finish(timing.outcome);clearTimeout(analysisTimer);poseRuntime?.terminate();v.pause();$("analyzerView").removeAttribute("aria-busy");if(activeAnalysis===controller)activeAnalysis=null;cancel.hidden=true;timing.totalMs=performance.now()-analysisStarted;reportAnalysisTiming(timing);$("file").disabled=false;$("cameraFile").disabled=false;e.target.value=""}
});
$("cancelAnalysis").addEventListener("click",()=>{if(activeAnalysis&&!activeAnalysis.signal.aborted){activeAnalysis.abort(new DOMException("הניתוח בוטל על ידי המשתמש.","AbortError"));poseRuntime?.terminate()}});
$("retryAnalysis").addEventListener("click",()=>$("file").click());
const f1=x=>String(Math.round(x*10)/10);
function why(n,res){
 const score=Math.round(res.sc[n]),v=res.val;
 const level=score>=80?"נראה טוב בחלק שנמדד":score>=50?"כדאי לדייק":"דורש עבודה ממוקדת";
 if(n==="banana")return level+". "+(v.banana>0?"האגן בורח קדימה מקו הגוף והגב נראה מקושת.":"האגן נשאר מעט מאחורי קו הכתפיים והרגליים.")+" נסה לשמור על קו גוף אחיד.";
 if(n==="lean")return level+". הגוף נוטה מהקו האנכי של הידיים. כדאי לעבוד על שליטה במרכז הגוף.";
 if(n==="shoulder")return level+". הכתפיים נסגרות במידה מסוימת במקום להישאר פתוחות לאורך העמידה. דחוף גבוה דרך הכתפיים.";
 if(n==="elbow")return level+". המרפקים לא נשארים ישרים לחלוטין. התמקד ביישור ידיים ובדחיפה יציבה מהרצפה.";
 return level+". נמדדה תנועה של האגן במהלך ההחזקה. תרגל תיקוני איזון קטנים ומבוקרים.";
}
const lab=s=>s>=80?"מצוין":s>=50?"בסדר":"דורש תרגול";
function plain(n,res){const s=res.sc[n],g=s>=80,b=res.val.banana>0;
 return({banana:g?"הגוף שלך ישר כמו קו, בלי קשת.":b?"הגב שלך מקושת והאגן בורח קדימה.":"האגן נשאר קצת אחורה והגוף לא ישר.",
  lean:g?"אתה מאוזן ישר מעל הידיים.":"הגוף נוטה קדימה או אחורה במקום לעמוד אנכי מעל הידיים.",
  shoulder:g?"הכתפיים פתוחות והזרועות קרובות לאוזניים.":"הכתפיים לא פתוחות עד הסוף.",
  elbow:g?"הידיים ישרות ונעולות.":"המרפקים מתכופפים.",
  sway:g?"אתה יציב, כמעט בלי התנדנדות.":"יש התנדנדות, הגוף זז הרבה בזמן ההחזקה."})[n]}
const DRILLS={
 banana:["הולו בודי: 3 סטים של 20-30 שניות","עמידת ידיים בקיר עם הפנים לקיר: 3 סטים של 20 שניות, מחזיקים קו ישר"],
 lean:["משיכות עקב מהקיר: מרימים את הרגליים מהקיר לשנייה-שתיים ומאזנים עם האצבעות","עמידת ידיים בקיר: 5 החזקות של 10 שניות, מתמקדים בלחץ באצבעות"],
 shoulder:["מתיחת כתפיים בקיר: ידיים על הקיר וחזה למטה, 3 x 30 שניות","הרמת כתפיים בעמידת ידיים בקיר: דוחפים את הכתפיים לכיוון האוזניים, 3 x 10 חזרות"],
 elbow:["פלאנק עם ידיים נעולות לגמרי: 3 x 30 שניות","עמידת ידיים בקיר עם דגש על נעילת הידיים: 3 x 20 שניות"],
 sway:["החזקות קצרות בקיר: 8 x 10 שניות עם מנוחה בין סט לסט","תרגול יציאה בטוחה (גלגול קדימה) כדי לא לפחד ולהתמקד באיזון"]};
const KEEP={banana:"קו גוף ישר: האגן מעל הכתפיים והקרסוליים. תמשיך לכווץ ישבן ובטן.",lean:"איזון טוב מעל הידיים. תמשיך עם לחץ עדין באצבעות.",
 shoulder:"כתפיים פתוחות. תמשיך לדחוף גבוה, אוזניים בין הידיים.",elbow:"ידיים נעולות וישרות. תמשיך לדחוף את הרצפה.",sway:"יציבות טובה, כמעט בלי התנדנדות. תשמור על לחץ קבוע."};
async function replay(fr,v,w,h,k,ser,fps,mid,windowFrames,poseTimes=fr.map((_,i)=>.05+i/fps)){
 stopReplay();
 const displayFrames=smoothDisplayTrack(fr,poseTimes);
 let disposed=false,videoFrameHandle=null,animationHandle=null,resizeObserver=null;
 const cancelFrame=()=>{if(videoFrameHandle!==null)v.cancelVideoFrameCallback?.(videoFrameHandle);if(animationHandle!==null)cancelAnimationFrame(animationHandle);videoFrameHandle=null;animationHandle=null;};
 stopReplay=()=>{disposed=true;cancelFrame();resizeObserver?.disconnect();};
 ser=fr.map(()=>null);
 v.pause();const has=ser.some(x=>x!=null);$("tl").style.display=has?"block":"none";$("tlLabel").style.display=has?"block":"none";
 const cv=$("cv");cv.width=w;cv.height=h;const c=cv.getContext("2d"),tl=$("tl"),tc=tl.getContext("2d"),sl=$("scrub");
 tl.width=600;tl.height=120;
 const N=ser.length,X=i=>i/Math.max(1,N-1)*600,Y=s=>112-s;
 const start=windowFrames?.start??0,end=windowFrames?.end??N-1;
 sl.min=start;sl.max=end;sl.step=.01;
 $("replayTrimNotice").textContent=windowFrames?.fullVideo?"מוצג הסרטון המלא לבדיקת ההחזקה והיציאה.":windowFrames?(windowFrames.observedStart&&windowFrames.observedEnd?"ניגון הקטע מתחילת העלייה שזוהתה עד הירידה שזוהתה.":"מוצג הסרטון המלא לבדיקת ההחזקה והיציאה. "+(!windowFrames.observedStart?"תחילת העלייה לא זוהתה בביטחון. ":"")+(!windowFrames.observedEnd?"הירידה לא זוהתה בביטחון.":"")):"גבולות התרגיל אינם מזוהים בביטחון; מוצג הסרטון המלא.";
 const draw=(p,mediaTime=v.currentTime)=>{
  p=Math.max(start,Math.min(end,p));c.drawImage(v,0,0,w,h);
  const time=mediaTime;
  const rawPose=poseAtTime(fr,poseTimes,time);
  analysisUI.joints(rawPose,rawPose,0);
  if($("showSkeleton").checked)drawPoseOverlay(c,poseAtTime(displayFrames,poseTimes,time),{width:w,height:h,advanced:$("advancedOverlay").checked});
  tc.clearRect(0,0,600,120);tc.strokeStyle="rgba(128,138,160,.5)";tc.lineWidth=1;
  [0,50,80,100].forEach(g=>{tc.beginPath();tc.moveTo(0,Y(g));tc.lineTo(600,Y(g));tc.stroke()});
  tc.strokeStyle="#B6FF4A";tc.lineWidth=2.5;let pen=false;tc.beginPath();
  ser.forEach((s,q)=>{if(s==null){pen=false;return}pen?tc.lineTo(X(q),Y(s)):tc.moveTo(X(q),Y(s));pen=true});tc.stroke();
  tc.strokeStyle="#ef4444";tc.lineWidth=2;tc.beginPath();tc.moveTo(X(p),4);tc.lineTo(X(p),116);tc.stroke();
  sl.value=p;analysisUI.playback(v.currentTime,v.duration)};
 let rate=1,busy=false,pend=null;
 const frameTime=p=>{const i=Math.floor(p),j=Math.min(N-1,i+1);return poseTimes[i]+(poseTimes[j]-poseTimes[i])*(p-i)};
 const posOf=(t=v.currentTime)=>{let i=0;while(i<N-1&&poseTimes[i+1]<=t)i++;return i<N-1?i+(t-poseTimes[i])/(poseTimes[i+1]-poseTimes[i]):i;};
 const schedule=()=>{if(disposed||v.paused)return;if(v.requestVideoFrameCallback&&v.getClientRects().length)videoFrameHandle=v.requestVideoFrameCallback(loop);else animationHandle=requestAnimationFrame(loop);};
 const loop=(_now,metadata)=>{videoFrameHandle=null;animationHandle=null;if(disposed||v.paused)return;const time=metadata?.mediaTime??v.currentTime;if(time>=frameTime(end)){v.pause();void goTo(start);return}draw(posOf(time),time);schedule();};
 const goTo=async p=>{if(disposed)return;pend=p;if(busy)return;busy=true;try{while(pend!=null&&!disposed){const q=Math.max(start,Math.min(end,pend));pend=null;await seek(v,frameTime(q));if(!disposed)draw(q)}}finally{busy=false}};
 const moments=$("replayMoments");moments.replaceChildren();moments.hidden=!windowFrames;
 if(windowFrames){
  const points=[...(windowFrames.observedStart?[[start,"תחילת העלייה"]]:[]),[Math.max(start,Math.min(end,mid)),"רגע המדידה"],...(windowFrames.observedEnd?[[end,"סיום התנועה"]]:[])];
  for(const [frame,label] of points){const button=document.createElement("button");button.type="button";button.className="moment-button";button.textContent=label+" · "+frameTime(frame).toFixed(1)+" שנ׳";button.onclick=()=>{v.pause();goTo(frame)};moments.append(button);}
 }
 const pb=$("play");
 pb.onclick=async()=>{if(v.paused||v.ended){if(v.ended||v.currentTime>=frameTime(end)||v.currentTime<frameTime(start))await goTo(start);v.playbackRate=rate;await v.play();pb.textContent="עצור";schedule()}else v.pause()};
 v.onpause=()=>{cancelFrame();pb.textContent="נגן"};
 $("prev").onclick=()=>{v.pause();goTo(Math.round(posOf())-1)};
 $("next").onclick=()=>{v.pause();goTo(Math.round(posOf())+1)};
 $("spd").onclick=()=>{rate=rate===1?.5:rate===.5?.25:1;v.playbackRate=rate;$("spd").textContent="מהירות ×"+rate};
 sl.oninput=()=>{v.pause();goTo(+sl.value)};
 tl.onclick=e=>{const r=tl.getBoundingClientRect();v.pause();goTo(start+(e.clientX-r.left)/r.width*(end-start))};
 $("showSkeleton").onchange=()=>draw(posOf());
 $("showAngles").onchange=()=>draw(posOf());
 $("advancedOverlay").onchange=()=>draw(posOf());
 if(typeof ResizeObserver==="function"){resizeObserver=new ResizeObserver(()=>{const box=cv.getBoundingClientRect();if(!disposed&&v.paused&&v.readyState>=2&&box.width>0&&box.height>0)draw(posOf())});resizeObserver.observe(cv);}
 pb.textContent="נגן";$("spd").textContent="מהירות ×1";
 await seek(v,frameTime(Math.max(start,Math.min(end,mid))));draw(Math.max(start,Math.min(end,mid)));
}
function drawScoreRadar(res,overall){
 const svg=$("scoreRadar"),detail=$("scoreBreakdown"),ns="http://www.w3.org/2000/svg";
 svg.replaceChildren();detail.replaceChildren();
 // Hold metrics are measured separately from ascent. Never invent ascent metrics.
 const keys=res?["banana","lean","shoulder","elbow",...(res.swayOk?["sway"]:[])]:[];
 const vals=keys.map(key=>({key,label:NAME[key],score:Math.max(0,Math.min(100,res.sc[key])),description:why(key,res)}));
 if(!vals.length){
  svg.setAttribute("aria-label","אין מדדי החזקה זמינים לגרף");
  detail.textContent="הציון מבוסס על שלב העלייה בלבד; לא נמדדו מספיק נתונים לגרף מדדי ההחזקה.";
  svg.hidden=true;return;
 }
 svg.hidden=false;
 svg.setAttribute("aria-label","מדדי החזקה: "+vals.map(v=>v.label+" "+Math.round(v.score)+" מתוך 100").join(", "));
 const N=vals.length,cx=190,cy=180,r=117,axis=i=>-Math.PI/2+2*Math.PI*i/N;
 const at=(i,value)=>{const a=axis(i),d=r*value/100;return[cx+d*Math.cos(a),cy+d*Math.sin(a)]};
 const el=(tag,attributes={},textValue)=>{const node=document.createElementNS(ns,tag);Object.entries(attributes).forEach(([key,value])=>node.setAttribute(key,String(value)));if(textValue!==undefined)node.textContent=textValue;svg.appendChild(node);return node};
 const pts=p=>vals.map((_,i)=>at(i,p).map(v=>v.toFixed(2)).join(",")).join(" ");
 [25,50,75,100].forEach((level)=>el("polygon",{points:pts(level),fill:level===100?"#17211A":"none",stroke:"#344637","stroke-width":level===100?1.8:1}));
 vals.forEach((v,i)=>{const p=at(i,100);el("line",{x1:cx,y1:cy,x2:p[0],y2:p[1],stroke:"#334635","stroke-width":1.3})});
 el("polygon",{points:vals.map((v,i)=>at(i,v.score).map(x=>x.toFixed(2)).join(",")).join(" "),fill:"rgba(182,255,74,.20)",stroke:"#B6FF4A","stroke-width":3.6,"stroke-linejoin":"round"});
 vals.forEach((v,i)=>{const p=at(i,v.score);el("circle",{cx:p[0],cy:p[1],r:4.5,fill:"#B6FF4A",stroke:"#10200C","stroke-width":2});
  const end=at(i,124),anchor=end[0]<cx-12?"end":end[0]>cx+12?"start":"middle";
  const y=end[1]+(end[1]<cy-10?-3:end[1]>cy+10?10:4);
  el("text",{x:end[0],y,"text-anchor":anchor,fill:"#DCE9D3","font-size":13,"font-weight":700,"font-family":"Rubik,Arial,sans-serif"},v.label);
  const item=document.createElement("div");item.className="metric-row";
  const head=document.createElement("div");head.className="metric-row-head";
  const name=document.createElement("span");name.textContent=v.label;
  const number=document.createElement("strong");number.textContent=Math.round(v.score)+"/100";
  head.append(name,number);item.append(head);
  const bar=document.createElement("div");bar.className="bar";const fill=document.createElement("i");fill.style.width=v.score+"%";fill.style.background="var(--lime)";bar.append(fill);item.append(bar);
  const reason=document.createElement("p");reason.textContent=v.description;item.append(reason);detail.append(item);
 });
}
async function show(res,fr,v,w,h,overall,poseTimes){
 $("score").textContent=overall;analysisUI.result(overall,res);
 $("hold").textContent="ציון טכניקה בלבד · "+(res?"הגרף מציג את מדדי ההחזקה שנמדדו.":"לא נמדדה החזקה מספקת.");
 $("holdDuration").hidden=!res;
 if(res)$("holdDuration").textContent="זמן החזקה מזוהה: "+(Math.round(res.hold*10)/10).toFixed(1)+" שניות (הערכה מתוך הדגימות)";
 drawScoreRadar(res,overall);
 const fps=res?.fps||10;
 const k=res?.k||K[sideOf(fr)];
 const trim=observedExerciseWindow(fr,fps,res);
 if(trim){trim.start=0;trim.end=fr.length-1;trim.observedStart=false;trim.observedEnd=false;trim.fullVideo=true;}
 await replay(fr,v,w,h,k,null,fps,res?.mid||Math.floor(fr.length/2),trim,poseTimes);
 $("out").style.display="block";
}
