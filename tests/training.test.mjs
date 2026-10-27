import test from "node:test";
import assert from "node:assert/strict";
import {GOALS, LEVELS, LIBRARY, generatePlan} from "../vercel-app/training-core.js";

test("each combination provides three complete, varied workouts with clear prescriptions", () => {
  for (const goal of GOALS) for (const level of LEVELS) {
    const plan=generatePlan(goal.id,level.id);
    assert.deepEqual(plan.map(day=>day.id),["A","B","C"]);
    for (const day of plan) {
      assert.ok(day.list.length>=4 && day.list.length<=6, goal.id+" "+level.id+" "+day.id);
      assert.equal(new Set(day.list.map(ex=>ex.id)).size,day.list.length);
      for (const ex of day.list) {
        const info=LIBRARY[ex.id];
        assert.ok(info && info.name && info.tip && info.equipment);
        assert.ok(Number.isInteger(ex.sets) && ex.sets>=1 && ex.sets<=5);
        assert.ok(typeof ex.target==="string" && ex.target.length);
        assert.ok(ex.rest>=30 && ex.rest<=150);
      }
    }
  }
});
test("beginner plans avoid advanced movements and use controlled sets", () => {
  for (const goal of GOALS) for (const day of generatePlan(goal.id,"beginner")) for (const ex of day.list) {
    assert.ok(!["pull","dip","pike","toePull","hangingKnee"].includes(ex.id));
    assert.ok(ex.sets<=4);
  }
});
test("goal changes select appropriate work; beginner strength starts with warm-up", () => {
  const handstand=generatePlan("handstand","beginner");
  const strength=generatePlan("strength","beginner");
  const general=generatePlan("general","beginner");
  assert.ok(handstand.some(day=>day.list.some(ex=>ex.id==="wall")));
  assert.ok(strength.every(day=>day.list.every(ex=>!["wall","wallKick","toePull"].includes(ex.id))));
  assert.ok(general.every(day=>day.list.every(ex=>!["wall","wallKick","toePull"].includes(ex.id))));
  assert.equal(strength[0].list[0].id,"wrist");
  assert.equal(strength[0].list[1].id,"inclinePush");
});
test("unknown goal and level safely use the beginner handstand plan", () => {
  assert.deepEqual(generatePlan("bad","bad"),generatePlan("handstand","beginner"));
});

