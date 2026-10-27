import test from "node:test";
import assert from "node:assert/strict";
import {EXERCISES,CATEGORIES,FILTER_LEVELS,searchExercises} from "../vercel-app/exercise-library.js";
import {illustrationSlugs} from "../vercel-app/exercise-media.js";
import {existsSync} from "node:fs";
import {fileURLToPath} from "node:url";

test("library provides over 100 distinct named exercises with practical descriptions", () => {
  assert.ok(EXERCISES.length >= 101);
  assert.equal(new Set(EXERCISES.map(ex => ex.name)).size, EXERCISES.length);
  assert.ok(CATEGORIES.length >= 8);
  for (const ex of EXERCISES) {
    assert.ok(CATEGORIES.includes(ex.category));
    assert.ok(FILTER_LEVELS.includes(ex.level));
    assert.ok(ex.name.length >= 4);
    assert.ok(ex.equipment.length >= 3);
    assert.ok(ex.tip.length >= 12);
  }
});
test("search and combined filters return only matching exercises", () => {
  const bands=searchExercises({query:"  גומייה "});
  assert.ok(bands.length>=3);
  assert.ok(bands.every(ex => [ex.name,ex.category,ex.equipment].some(s=>s.includes("גומייה"))));
  const matches=searchExercises({category:"רגליים",level:"מתחיל"});
  assert.ok(matches.length>0);
  assert.ok(matches.every(ex=>ex.category==="רגליים" && ex.level==="מתחיל"));
  assert.equal(searchExercises({query:"תרגיל שאינו קיים"}).length,0);
});
test("empty filters return the full library without mutating the source", () => {
  assert.equal(searchExercises().length,EXERCISES.length);
  assert.notEqual(searchExercises(),EXERCISES);
});


test("illustrations use existing verified files and match catalogue names", () => {
  assert.ok(Object.keys(illustrationSlugs).length>=20);
  for (const [name,slug] of Object.entries(illustrationSlugs)) {
    assert.ok(EXERCISES.some(ex => ex.name===name),name);
    for (const frame of [1,2,3]) assert.ok(existsSync(fileURLToPath(new URL("../vercel-app/assets/exercises/"+slug+"/frame-"+frame+".svg",import.meta.url))),slug+" frame "+frame);
    assert.notEqual(slug,"squat"); // This source illustration includes a barbell.
    assert.notEqual(slug,"reverse-lunge"); // This source illustration includes dumbbells.
  }
});
