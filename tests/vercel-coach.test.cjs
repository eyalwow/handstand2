const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const handler=require("../vercel-app/api/coach.js");
const html=fs.readFileSync("vercel-app/index.html","utf8");
const js=fs.readFileSync("vercel-app/ai-feedback.js","utf8");
const bridge=fs.readFileSync("vercel-app/server-gemini.js","utf8");
const api=fs.readFileSync("vercel-app/api/coach.js","utf8");
const makeRes=()=>({code:200,headers:{},body:null,
 status(n){this.code=n;return this},
 setHeader(k,v){this.headers[k]=v;return this},
 json(obj){this.body=obj;return this}
});
const req=(method,body)=>({method,body,headers:{host:"handstand-lab-coach.vercel.app",origin:"https://handstand-lab-coach.vercel.app","x-real-ip":"198.51.100.42"}});
const measure={
 hold:{durationSeconds:4.2,score:56},
 entry:null,
 groundedProblems:[{key:"hold_banana",score:35,finding:"האגן סטה 8.1% מהקו",correction:"כנס צלעות פנימה"}],
 allowedExerciseIds:["hollow","wallLine"]
};
test("client has no key input, raw video upload to AI, or Gemini key",()=>{
 assert.ok(!html.includes('id="geminiKey"'));
 assert.ok(!js.includes("x-goog-api-key"));
 assert.ok(!bridge.includes("generativelanguage.googleapis.com"));
 assert.match(bridge,/fetch\("\/api\/coach"/);
 assert.match(html,/showCoachFeedback\(res,(?:ent|null)\)/);
 assert.match(html,/טכניקה בלבד/);
 assert.match(html,/rate=elapsed<500\/fps\?Math\.min\(2,rate\+\.05\):1/);
 assert.match(html,/<video id="v"/);
 assert.match(html,/id="scoreRadar"/);
 assert.match(html,/id="scoreBreakdown"/);
 assert.match(html,/drawScoreRadar\(res,overall\)/);
 assert.match(html,/res\.swayOk\?\["sway"\]/);
 assert.match(html,/reason\.textContent=v\.description/);
});
test("API publicly reports its configuration state without leaking key",async()=>{
 const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 const r=makeRes();await handler(req("GET"),r);
 assert.equal(r.code,200);assert.deepEqual(r.body,{enabled:false});
 if(previous!==undefined)process.env.GEMINI_API_KEY=previous;
});
test("API refuses POST when owner has not enabled AI",async()=>{
 const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 const r=makeRes();await handler(req("POST",{evidence:measure}),r);
 assert.equal(r.code,503);
 if(previous!==undefined)process.env.GEMINI_API_KEY=previous;
});
test("API validates input and only returns grounded findings and allowed exercises",async()=>{
 const prevKey=process.env.GEMINI_API_KEY;
 const originalFetch=global.fetch;
 process.env.GEMINI_API_KEY="TEST_NO_REAL_KEY";
 let count=0;
 global.fetch=async(url,options)=>{
  count++;
  assert.match(url,/generativelanguage.googleapis.com/);
  assert.equal(options.headers["x-goog-api-key"],"TEST_NO_REAL_KEY");
  assert.ok(!JSON.stringify(options.body).includes("data:video"));
  assert.ok(!options.body.includes("SENSITIVE_SENTINEL"), "unexpected user fields must never reach Google");
  return{ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
   summary:"כדאי לתרגל קו גוף יציב",
   observations:[{key:"hold_banana",finding:"מומצא 90 מעלות",correction:"אסוף בטן"}],
   drills:[{id:"hollow",reason:"שיפור קו גוף"},{id:"inventedMove",reason:"לא מותר"}]
  })}]}}]})};
 };
 try{
  const r=makeRes();await handler(req("POST",{evidence:{...measure,hold:{...measure.hold,unexpected:"SENSITIVE_SENTINEL"},groundedProblems:measure.groundedProblems.map(p=>({...p,extra:"SENSITIVE_SENTINEL"})),extra:"SENSITIVE_SENTINEL"}}),r);
  assert.equal(r.code,200);
  assert.equal(r.body.observations[0].finding,measure.groundedProblems[0].finding);
  assert.deepEqual(r.body.drills.map(d=>d.id),["hollow"]);
  assert.equal(count,1);
  const invalid=makeRes();
  await handler(req("POST",{evidence:{...measure,allowedExerciseIds:["inventedMove"]}}),invalid);
  assert.equal(invalid.code,400);
  const blocked=makeRes();
  await handler({...req("POST",{evidence:measure}),headers:{host:"handstand-lab-coach.vercel.app",origin:"https://evil.example"}},blocked);
  assert.equal(blocked.code,403);
 }finally{
  global.fetch=originalFetch;
  if(prevKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=prevKey;
 }
});

test("upstream quota failures and unsafe generated claims fail closed",async()=>{
 const previous=process.env.GEMINI_API_KEY, original=global.fetch;
 process.env.GEMINI_API_KEY="TEST_NO_REAL_KEY";
 const request=()=>({...req("POST",{evidence:measure}),headers:{...req("POST").headers,"x-real-ip":"198.51.100.58"}});
 try{
  global.fetch=async()=>({ok:false,status:429});
  let response=makeRes();await handler(request(),response);
  assert.equal(response.code,429);
  assert.ok(!JSON.stringify(response.body).includes(process.env.GEMINI_API_KEY));
  global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({
   summary:"הגוף בזווית 16.7 מעלות",
   observations:[{key:"hold_banana",correction:"אסוף בטן"}],
   drills:[{id:"hollow",reason:"שליטה טובה"}]
  })}]}}]})});
  response=makeRes();await handler(request(),response);
  assert.equal(response.code,502);
 }finally{
  global.fetch=original;
  if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;
 }
});

test("real-video regression: Gemini cannot broaden praise to the entire exercise",async()=>{
 const previous=process.env.GEMINI_API_KEY,original=global.fetch;process.env.GEMINI_API_KEY="TEST_NO_REAL_KEY";
 let summary="קו הגוף נראה טוב בחלק שנמדד.";
 global.fetch=async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({summary,strength:{key:"hold_banana",text:"שמרת על גוף ארוך ומתוח לאורך כל התרגיל."},observations:[],drills:[{id:"wallLine",reason:"לשימור קו הגוף."}]})}]}}]})});
 const evidence={...measure,strength:{key:"hold_banana",score:99},groundedProblems:[]};
 const request=()=>({...req("POST",{evidence}),headers:{...req("POST").headers,"x-real-ip":"198.51.100.91"}});
 try{let r=makeRes();await handler(request(),r);assert.equal(r.code,200);assert.equal(r.body.strength,null);
 summary="קו הגוף נשמר לאורך כל התרגיל.";r=makeRes();await handler(request(),r);assert.equal(r.code,502);
 }finally{global.fetch=original;if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous;}
});
