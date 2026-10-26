import {getSharedGemini,geminiReady,checkGeminiStatus} from "./server-gemini.js";
// Handstand AI Coach: only numeric pose measurements go to Gemini, never photos/video.
// Backend holds shared Gemini secret; app users never enter API keys.
// When Firebase is not configured or quota is exhausted, local measurements still work.
const $=id=>document.getElementById(id);
const n=(x,p=1)=>Number(Number(x).toFixed(p));
const catalog={
 hollow:{name:"הולו בודי",dose:"3 × 15–25 שניות",cue:"לשמור בטן אסופה וצלעות פנימה בלי להקשת גב"},
 wallLine:{name:"עמידת ידיים עם הפנים לקיר",dose:"3 × 15–25 שניות",cue:"לדחוף את הרצפה ולסדר כתפיים, אגן ורגליים על קו אחד"},
 toePull:{name:"ניתוק קל של הרגליים מהקיר",dose:"3 × 3–5 ניסיונות",cue:"לנסות להתאזן בעדינות לשנייה ולהחזיר רגליים לקיר"},
 finger:{name:"העברות משקל בכפות הידיים ליד קיר",dose:"3 × 20 שניות",cue:"לתקן שיווי משקל בשינויים קטנים בלחץ האצבעות"},
 shoulderStretch:{name:"פתיחת כתפיים ליד קיר",dose:"2 × 20–30 שניות",cue:"לפתוח כתפיים בלי להגדיל את הקשת בגב"},
 shrug:{name:"דחיפות שכמות בעמידת ידיים נתמכת",dose:"2 × 6–8 חזרות",cue:"לשמור מרפקים ישרים ולדחוף כתפיים גבוה בעזרת הקיר"},
 plank:{name:"פלאנק בזרועות ישרות",dose:"3 × 20–30 שניות",cue:"לשמור מרפקים ישרים עם שכמות יציבות"},
 kick:{name:"בעיטה מדורגת לעמידה ליד קיר",dose:"3 × 3–5 ניסיונות לכל רגל",cue:"להעלות אגן מעל כתפיים ולהאט את הבעיטה"},
 entry:{name:"עלייה הדרגתית בתמיכת קיר",dose:"3 × 3–4 ניסיונות",cue:"לתרגל הגעה לקו אנכי בעזרת קיר יציב"}
};
const exerciseMap={
 hold_banana:["hollow","wallLine"],hold_lean:["finger","toePull"],
 hold_shoulder:["shoulderStretch","shrug"],hold_elbow:["plank","wallLine"],
 hold_sway:["finger","toePull"],entry_reach:["kick","entry"],
 entry_arch:["hollow","wallLine"],entry_shoulder:["shoulderStretch","shrug"],
 entry_elbow:["plank","entry"]
};
const names={
 hold_banana:"קו הגוף",hold_lean:"איזון",hold_shoulder:"כתפיים",hold_elbow:"מרפקים",
 hold_sway:"יציבות",entry_reach:"הגעה לאנך בעלייה",entry_arch:"קו הגוף בעלייה",
 entry_shoulder:"כתפיים בעלייה",entry_elbow:"מרפקים בעלייה"
};
function identify(res,ent){
 const out=[];
 const add=(key,score,finding,correction)=>{
   if(!Number.isFinite(score)||score>=80)return;
   out.push({key,score:Math.round(score),finding,correction,drills:exerciseMap[key]});
 };
 if(res){
   const v=res.val,s=res.sc;
   add("hold_banana",s.banana,v.banana>0?(s.banana<50?"קו הגוף נראה מקושת.":"קו הגוף נראה מעט מקושת."):"האגן נראה מאחורי קו הגוף.","אסוף בטן וישבן ונסה לשמור על קו יציב.");
   add("hold_lean",s.lean,s.lean<50?"קו הגוף נוטה ביחס לידיים.":"קו הגוף נוטה מעט ביחס לידיים.","דחוף דרך הכתפיים ותרגל תיקוני איזון קטנים.");
   add("hold_shoulder",s.shoulder,"נראה שיש מקום לפתוח מעט את הכתפיים.","דחוף את הרצפה והארך את הידיים לכיוון האוזניים, בלי להקשת את הגב.");
   add("hold_elbow",s.elbow,"נראית כפיפה מסוימת בידיים.","תרגל שמירה על זרועות ישרות עם תמיכה ליד קיר.");
   if(res.swayOk&&res.hold>=2)add("hold_sway",s.sway,"נראית תנועה במהלך ההחזקה.","בצע החזקות קצרות ותרגל תיקונים קטנים באצבעות.");
 }
 if(ent){
   const s=ent.sc;
   add("entry_reach",s.reach,"בעלייה נראה שקשה להגיע לקו יציב.","נסה בעיטה הדרגתית ליד קיר כשהכתפיים מעל הידיים.");
   if(ent.arch!=null)add("entry_arch",s.arch,"בעלייה נראה שקו הגוף משתנה.","אסוף בטן לפני הבעיטה.");
   add("entry_shoulder",s.shoulder,"בעלייה נראה שהכתפיים נסגרות מעט.","דחוף את הרצפה מההתחלה.");
   add("entry_elbow",s.elbow,"נראית כפיפה בידיים במהלך העלייה.","שמור על זרועות ישרות בעלייה, בעזרת קיר.");
 }
 const hold=out.filter(i=>i.key.startsWith("hold_")).sort((a,b)=>a.score-b.score);
 const entry=out.filter(i=>i.key.startsWith("entry_")).sort((a,b)=>a.score-b.score);
 const duplicate={entry_arch:"hold_banana",entry_shoulder:"hold_shoulder",entry_elbow:"hold_elbow",entry_reach:"hold_lean"};
 return [...hold,...entry.filter(i=>i.score<55&&!hold.some(h=>h.key===duplicate[i.key])).slice(0,1)].slice(0,3);
}
function evidence(res,ent,issues){
 const allowed=[...new Set(issues.slice(0,4).flatMap(i=>i.drills))];
 return {
  kind:"2D side-view pose tracking; no raw video supplied",
  hold:res?{durationSeconds:n(res.hold),score:Math.round(res.total)}:null,
  entry:ent?{score:n(ent.total)}:null,
  groundedProblems:issues.slice(0,6).map(i=>({key:i.key,score:i.score,finding:i.finding,correction:i.correction})),
  allowedExerciseIds:allowed.length?allowed:["wallLine","finger"],
  note:"Pose and angles are approximations in one 2D camera plane. Avoid diagnosing injuries; safe wall and clear floor needed."
 };
}
function local(issues,measure){
 const priorities=issues.slice(0,3),first=priorities[0],second=priorities[1];
 const summary=first
   ?"יש כאן בסיס להתקדם ממנו. כדאי להתחיל בתרגול "+names[first.key]+"."
   :"העמידה נראית יציבה במדדים שזוהו. המשך לתרגל שליטה וקו גוף עקבי.";
 const choices=[...new Set(priorities.flatMap(i=>i.drills))].filter(id=>measure.allowedExerciseIds.includes(id));
 if(!choices.length)choices.push(...measure.allowedExerciseIds);
 const drills=choices.slice(0,3).map(id=>{const issue=priorities.find(i=>i.drills.includes(id));return{id,reason:issue?"מתמקד במדד "+names[issue.key]+" שנמצא חלש.":"לחיזוק שליטה בסיסית בקו ובאיזון."}});
 const quality=(!measure.hold||measure.hold.durationSeconds<2)
  ?"ההחזקה קצרה, ולכן התוצאה נותנת תמונה חלקית. נסו סרטון נוסף עם החזקה ארוכה יותר."
  :"המשוב מבוסס על זיהוי הגוף בסרטון. זווית הצילום יכולה להשפיע על התוצאה.";
 return{summary,observations:priorities.map(i=>({key:i.key,finding:i.finding,correction:i.correction})),drills,quality};
}
function validate(raw,measure,issues){
 if(!raw||typeof raw.summary!=="string")throw Error("Gemini לא החזיר תשובה בפורמט הנדרש.");
 const clean=v=>typeof v==="string"?v.trim().slice(0,350):"";
 const metrics=new Set(issues.slice(0,6).map(i=>i.key)),allowed=new Set(measure.allowedExerciseIds);
 const byKey=new Map(issues.map(i=>[i.key,i]));
 const observationKeys=new Set();
 const observations=(Array.isArray(raw.observations)?raw.observations:[])
  .filter(o=>o&&metrics.has(o.key)&&clean(o.finding)&&clean(o.correction)&&!observationKeys.has(o.key)&&observationKeys.add(o.key))
  .slice(0,3).map(o=>({key:o.key,finding:byKey.get(o.key).finding,correction:byKey.get(o.key).correction}));
 const seen=new Set();
 const drills=(Array.isArray(raw.drills)?raw.drills:[])
  .filter(o=>o&&allowed.has(o.id)&&clean(o.reason)&&!seen.has(o.id)&&seen.add(o.id))
  .slice(0,3).map(o=>({id:o.id,reason:clean(o.reason)}));
 if(!drills.length||(issues.length&&!observations.length))throw Error("Gemini החזיר המלצות שלא נתמכו במדדים שנמדדו.");
 const fallback=local(issues,measure);
 for(const d of fallback.drills)if(drills.length<2&&!seen.has(d.id)){drills.push(d);seen.add(d.id)}
 return{summary:fallback.summary,observations,drills:drills.map(d=>({id:d.id,reason:fallback.drills.find(x=>x.id===d.id)?.reason||"לתרגול שליטה בהתאם למדדים."})),quality:fallback.quality};
}
function p(value,cls){const e=document.createElement("p");e.className=cls;e.textContent=value;return e}
function render(plan,ai){
 $("coachBadge").textContent=ai?"Gemini AI":"משוב מדידות";
 $("coachSummary").textContent=plan.summary;
 const obs=$("coachObservations"),dr=$("coachDrills");obs.replaceChildren();dr.replaceChildren();
 plan.observations.forEach((o,i)=>{
  const block=document.createElement("article");block.className="coach-observation";
  block.appendChild(p((i+1)+". "+names[o.key],"coach-observation-title"));
  block.appendChild(p(o.finding,"coach-observation-finding"));
  block.appendChild(p("מה לשנות: "+o.correction,"coach-observation-cue"));
  obs.appendChild(block);
 });
 plan.drills.forEach((o,i)=>{
  const d=catalog[o.id];if(!d)return;
  const block=document.createElement("article");block.className="coach-drill";
  block.appendChild(p(String(i+1).padStart(2,"0")+"  "+d.name,"coach-drill-name"));
  block.appendChild(p(d.dose,"coach-dose"));
  block.appendChild(p(d.cue,"coach-drill-focus"));
  dr.appendChild(block);
 });
 $("coachQuality").textContent=plan.quality;
 $("coachPanel").hidden=false;
}
let current=null,serial=0;
const consentKey="handstand-lab-ai-consent-v1";
let consent=false;
function cancel(){
 serial++;
 $("geminiBtn").disabled=!consent||!geminiReady();
}
export function resetCoachFeedback(){
 cancel();current=null;$("coachPanel").hidden=true;$("geminiStatus").textContent="";
}
export function setupCoach(){
 const btn=$("geminiBtn"),check=$("aiConsent");
 try{consent=localStorage.getItem(consentKey)==="yes"}catch{}
 check.checked=consent;
 check.addEventListener("change",()=>{
  consent=check.checked;
  try{if(consent)localStorage.setItem(consentKey,"yes");else localStorage.removeItem(consentKey)}catch{}
  cancel();
  if(!consent&&current){
   render(local(current.issues,current.measure),false);
   $("geminiStatus").textContent="משוב מקומי פעיל. ניתן להפעיל שוב את משוב ה־AI בכל עת.";
  }else if(consent&&current&&geminiReady())void runGemini();
 });
 btn.addEventListener("click",()=>void runGemini());
 btn.disabled=true;
 void checkGeminiStatus().then(()=>{
  btn.disabled=!consent||!geminiReady();
  if(consent&&geminiReady()&&current)void runGemini();
 }).catch(()=>{btn.disabled=true});
}
export function showCoachFeedback(res,ent){
 cancel();
 const issues=identify(res,ent),measure=evidence(res,ent,issues);
 current={issues,measure};
 render(local(issues,measure),false);
 if(consent&&geminiReady()){
  $("geminiStatus").textContent="מכין משוב אישי עם Gemini…";
  void runGemini();
 }else{
  $("geminiStatus").textContent=consent?"משוב מקומי פעיל; שירות ה־AI אינו זמין כרגע.":"משוב מקומי פעיל. אפשר להפעיל משוב AI בהגדרות הפרטיות למעלה.";
 }
}
async function runGemini(){
 if(!current||!consent||!geminiReady())return;
 const id=++serial,button=$("geminiBtn"),status=$("geminiStatus");
 button.disabled=true;
 const {issues,measure}=current;
 let timer;
 status.textContent="מכין משוב אישי…";
 try{
  const response=await Promise.race([
   getSharedGemini(measure),
   new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("השירות לא השיב בזמן. נסה שוב.")),35000)})
  ]);
  if(id!==serial||!consent)return;
  const plan=validate(response,measure,issues);
  render(plan,true);
  status.textContent="המשוב נעזר ב־Gemini. הסרטון עצמו נשאר במכשיר.";
 }catch(err){
  if(id!==serial)return;
  const msg=String(err?.message||"שגיאה בחיבור");
  const isQuota=/429|quota|resource.exhausted|rate.limit/i.test(msg);
  render(local(issues,measure),false);
  status.textContent=(isQuota?"שירות ה־AI הגיע למגבלת השימוש. ":"שירות ה־AI אינו זמין כרגע. ")+"המשוב המקומי נשאר זמין.";
 }finally{
  clearTimeout(timer);
  if(id===serial)button.disabled=!consent||!geminiReady();
 }
}

// Named exports support automated safety tests without calling Gemini.
export {identify as analyzeCoachIssues,evidence as buildCoachEvidence,local as buildCoachLocalPlan,validate as validateCoachResponse};
