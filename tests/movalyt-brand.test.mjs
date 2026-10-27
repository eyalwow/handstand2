import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const home=read("../vercel-app/index.html");
const training=read("../vercel-app/training.html");
const workout=read("../vercel-app/workout.html");
const manifest=JSON.parse(read("../vercel-app/app.webmanifest"));

test("MOVALYT brand is consistent across athlete surfaces",()=>{
  for(const page of [home,training,workout]){
    assert.match(page,/MOVALYT/);
    assert.match(page,/MASTER YOUR MOVEMENT/);
    assert.doesNotMatch(page,/HANDSTAND LAB|Handstand Lab/);
  }
  assert.equal(manifest.name,"MOVALYT — Master Your Movement");
  assert.equal(manifest.short_name,"MOVALYT");
  assert.equal(manifest.start_url,"./index.html");
  assert.equal(manifest.scope,"./");
});

test("video analysis remains the primary honest product flow",()=>{
  assert.match(home,/AI VIDEO ANALYSIS · HANDSTAND BETA/);
  assert.match(home,/עמידת ידיים היא התנועה הראשונה שנתמכת/);
  assert.match(home,/הווידאו נשאר במכשיר/);
  for(const id of ["analyzerView","file","status","prog","out","coachPanel","replaySec"]){
    assert.ok(home.includes(`id="${id}"`),`missing analysis control: ${id}`);
  }
});

test("branding does not rename persisted athlete data",()=>{
  const sources=[read("../vercel-app/index.html"),read("../vercel-app/training-core.js"),read("../vercel-app/training-ui.js"),read("../vercel-app/workout-core.js")].join("\n");
  for(const key of ["handstand-lab-training-ui-v1","handstand-lab-workouts-v1","handstand-lab-active-workout-v1","handstand-lab-analyses-v1"]){
    assert.match(sources,new RegExp(key));
  }
});
