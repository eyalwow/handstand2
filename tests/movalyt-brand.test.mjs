import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const home = read("../vercel-app/index.html");
const training = read("../vercel-app/training.html");
const workout = read("../vercel-app/workout.html");
const manifest = JSON.parse(read("../vercel-app/app.webmanifest"));

test("MOVALYT brand is consistent across athlete surfaces", () => {
  for (const page of [home, training, workout]) {
    assert.match(page, /MOVALYT/);
    assert.doesNotMatch(page, /HANDSTAND LAB|Handstand Lab/);
  }
  assert.equal(manifest.name, "MOVALYT — Master Your Movement");
  assert.equal(manifest.short_name, "MOVALYT");
  assert.equal(manifest.start_url, "./index.html");
  assert.equal(manifest.scope, "./");
});

test("analysis-first home retains the honest video analysis flow", () => {
  assert.match(home, /id="navAnalyze"/);
  assert.doesNotMatch(home, /href=".\/training.html/);
  assert.match(home, /id="cameraFile"[^>]*capture="environment"/);
  assert.match(home, /href="#analyze"/);
  assert.match(home, /עמידת ידיים בלבד/);
  assert.match(home, /הווידאו נשאר במכשיר/);
  for (const id of [
    "analyzerView",
    "file",
    "status",
    "prog",
    "out",
    "coachPanel",
    "replaySec",
  ]) {
    assert.ok(home.includes(`id="${id}"`), `missing analysis control: ${id}`);
  }
  assert.match(read("../vercel-app/app.css"), /#out\s*\{\s*display:\s*none/);
  assert.match(home, /<span class="score" id="score"><\/span\s*>/);
  assert.match(home, /<section(?=[^>]*id="coachPanel")(?=[^>]*\bhidden\b)/);
  assert.doesNotMatch(home, /id="aiConsent"/);
  assert.match(home, /id="cloudRequest"/);
  assert.match(home, /הווידאו נשאר במכשיר/);
});

test("branding does not rename persisted athlete data", () => {
  const sources = [
    read("../vercel-app/index.html"),
    read("../vercel-app/handstand-engine.js"),
    read("../vercel-app/training-core.js"),
    read("../vercel-app/training-ui.js"),
    read("../vercel-app/workout-core.js"),
  ].join("\n");
  for (const key of [
    "handstand-lab-training-ui-v1",
    "handstand-lab-workouts-v1",
    "handstand-lab-active-workout-v1",
    "handstand-lab-analyses-v1",
  ]) {
    assert.match(sources, new RegExp(key));
  }
});
