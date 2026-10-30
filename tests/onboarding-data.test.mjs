import test from "node:test";
import assert from "node:assert/strict";
import {
  ANALYSIS_CATALOG,
  exerciseById,
  HANDSTAND_METRICS,
} from "../vercel-app/analysis-catalog.js";
import {
  analysisFor,
  ANALYSIS_ENGINES,
} from "../vercel-app/analysis-registry.js";
import {
  readPreferences,
  savePreferences,
  PREFERENCES_KEY,
} from "../vercel-app/onboarding-data.js";
function memory(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}
test("catalog has 20 distinct exercises but only Handstand has an actual analysis engine", () => {
  assert.equal(ANALYSIS_CATALOG.length, 20);
  assert.equal(new Set(ANALYSIS_CATALOG.map((x) => x.id)).size, 20);
  assert.equal(Object.keys(ANALYSIS_ENGINES).length, 1);
  for (const item of ANALYSIS_CATALOG) {
    assert.equal(Boolean(analysisFor(item.id)), item.id === "handstand");
    assert.equal(
      item.status,
      item.id === "handstand" ? "available" : "coming-soon",
    );
  }
  assert.equal(analysisFor("__proto__"), null);
  assert.equal(analysisFor("unknown"), null);
  assert.equal(exerciseById("planche").engineId, null);
  assert.deepEqual(
    HANDSTAND_METRICS.map((x) => x.key),
    ["banana", "shoulder", "elbow", "lean", "sway"],
  );
});
test("first visit is incomplete until finish or skip, then preferences survive reload without touching analysis history", () => {
  const history = '[{"score":71}]',
    storage = memory({ "handstand-lab-analyses-v1": history });
  assert.equal(readPreferences(storage).profile, null);
  const saved = savePreferences(
    storage,
    {
      goal: "technique",
      interests: ["handstand", "planche", "planche", "<script>"],
    },
    { now: new Date("2026-10-31T00:00:00Z") },
  );
  assert.equal(saved.error, null);
  assert.equal(saved.profile.completed, true);
  assert.equal(saved.profile.skipped, false);
  assert.deepEqual(saved.profile.interests, ["handstand", "planche"]);
  assert.equal(storage.getItem("handstand-lab-analyses-v1"), history);
  assert.deepEqual(readPreferences(storage).profile, saved.profile);
  const skipped = savePreferences(
    storage,
    { goal: saved.profile.goal, interests: saved.profile.interests },
    { skipped: true },
  );
  assert.equal(skipped.profile.skipped, true);
  assert.deepEqual(skipped.profile.interests, ["handstand", "planche"]);
});
test("corrupt/future preferences are preserved and do not silently enable analysis or discard user data", () => {
  for (const raw of ["broken", "{}", '{"version":2,"completed":true}']) {
    const storage = memory({ [PREFERENCES_KEY]: raw });
    assert.ok(readPreferences(storage).error);
    assert.ok(
      savePreferences(storage, { goal: "skills", interests: ["handstand"] })
        .error,
    );
    assert.equal(storage.getItem(PREFERENCES_KEY), raw);
  }
});
test("unavailable and quota-limited local storage return actionable errors rather than throwing", () => {
  const denied = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("denied");
    },
  };
  assert.ok(readPreferences(denied).error);
  assert.ok(
    savePreferences(denied, { goal: null, interests: [] }, { skipped: true })
      .error,
  );
  const full = {
    getItem: () => null,
    setItem() {
      throw Error("quota");
    },
  };
  assert.ok(savePreferences(full, { goal: "progress", interests: [] }).error);
});
test("unknown preference values are sanitized; future interests never choose an engine", () => {
  const storage = memory();
  const saved = savePreferences(storage, {
    goal: "arbitrary",
    interests: [
      "front-lever",
      "planche",
      "back-lever",
      "muscle-up",
      "pull-up",
      "does-not-exist",
    ],
  });
  assert.equal(saved.profile.goal, null);
  assert.equal(saved.profile.interests.length, 5);
  for (const id of saved.profile.interests) assert.equal(analysisFor(id), null);
});
