import test from "node:test";
import assert from "node:assert/strict";
import {
  extractTemporalSamples,
  analyzeHandstandTimeline,
} from "../vercel-app/handstand-temporal.js";
import { observedEntryWindow } from "../vercel-app/handstand-summary.js";
// Synthetic side-view regression: hip height can stay constant during a full entry.
function frame(t, v = 1) {
  const f = Array.from({ length: 33 }, () => ({ x: 240, y: 250, v }));
  for (const [i, y] of [
    [11, 150 + 200 * t],
    [12, 150 + 200 * t],
    [13, 250 + 150 * t],
    [14, 250 + 150 * t],
    [15, 350 + 100 * t],
    [16, 350 + 100 * t],
    [23, 250],
    [24, 250],
    [25, 360 - 195 * t],
    [26, 360 - 195 * t],
    [27, 470 - 390 * t],
    [28, 470 - 390 * t],
  ])
    f[i] = { x: 240, y, v };
  return f;
}
const full = () => [
  ...Array.from({ length: 20 }, () => frame(0)),
  ...Array.from({ length: 11 }, (_, i) => frame(i / 10)),
  ...Array.from({ length: 25 }, () => frame(1)),
];
const analyze = (frames) =>
  analyzeHandstandTimeline({
    frames,
    timestamps: frames.map((_, i) => i / 10),
    width: 500,
    height: 600,
  });
test("full side entry is observed without demanding an upward pelvis translation or an entry grade", () => {
  const frames = full(),
    trace = {};
  assert.equal(observedEntryWindow(frames, 10, null, trace), null);
  assert.equal(trace.reason, "pelvis-rise-below-fifteen-percent");
  assert.equal(trace.hipRisePixels, 0);
  const result = analyze(frames);
  assert.ok(result.ascent);
  assert.equal(result.ascent.score, null);
  assert.equal(result.entryDiagnostics.reason, "observed");
  assert.equal(result.entryDiagnostics.coverage, 1);
});
test("already-inverted video and partial ascent cannot become a full entry", () => {
  assert.equal(
    analyze(Array.from({ length: 35 }, () => frame(1))).ascent,
    null,
  );
  assert.equal(analyze(full().slice(0, 26)).ascent, null);
});
test("arms raised in visible preparation do not erase the observed transition", () => {
  const frames = full();
  for (let i = 5; i < 20; i++) {
    frames[i][15].y = 60;
    frames[i][16].y = 60;
  }
  assert.ok(analyze(frames).ascent);
});
test("confidence and coverage requirements remain conservative; timestamps and gaps matter", () => {
  assert.equal(
    analyze(full().map((f) => f.map((p) => ({ ...p, v: 0.64 })))).ascent,
    null,
  );
  const sparse = full().map((f, i) => (i % 3 ? f : null));
  assert.equal(analyze(sparse).ascent, null);
  const data = full();
  for (let i = 20; i < 25; i++) data[i] = null;
  assert.equal(analyze(data).ascent, null);
  const samples = extractTemporalSamples(
    full(),
    full().map((_, i) => (i === 5 ? 0.4 : i / 10)),
    { width: 500, height: 600 },
  );
  assert.deepEqual(samples, []);
});
test("entry observation does not mutate landmarks or add a score", () => {
  const frames = full(),
    before = structuredClone(frames);
  analyze(frames);
  assert.deepEqual(frames, before);
});
