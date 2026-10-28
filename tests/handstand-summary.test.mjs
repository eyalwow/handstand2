import test from "node:test";
import assert from "node:assert/strict";
import {overallHandstandScore,observedEntryWindow,bestMeasuredStrength} from "../vercel-app/handstand-summary.js";
import {analyzeCoachIssues,buildCoachEvidence,buildCoachLocalPlan,validateCoachResponse} from "../vercel-app/ai-feedback.js";

test("one score renormalizes missing phases rather than penalizing unseen footage",()=>{
 assert.equal(overallHandstandScore({total:90},null),90);
 assert.equal(overallHandstandScore(null,{total:60}),60);
 assert.equal(overallHandstandScore({total:90},{total:60}),81);
 assert.equal(overallHandstandScore(null,null),null);
 assert.equal(overallHandstandScore({total:NaN},null),null);
});
const frame=(hip,ankle,visibility=1)=>{
 const f=Array.from({length:33},()=>({x:100,y:200,v:visibility}));
 for(const [i,y] of [[15,400],[13,320],[11,240],[23,hip],[27,ankle]])f[i]={x:100,y,v:visibility};
 return f;
};
test("entry detector rejects already-held footage, incomplete ascent and poor tracking",()=>{
 assert.equal(observedEntryWindow(Array.from({length:25},()=>frame(160,80)),10,null),null);
 assert.equal(observedEntryWindow(Array.from({length:25},()=>frame(300,360)),10,null),null);
 const entry=Array.from({length:15},(_,i)=>frame(300-i*8,360-i*18));
 assert.ok(observedEntryWindow(entry,10,null));
 const noisy=entry.map((f,i)=>i%2?null:f);
 assert.equal(observedEntryWindow(noisy,10,null),null);
 assert.equal(observedEntryWindow(entry.map(f=>f.map(p=>({...p,v:.4}))),10,null),null);
});
test("Gemini wording is displayed, grounded findings stay anchored, fabricated keys and numbers do not pass",()=>{
 const res={val:{banana:.11,lean:4,shoulder:0,elbow:0,sway:0},sc:{banana:35,lean:75,shoulder:98,elbow:95,sway:99},total:74,hold:3,swayOk:true};
 const issues=analyzeCoachIssues(res,null),evidence=buildCoachEvidence(res,null,issues);
 const result=validateCoachResponse({
 summary:"בחלק שנמדד הגוף החזיק מנח עמידת ידיים, אך הקו שלו לא היה אחיד בכל רגע. הזיהוי מאפשר להעריך את המנח ולא לקבוע עצמאות ללא תמיכה.\n\nהאזור המרכזי שדורש דיוק הוא מיקום האגן ביחס לכתפיים ולרגליים. הכתפיים והמרפקים נראו עקביים יותר במדדים שנמדדו.\n\nבתרגול הבא כדאי לעבוד על קו ישר עם בטן אסופה. אפשר לבצע חזרות קצרות ליד קיר ולשים לב שלא נפתחת קשת בגב.",
 strength:{key:evidence.strength.key,text:"שמרת על יציבות יפה בחלק שנמדד."},
 observations:[{key:"hold_banana",finding:"invented",correction:"נסה לאסוף את הבטן לפני העלייה."},{key:"invented",finding:"invented",correction:"invented"}],
 drills:[{id:"hollow",reason:"יעזור לך לתרגל בטן אסופה לאורך ההחזקה."}]
 },evidence,issues);
 assert.equal(result.summary,"בחלק שנמדד הגוף החזיק מנח עמידת ידיים, אך הקו שלו לא היה אחיד בכל רגע. הזיהוי מאפשר להעריך את המנח ולא לקבוע עצמאות ללא תמיכה.\n\nהאזור המרכזי שדורש דיוק הוא מיקום האגן ביחס לכתפיים ולרגליים. הכתפיים והמרפקים נראו עקביים יותר במדדים שנמדדו.\n\nבתרגול הבא כדאי לעבוד על קו ישר עם בטן אסופה. אפשר לבצע חזרות קצרות ליד קיר ולשים לב שלא נפתחת קשת בגב.");
 assert.equal(result.observations[0].finding,issues[0].finding);
 assert.equal(result.observations[0].correction,"נסה לאסוף את הבטן לפני העלייה.");
 assert.equal(result.drills[0].reason,"יעזור לך לתרגל בטן אסופה לאורך ההחזקה.");
 assert.ok(result.observations.length<=2 && result.drills.length<=2);
 assert.equal(bestMeasuredStrength(null,null),null);
 assert.equal(bestMeasuredStrength({...res,sc:{banana:20,shoulder:20,elbow:20,sway:20}},null),null);
});

test("local fallback varies equivalent feedback while preserving phase and problem boundaries",()=>{
 const res={val:{banana:.1,lean:4,shoulder:0,elbow:0,sway:0},sc:{banana:30,lean:75,shoulder:90,elbow:95,sway:95},total:70,hold:3,swayOk:true};
 const issues=analyzeCoachIssues(res,null);
 const replies=Array.from({length:4},()=>buildCoachLocalPlan(issues,buildCoachEvidence(res,null,issues)));
 assert.equal(new Set(replies.map(p=>p.observations[0].correction)).size,4);
 for(const reply of replies){
  assert.equal(reply.observations[0].key,"hold_banana");
  assert.ok(reply.observations.every(o=>o.key.startsWith("hold_")));
  assert.ok(reply.observations.length<=2);
 }
});

test("real-video regression: whole-exercise praise is not passed off as measured feedback",()=>{
 const res={val:{banana:0,lean:0,shoulder:0,elbow:0,sway:0},sc:{banana:100,lean:95,shoulder:95,elbow:95,sway:95},total:97,hold:6,swayOk:true};
 const issues=analyzeCoachIssues(res,null),evidence=buildCoachEvidence(res,null,issues);
 const raw={summary:"בחלק שנמדד העמידה נראתה יציבה במרבית המדדים שנקלטו. ההחזקה מאפשרת הערכת מנח אך לא מוכיחה שלא הייתה תמיכה.\n\nקו הגוף היה עקבי בחלק שנמדד, והזרועות נראו ישרות. אין לנו מספיק נתונים כדי לקבוע מה קרה מחוץ למקטע שנקלט.\n\nכדאי להמשיך לתרגל קו אחיד ולצבור ניסיון בשליטה בתנועה. ההמלצות צריכות להתאים ליכולת האמיתית ולא לציון בלבד.",strength:{key:evidence.strength.key,text:"שמרת על גוף ארוך ומתוח לאורך כל התרגיל."},observations:[],drills:[{id:"wallLine",reason:"לתרגול עקביות בקו הגוף."}]};
 const accepted=validateCoachResponse(raw,evidence,issues);
 assert.equal(accepted.strength,evidence.strength.text);
 assert.equal(accepted.source,"gemini");
 const rejected=validateCoachResponse({...raw,summary:"הגוף נשאר ישר לאורך כל התרגיל."},evidence,issues);
 assert.equal(rejected.source,"local");
 assert.ok(!JSON.stringify(rejected).includes("לאורך כל התרגיל"));
});
