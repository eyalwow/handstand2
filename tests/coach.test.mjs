import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {analyzeCoachIssues,buildCoachEvidence,buildCoachLocalPlan,validateCoachResponse} from "../preview/ai-feedback.js";

const html=readFileSync(new URL("../preview/index.html",import.meta.url),"utf8");
const js=readFileSync(new URL("../preview/ai-feedback.js",import.meta.url),"utf8");
for (const id of ["geminiSetup","geminiKey","coachPanel","geminiBtn","coachBadge","coachObservations","coachDrills","geminiStatus","file","out"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing HTML ID: "+id);
}
assert.match(html,/showCoachFeedback\(res,ent\)/);
assert.match(html,/resetCoachFeedback\(\)/);
assert.match(html,/diagnostics:\{validFrames:idx\.length,visibilityPercent,thirds\}/);
assert.match(html,/import \{setupCoach,resetCoachFeedback,showCoachFeedback\} from "\.\/ai-feedback\.js"/);
assert.ok(!/AIza[A-Za-z0-9_-]{20,}/.test(js+html),"No API key should be embedded in a public repository");
const res={
 val:{banana:.11,lean:6,shoulder:30,elbow:7,sway:.005},
 sc:{banana:30,lean:75,shoulder:42,elbow:90,sway:92},
 total:61,hold:3.3,swayOk:true,
 diagnostics:{validFrames:30,visibilityPercent:94,thirds:[
  {phase:"start",pelvisOffsetPercent:8,leanDegrees:5},
  {phase:"middle",pelvisOffsetPercent:11,leanDegrees:6},
  {phase:"end",pelvisOffsetPercent:13,leanDegrees:7}
 ]}
};
const issues=analyzeCoachIssues(res,null);
assert.equal(issues[0].key,"hold_banana");
assert.equal(issues[1].key,"hold_shoulder");
assert.ok(!issues.some(i=>i.key==="hold_elbow"),"Strong elbow should not be treated as an issue");
const ev=buildCoachEvidence(res,null,issues);
assert.ok(ev.allowedExerciseIds.includes("hollow"));
assert.equal(ev.hold.durationSeconds,3.3);
assert.equal(ev.hold.timeSegments.length,3);
assert.ok(!JSON.stringify(ev).includes("base64"),"No video, frames, or images are sent");
const local=buildCoachLocalPlan(issues,ev);
assert.ok(local.summary.includes("קו הגוף"));
assert.ok(local.drills.some(d=>d.id==="hollow"));
assert.ok(local.drills.every(d=>ev.allowedExerciseIds.includes(d.id)),"Local drills must be in allowlist");
const gemini={
 summary:"כדאי להתחיל מקו הגוף: הסטייה משתנה בין ההתחלה לסוף.",
 observations:[{key:"hold_banana",finding:"מדד מזויף 999 מעלות",correction:"נסה לייצב אגן וצלעות לאורך החזקה."}],
 drills:[{id:"hollow",reason:"כדי לתרגל החזקת אגן יציבה."}]
};
const checked=validateCoachResponse(gemini,ev,issues);
assert.equal(checked.observations[0].finding,issues[0].finding,"AI cannot overwrite measured facts");
assert.throws(()=>validateCoachResponse({...gemini,drills:[{id:"not-recommended",reason:"bad"}]},ev,issues));
assert.throws(()=>validateCoachResponse({...gemini,observations:[{key:"fake_metric",finding:"fake",correction:"fake"}]},ev,issues));
const perfect={
 ...res,val:{banana:0,lean:0,shoulder:0,elbow:0,sway:0},
 sc:{banana:100,lean:100,shoulder:100,elbow:100,sway:100}
};
const noIssues=analyzeCoachIssues(perfect,null);
assert.equal(noIssues.length,0);
const safe=buildCoachLocalPlan(noIssues,buildCoachEvidence(perfect,null,noIssues));
assert.ok(safe.summary.includes("במקום להמציא ליקוי"));
const entry={sc:{reach:35,arch:78,shoulder:95,elbow:95},total:68,minAng:20,reached:false,arch:.06};
assert.ok(analyzeCoachIssues(null,entry).some(i=>i.key==="entry_reach"));
console.log("PASS: handstand coach evidence, fallbacks, metric grounding, drill allowlist, setup integrity");
