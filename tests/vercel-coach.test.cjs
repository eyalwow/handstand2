const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const handler=require("../vercel-app/api/coach.js");
const html=fs.readFileSync("vercel-app/index.html","utf8");
const js=fs.readFileSync("vercel-app/ai-feedback.js","utf8");
const bridge=fs.readFileSync("vercel-app/server-gemini.js","utf8");
const api=fs.readFileSync("vercel-app/api/coach.js","utf8");
const poseRuntime=fs.readFileSync("vercel-app/pose-runtime.js","utf8");
const poseWorker=fs.readFileSync("vercel-app/pose-worker.js","utf8");
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
 assert.doesNotMatch(bridge,/fetch\(/);
 assert.match(html,/showCoachFeedback\(res,(?:ent|null)\)/);
 assert.match(html,/טכניקה בלבד/);
 assert.match(html,/scanVideoFrames\(/);
 assert.match(html,/new PoseRuntime\(/);
 assert.match(html,/id="cancelAnalysis"/);
 assert.match(html,/לא נשמרה ולא הוצגה תוצאה/);
 assert.ok(html.indexOf('st.textContent="בודק את הסרטון')<html.indexOf("poseRuntime.init(controller.signal)"));
 assert.match(html,/fixed-sequential-seek/);
 assert.match(poseRuntime,/new Worker\(workerUrl\)/);
 assert.doesNotMatch(poseRuntime,/type:\s*["']module["']/);
 assert.match(poseWorker,/await import\(visionModuleUrl\)/);
 assert.doesNotMatch(poseWorker,/^import\s+\{/m);
 assert.match(poseWorker,/vision_bundle\.mjs/);
 assert.match(html,/רכיב ניתוח התנועה לא נטען/);
 assert.ok(fs.existsSync("scripts/smoke-mediapipe-worker.py"));
 assert.ok(fs.existsSync("tests/browser/mediapipe-worker-smoke.html"));
 assert.match(bridge,/enabled:false/);
 assert.match(html,/<video id="v"/);
 assert.match(html,/id="scoreRadar"/);
 assert.match(html,/id="scoreBreakdown"/);
 assert.doesNotMatch(html,/id="geminiBtn"/);
 assert.doesNotMatch(js,/runGemini|checkGeminiStatus\(/);
 assert.match(html,/drawScoreRadar\(res,overall\)/);
 assert.match(html,/res\.swayOk\?\["sway"\]/);
 assert.match(html,/reason\.textContent=v\.description/);
});
test("athlete API is closed even with a configured key, paid marker and remembered consent",async()=>{
 const previous=process.env.GEMINI_API_KEY, original=global.fetch;
 process.env.GEMINI_API_KEY="TEST_NO_REAL_KEY";let calls=0;
 global.fetch=async()=>{calls++;throw Error("Provider must not be contacted")};
 try{
  const status=makeRes();await handler(req("GET"),status);
  assert.equal(status.code,200);assert.equal(status.body.enabled,false);
  assert.equal(status.body.reason,"provider_audience_review_required");
  for(const body of [undefined,{evidence:measure},{evidence:measure,consent:true,plan:"pro",age:19},{evidence:{rawVideo:"PRIVATE_SENTINEL"}}]){
   const result=makeRes();await handler(req("POST",body),result);
   assert.equal(result.code,403);assert.equal(result.body.code,"provider_audience_review_required");
   assert.equal(result.headers["Cache-Control"],"no-store");
   assert.doesNotMatch(JSON.stringify(result.body),/PRIVATE_SENTINEL|TEST_NO_REAL_KEY/);
  }
  assert.equal(calls,0);
 }finally{global.fetch=original;if(previous===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=previous}
});
test("closed endpoint needs no credentials and rejects unsupported methods",async()=>{
 const previous=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 try{const result=makeRes();await handler(req("POST",{evidence:measure}),result);assert.equal(result.code,403);
 const method=makeRes();await handler(req("DELETE"),method);assert.equal(method.code,405);
 }finally{if(previous!==undefined)process.env.GEMINI_API_KEY=previous}
});
