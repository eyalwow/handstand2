// Handstand AI Coach: only numeric pose measurements go to Gemini, never photos/video.
// Prototype BYOK: the key stays in the password field for this page session, not in GitHub or storage.
// For production, use a secure server proxy instead of direct browser API requests.
const $=id=>document.getElementById(id);
const model="gemini-2.5-flash";
const url="https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent";
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
   add("hold_banana",s.banana,"סטיית אגן של "+n(Math.abs(v.banana)*100)+"% מאורך הגוף מהקו כתף–קרסול (ציון "+Math.round(s.banana)+"/100).","אסוף בטן וישבן, הכנס צלעות פנימה והחזק קו ישר.");
   add("hold_lean",s.lean,"נטייה של "+n(v.lean)+"° ביחס לאנך (ציון "+Math.round(s.lean)+"/100).","העבר את הכתפיים מעל כפות הידיים ותרגל תיקוני איזון קטנים.");
   add("hold_shoulder",s.shoulder,"חסר משוער של "+n(v.shoulder)+"° בפתיחת הכתף בקירוב דו־ממדי (ציון "+Math.round(s.shoulder)+"/100).","דחוף את הרצפה, הארך את הידיים לכיוון האוזניים בלי להקשת גב.");
   add("hold_elbow",s.elbow,"כפיפה משוערת של "+n(v.elbow)+"° במרפק (ציון "+Math.round(s.elbow)+"/100).","תרגל שמירה על זרועות ישרות עם תמיכה ליד קיר.");
   if(res.swayOk&&res.hold>=2)add("hold_sway",s.sway,"סטיית תקן בתנועת האגן של "+n(v.sway*100)+"% מאורך הגוף (ציון "+Math.round(s.sway)+"/100).","בצע החזקות קצרות ותיקונים קטנים באצבעות.");
 }
 if(ent){
   const s=ent.sc;
   add("entry_reach",s.reach,"המרחק הזוויתי המינימלי מהאנך בזמן העלייה היה בערך "+n(ent.minAng)+"° (ציון "+Math.round(s.reach)+"/100).","נסה בעיטה הדרגתית ליד קיר כשהכתפיים עוברות מעל הידיים.");
   if(ent.arch!=null)add("entry_arch",s.arch,"הסטייה המשוערת של האגן בעלייה היא "+n(Math.abs(ent.arch)*100)+"% מאורך הגוף (ציון "+Math.round(s.arch)+"/100).","הכנס צלעות פנימה כבר לפני הבעיטה.");
   add("entry_shoulder",s.shoulder,"ציון פתיחת הכתפיים בעלייה "+Math.round(s.shoulder)+"/100.","דחוף את הרצפה ושמור כתפיים פתוחות מההתחלה.");
   add("entry_elbow",s.elbow,"ציון יישור מרפקים בעלייה "+Math.round(s.elbow)+"/100.","שמור על זרועות ישרות בעלייה, בעזרת קיר.");
 }
 return out.sort((a,b)=>a.score-b.score);
}
function evidence(res,ent,issues){
 const d=res?.diagnostics;
 const allowed=[...new Set(issues.slice(0,4).flatMap(i=>i.drills))];
 return {
  kind:"2D side-view pose tracking; no raw video supplied",
  hold:res?{
   durationSeconds:n(res.hold),score:Math.round(res.total),
   scores:Object.fromEntries(Object.entries(res.sc).filter(([k])=>k!=="sway"||(res.swayOk&&res.hold>=2)).map(([k,v])=>[k,Math.round(v)])),
   pelvisOffsetPercent:n(Math.abs(res.val.banana)*100),
   bodyLeanDegrees:n(res.val.lean),
   shoulderDeficitDegrees:n(res.val.shoulder),
   elbowDeficitDegrees:n(res.val.elbow),
   swayStdPercent:res.swayOk&&res.hold>=2?n(res.val.sway*100):null,
   frames:d?.validFrames??null,landmarkVisibilityPercent:d?.visibilityPercent??null,
   timeSegments:d?.thirds??null
  }:null,
  entry:ent?{score:n(ent.total),scores:ent.sc,verticalGapDegrees:n(ent.minAng),reachedVertical:ent.reached,archOffsetPercent:ent.arch==null?null:n(ent.arch*100)}:null,
  groundedProblems:issues.slice(0,6).map(i=>({key:i.key,score:i.score,finding:i.finding,correction:i.correction})),
  allowedExerciseIds:allowed.length?allowed:["wallLine","finger"],
  note:"Pose and angles are approximations in one 2D camera plane. Avoid diagnosing injuries; safe wall and clear floor needed."
 };
}
function local(issues,measure){
 const priorities=issues.slice(0,3),first=priorities[0],second=priorities[1];
 const summary=first
   ?"לפי המדידה הזאת, כדאי להתחיל מ"+names[first.key]+" (ציון "+first.score+"/100). "+(second?"העדיפות השנייה היא "+names[second.key]+".":"התמקד בשיפור אחד בכל אימון.")
   :"המדדים שזוהו בטווח טוב. במקום להמציא ליקוי, עדיף לתרגל שליטה וקו גוף עקבי.";
 const choices=[...new Set(priorities.flatMap(i=>i.drills))].filter(id=>measure.allowedExerciseIds.includes(id));
 if(!choices.length)choices.push(...measure.allowedExerciseIds);
 const drills=choices.slice(0,3).map(id=>{const issue=priorities.find(i=>i.drills.includes(id));return{id,reason:issue?"מתמקד במדד "+names[issue.key]+" שנמצא חלש.":"לחיזוק שליטה בסיסית בקו ובאיזון."}});
 const quality=(!measure.hold||measure.hold.durationSeconds<2||(measure.hold.landmarkVisibilityPercent??100)<65)
  ?"הצילום מספק מידע חלקי: זווית צילום אחת, זמן קצר או זיהוי גוף מוגבל. נסה לצלם מהצד כשכל הגוף נראה."
  :"המידע מבוסס על הערכת שלד דו־ממדית ולא על בדיקת מאמן. אפשר להשוות מול סרטון נוסף אחרי תרגול.";
 return{summary,observations:priorities.map(i=>({key:i.key,finding:i.finding,correction:i.correction})),drills,quality};
}
function validate(raw,measure,issues){
 if(!raw||typeof raw.summary!=="string")throw Error("Gemini לא החזיר תשובה בפורמט הנדרש.");
 const clean=v=>typeof v==="string"?v.trim().slice(0,350):"";
 const metrics=new Set(issues.map(i=>i.key)),allowed=new Set(measure.allowedExerciseIds);
 const observations=(Array.isArray(raw.observations)?raw.observations:[])
  .filter(o=>o&&metrics.has(o.key)&&clean(o.finding)&&clean(o.correction))
  .slice(0,3).map(o=>({key:o.key,finding:clean(o.finding),correction:clean(o.correction)}));
 const drills=(Array.isArray(raw.drills)?raw.drills:[])
  .filter(o=>o&&allowed.has(o.id)&&clean(o.reason))
  .slice(0,3).map(o=>({id:o.id,reason:clean(o.reason)}));
 if(!drills.length||(issues.length&&!observations.length))throw Error("Gemini החזיר המלצות שלא נתמכו במדדים שנמדדו.");
 return{summary:clean(raw.summary),observations,drills,quality:local(issues,measure).quality};
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
  block.appendChild(p("למה התרגיל מתאים: "+o.reason,"coach-drill-reason"));
  dr.appendChild(block);
 });
 $("coachQuality").textContent=plan.quality;
 $("coachPanel").hidden=false;
}
let current=null,serial=0,controller=null;
function cancel(){serial++;if(controller){controller.abort();controller=null}$("geminiBtn").disabled=false}
export function resetCoachFeedback(){cancel();current=null;$("coachPanel").hidden=true;$("geminiStatus").textContent=""}
export function setupCoach(){
 $("geminiBtn").addEventListener("click",()=>runGemini());
 $("geminiKey").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();if(current)void runGemini()}});
}
export function showCoachFeedback(res,ent){
 cancel();
 const issues=identify(res,ent),measure=evidence(res,ent,issues);
 current={issues,measure};
 render(local(issues,measure),false);
 $("geminiStatus").textContent=$("geminiKey").value.trim()
  ?"מכין משוב באמצעות Gemini…"
  :"המשוב שמוצג מבוסס על המדדים שלך. למשוב עם Gemini פתח את הגדרות Gemini והכנס מפתח.";
 if($("geminiKey").value.trim())void runGemini();
}
async function runGemini(){
 if(!current)return;
 const key=$("geminiKey").value.trim(),status=$("geminiStatus");
 if(!key){$("geminiSetup").open=true;status.textContent="צריך להזין מפתח API אישי של Gemini. הוא לא נשמר באתר.";$("geminiKey").focus();return}
 cancel();const id=++serial,ac=new AbortController();controller=ac;
 const button=$("geminiBtn");button.disabled=true;
 const {issues,measure}=current;
 const timer=setTimeout(()=>ac.abort(),30000);
 status.textContent="Gemini מנתח את מדדי הגוף שלך…";
 try{
  const system="You are an expert but cautious handstand coach. Write in clear natural Hebrew, second person. "+
   "You have only numeric 2D pose measurements, not actual video. Never claim to have seen video or measured finger pressure, grip, spine, pain, injury, breathing, or forward/backward lean direction not in evidence. "+
   "Never invent numbers or diagnose injuries. Mention a measured value for every observation. Observation keys must be from groundedProblems. "+
   "Exercise IDs must be ONLY from allowedExerciseIds. Do not suggest invented exercises, sets or reps; the app supplies safe conservative doses. "+
   "Prioritize 1-3 important technique issues and give SPECIFIC one-step cues for each rather than generic praise. "+
   "If no groundedProblems, return zero observations and positive maintenance advice. If measurement is brief or noisy, signal uncertainty in summary. "+
   "Do not infer root causes from one 2D view. Work near a wall and stop if pain. Return JSON.";
  const schema={type:"OBJECT",properties:{
    summary:{type:"STRING"},observations:{type:"ARRAY",maxItems:3,items:{type:"OBJECT",properties:{
      key:{type:"STRING"},finding:{type:"STRING"},correction:{type:"STRING"}
    },required:["key","finding","correction"]}},
    drills:{type:"ARRAY",minItems:1,maxItems:3,items:{type:"OBJECT",properties:{
      id:{type:"STRING"},reason:{type:"STRING"}
    },required:["id","reason"]}}
  },required:["summary","observations","drills"]};
  const response=await fetch(url,{
   method:"POST",signal:ac.signal,
   headers:{"Content-Type":"application/json","x-goog-api-key":key},
   body:JSON.stringify({systemInstruction:{parts:[{text:system}]},
     contents:[{role:"user",parts:[{text:JSON.stringify(measure)}]}],
     generationConfig:{responseMimeType:"application/json",responseSchema:schema,temperature:0.25,maxOutputTokens:1400}})
  });
  let body;try{body=await response.json()}catch{throw Error("לא התקבלה תשובה תקינה מ־Gemini.")}
  if(!response.ok){
   if(response.status===429)throw Error("הגעת למגבלת השימוש של Gemini. נסה מאוחר יותר.");
   if([400,401,403].includes(response.status))throw Error("המפתח לא אושר או שהמודל לא זמין בחשבון שלך. בדוק את המפתח ב־Google AI Studio.");
   throw Error("שגיאת שרת Gemini ("+response.status+").");
  }
  const raw=body?.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("");
  if(!raw)throw Error("Gemini לא החזיר משוב.");
  const plan=validate(JSON.parse(raw),measure,issues);
  if(id!==serial)return;
  render(plan,true);
  status.textContent="המשוב נוצר ב־Gemini ממדדי תנועה בלבד; הסרטון נשאר במכשיר.";
 }catch(err){
  if(id!==serial)return;
  const message=err.name==="AbortError"?"הבקשה ארכה יותר מדי זמן.":err instanceof TypeError?"בעיה בחיבור ל־Gemini מהדפדפן.":err.message;
  render(local(issues,measure),false);
  status.textContent="Gemini לא הצליח להשלים: "+message+" המשוב המקומי עדיין זמין.";
 }finally{
  clearTimeout(timer);if(id===serial){controller=null;button.disabled=false}
 }
}
