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
 return e.groundedProblems.every(p=>p&&VALID_METRICS.has(p.key)&&validN(p.score,0,100)&&
   typeof p.finding==="string"&&p.finding.length<275&&typeof p.correction==="string"&&p.correction.length<275);
}
const RULES=[
 "You are a careful calisthenics handstand coach. Write fluent Hebrew for the trainee.",
 "You have ONLY 2D pose estimates, not video footage; never claim to have watched it.",
 "Never invent measurements, diagnosis, injury, anatomy, exact root causes, finger pressure, or direction not measured.",
 "Select up to 3 key observations from groundedProblems, with concrete measured evidence. Return at most 3 drills.",
 "Exercise IDs MUST belong to allowedExerciseIds. Do not prescribe unlisted exercises or set/repetition counts.",
 "If no grounded problems, observations must be empty; recommend safe maintenance and good habits.",
 "Advise a stable wall and clear surface; stop if painful. Return valid JSON ONLY.",
 'Shape: {"summary":"Hebrew","observations":[{"key":"metric key","finding":"measured value in Hebrew","correction":"one specific cue"}],"drills":[{"id":"allowed exercise ID","reason":"specific link to weakness"}]}'
].join("\n");
module.exports=async function handler(req,res){
 if(req.method==="GET")return send(res,200,{enabled:!!process.env.GEMINI_API_KEY});
 if(req.method!=="POST")return send(res,405,{message:"Method not allowed"});
 if(!process.env.GEMINI_API_KEY)return send(res,503,{message:"Gemini עדיין לא הוגדר על ידי בעל האתר."});
 const origin=req.headers.origin;
 if(origin){try{if(new URL(origin).host!==req.headers.host)return send(res,403,{message:"Origin not allowed"})}catch{return send(res,403,{message:"Origin not allowed"})}}
 const ip=String(req.headers["x-real-ip"]||req.headers["x-forwarded-for"]||"unknown").split(",")[0].slice(0,100);
 const now=Date.now();
 if(hits.size>500)for(const[k,v]of hits)if(v.until<now)hits.delete(k);
 let hit=hits.get(ip)||{n:0,until:now+300000};
 if(hit.until<now)hit={n:0,until:now+300000};
 hit.n++;hits.set(ip,hit);
 if(hit.n>5)return send(res,429,{message:"חרגת ממספר הניתוחים הזמין. נסה בעוד כמה דקות."});
 if(!req.body||JSON.stringify(req.body).length>9500||!valid(req.body.evidence))return send(res,400,{message:"נתוני המדידה לא תקינים."});
 const e=req.body.evidence;
 const allowed=new Set(e.allowedExerciseIds);
 const permit=new Set(e.groundedProblems.map(p=>p.key));
 const safe={hold:e.hold??null,entry:e.entry??null,groundedProblems:e.groundedProblems,
  allowedExerciseIds:e.allowedExerciseIds,note:"Single 2D view; these are estimates."};
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
   message:response.status===429?"המכסה החינמית של Gemini הסתיימה. נסה מאוחר יותר.":"Gemini לא זמין כרגע. המשוב המקומי עדיין עובד."
  });
  const responseJson=await response.json();
  const raw=responseJson?.candidates?.[0]?.content?.parts?.map(p=>p.text||"").join("");
  if(!raw)return send(res,502,{message:"Gemini לא החזיר משוב."});
  let parsed;try{parsed=JSON.parse(raw)}catch{return send(res,502,{message:"Gemini החזיר תשובה לא תקינה."})}
  if(typeof parsed?.summary!=="string"||!Array.isArray(parsed?.drills)||!Array.isArray(parsed?.observations))return send(res,502,{message:"מבנה תשובת Gemini לא תקין."});
  const short=x=>typeof x==="string"?x.trim().slice(0,330):"";
  const observations=parsed.observations.filter(o=>o&&permit.has(o.key)&&short(o.correction)).slice(0,3)
   .map(o=>({key:o.key,finding:e.groundedProblems.find(p=>p.key===o.key).finding,correction:short(o.correction)}));
  const drills=parsed.drills.filter(o=>o&&allowed.has(o.id)&&short(o.reason)).slice(0,3)
   .map(o=>({id:o.id,reason:short(o.reason)}));
  if(!drills.length||(e.groundedProblems.length&&!observations.length))return send(res,502,{message:"Gemini לא החזיר המלצות מבוססות מדידה."});
  return send(res,200,{summary:short(parsed.summary),observations,drills});
 }catch{return send(res,503,{message:"Gemini לא זמין כרגע. המשוב המקומי נשאר זמין."})}
 finally{clearTimeout(timer)}
};
