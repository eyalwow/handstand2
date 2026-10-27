"use strict";
// Server-only Gemini key, never exposed to frontend or git.
// Best-effort per-instance throttling only. Keep Google API billing disabled for this prototype.
const VALID_DRILLS=new Set(["hollow","wallLine","toePull","finger","shoulderStretch","shrug","plank","kick","entry"]);
const VALID_METRICS=new Set(["hold_banana","hold_lean","hold_shoulder","hold_elbow","hold_sway","entry_reach","entry_arch","entry_shoulder","entry_elbow"]);
const hits=new Map();
const send=(r,s,o)=>r.status(s).setHeader("Cache-Control","no-store").json(o);
const validN=(v,min,max)=>typeof v==="number"&&Number.isFinite(v)&&v>=min&&v<=max;
function valid(e){
 if(!e||typeof e!=="object"||Array.isArray(e))return false;
 if(!Array.isArray(e.groundedProblems)||e.groundedProblems.length>6)return false;
 if(!Array.isArray(e.allowedExerciseIds)||e.allowedExerciseIds.length<1||e.allowedExerciseIds.length>9||
    e.allowedExerciseIds.some(k=>!VALID_DRILLS.has(k)))return false;
 if(e.hold!=null&&(!validN(e.hold.durationSeconds,0,600)||!validN(e.hold.score,0,100)))return false;
 if(e.entry!=null&&!validN(e.entry.score,0,100))return false;
 if(e.strength!=null&&(!VALID_METRICS.has(e.strength.key)||!validN(e.strength.score,80,100)))return false;
 return e.groundedProblems.every(p=>p&&VALID_METRICS.has(p.key)&&validN(p.score,0,100)&&
   typeof p.finding==="string"&&p.finding.length<275&&typeof p.correction==="string"&&p.correction.length<275);
}
const RULES=[
 "You are a careful calisthenics handstand coach. Write fluent Hebrew for the trainee.",
 "You have ONLY 2D pose estimates, not video footage; never claim to have watched it.",
 "Never invent measurements, diagnosis, injury, anatomy, exact root causes, finger pressure, or direction not measured.",
 "Select up to 2 key observations from groundedProblems; lower scores indicate greater concern. Return at most 2 drills.",
 "Write simple, concise, encouraging Hebrew. Do not include numeric values, angles, percentages, scores or medical claims.",
 "Exercise IDs MUST belong to allowedExerciseIds. Do not prescribe unlisted exercises or set/repetition counts.",
 "When groundedStrength is present, return strength with that exact key and one brief encouraging Hebrew sentence describing ONLY that strength. Include the exact Hebrew phrase בחלק שנמדד in that sentence. Otherwise omit strength and do not invent praise about technique.",
 "Limit all claims to the observed portion, never the whole exercise/video. Do not infer muscle tension/activation, effort, pain or intention from pose scores. Avoid boilerplate praise; write specifically about the supplied metric keys.",
 "Only discuss phases present in hold/entry; missing phases were not observed and must never be treated as mistakes.",
 "If no grounded problems, observations must be empty; recommend safe maintenance and good habits.",
 "Advise a stable wall and clear surface; stop if painful. Return valid JSON ONLY.",
 'Shape: {"strength":{"key":"groundedStrength.key only, or null","text":"one evidence-based positive in Hebrew"},"summary":"Hebrew","observations":[{"key":"metric key","finding":"measured value in Hebrew","correction":"one specific cue"}],"drills":[{"id":"allowed exercise ID","reason":"specific link to weakness"}]}'
].join("\n");
module.exports=async function handler(req,res){
 if(req.method==="GET")return send(res,200,{enabled:!!process.env.GEMINI_API_KEY});
 if(req.method!=="POST")return send(res,405,{message:"Method not allowed"});
 if(!process.env.GEMINI_API_KEY)return send(res,503,{message:"Gemini עדיין לא הוגדר על ידי בעל האתר."});
 const origin=req.headers.origin;
 if(origin){try{if(new URL(origin).host!==req.headers.host)return send(res,403,{message:"Origin not allowed"})}catch{return send(res,403,{message:"Origin not allowed"})}}
 const ip=String(req.headers["x-real-ip"]||req.headers["x-forwarded-for"]||"unknown").split(",")[0].slice(0,100);
 const now=Date.now();
 if(hits.size>=500){
  for(const[k,v]of hits)if(v.until<now)hits.delete(k);
  if(hits.size>=500&&!hits.has(ip))return send(res,429,{message:"השירות עמוס כרגע. אפשר לנסות שוב בעוד כמה דקות."});
 }
 let hit=hits.get(ip)||{n:0,until:now+300000};
 if(hit.until<now)hit={n:0,until:now+300000};
 hit.n++;hits.set(ip,hit);
 if(hit.n>5)return send(res,429,{message:"חרגת ממספר הניתוחים הזמין. נסה בעוד כמה דקות."});
 if(!req.body||JSON.stringify(req.body).length>9500||!valid(req.body.evidence))return send(res,400,{message:"נתוני המדידה לא תקינים."});
 const e=req.body.evidence;
 const allowed=new Set(e.allowedExerciseIds);
 const permit=new Set(e.groundedProblems.map(p=>p.key));
 // Explicit allowlist: never forward extra fields, free text, raw video, images or landmark arrays.
 const safe={
  groundedStrength:e.strength?{key:e.strength.key,score:e.strength.score}:null,
  hold:e.hold?{durationSeconds:e.hold.durationSeconds,score:e.hold.score}:null,
  entry:e.entry?{score:e.entry.score}:null,
  groundedProblems:e.groundedProblems.map(({key,score})=>({key,score})),
  allowedExerciseIds:[...new Set(e.allowedExerciseIds)],
  note:"Single 2D view; these are estimates."
 };
 const model=String(process.env.GEMINI_MODEL||"gemini-3.5-flash-lite");
 if(!["gemini-3.5-flash-lite","gemini-3.6-flash","gemini-3.8-flash"].includes(model))return send(res,500,{message:"Invalid model"});
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),24000);
 try{
  const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent",{
   method:"POST",signal:controller.signal,
   headers:{"Content-Type":"application/json","x-goog-api-key":process.env.GEMINI_API_KEY},
   body:JSON.stringify({systemInstruction:{parts:[{text:RULES}]},
    contents:[{role:"user",parts:[{text:JSON.stringify(safe)}]}],
    generationConfig:{responseMimeType:"application/json",temperature:0.25,maxOutputTokens:2000}})
  });
  if(!response.ok)return send(res,response.status===429?429:503,{
   message:response.status===429?"השירות הגיע למגבלת שימוש זמנית. נסה מאוחר יותר.":"Gemini לא זמין כרגע. המשוב המקומי עדיין עובד."
  });
  const responseJson=await response.json();
  const raw=responseJson?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("");
  if(!raw)return send(res,502,{message:"Gemini לא החזיר משוב."});
  let parsed;try{parsed=JSON.parse(raw)}catch{return send(res,502,{message:"Gemini החזיר תשובה לא תקינה."})}
  if(typeof parsed?.summary!=="string"||!Array.isArray(parsed?.drills)||!Array.isArray(parsed?.observations))return send(res,502,{message:"מבנה תשובת Gemini לא תקין."});
  const short=x=>typeof x==="string"?x.trim().slice(0,330):"";
  // Generative claims with numbers or medical diagnoses are unsupported; prefer local fallback.
  const safeText=x=>{const t=short(x);return t&&!/[0-9٠-٩۰-۹°%]|אבחנ|פציעה|מחלה|דלקת|לאורך כל|בכל (?:התרגיל|הסרטון)|כל הזמן|מההתחלה ועד הסוף|שרירים מתוחים|גוף.{0,12}מתוח/.test(t)?t:""};
  const seen=new Set();
  const observations=parsed.observations.filter(o=>o&&permit.has(o.key)&&!seen.has(o.key)&&safeText(o.correction)&&seen.add(o.key)).slice(0,2)
   .map(o=>({key:o.key,finding:e.groundedProblems.find(p=>p.key===o.key).finding,correction:short(o.correction)}));
  const seenDrills=new Set();
  const drills=parsed.drills.filter(o=>o&&allowed.has(o.id)&&!seenDrills.has(o.id)&&safeText(o.reason)&&seenDrills.add(o.id)).slice(0,3)
   .map(o=>({id:o.id,reason:short(o.reason)}));
  if(!safeText(parsed.summary)||!drills.length||(e.groundedProblems.length&&!observations.length))return send(res,502,{message:"Gemini לא החזיר המלצות מבוססות מדידה."});
  const strength=e.strength&&parsed.strength?.key===e.strength.key&&safeText(parsed.strength.text)&&parsed.strength.text.includes("בחלק שנמדד")?{key:e.strength.key,text:safeText(parsed.strength.text)}:null;
  return send(res,200,{summary:short(parsed.summary),strength,observations,drills});
 }catch{return send(res,503,{message:"Gemini לא זמין כרגע. המשוב המקומי נשאר זמין."})}
 finally{clearTimeout(timer)}
};
