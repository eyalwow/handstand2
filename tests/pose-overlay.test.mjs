import test from "node:test";
import assert from "node:assert/strict";
import {
  smoothDisplayTrack,
  smoothLivePose,
  poseAtTime,
  drawPoseOverlay,
  projectPosePoint,
} from "../vercel-app/pose-overlay.js";
const pose = (x) =>
  Array.from({ length: 33 }, (_, i) => ({
    x: x + (i === 27 ? 0 : 0),
    y: i === 27 ? 20 : 200,
    v: 1,
  }));
test("display smoothing reduces small jitter without mutating raw data or hiding fast movement", () => {
  const fr = [pose(100), pose(104), pose(100)],
    copy = structuredClone(fr),
    times = [0, 0.1, 0.2];
  const sm = smoothDisplayTrack(fr, times);
  assert.ok(sm[1][11].x < 104 && sm[1][11].x > 100);
  assert.deepEqual(fr, copy);
  const fast = [pose(100), pose(160), pose(100)];
  assert.equal(smoothDisplayTrack(fast, times)[1][11].x, 160);
  assert.ok(Math.abs(smoothLivePose(fr[0], fr[1], 0.1)[11].x - 103.4) < 1e-9);
  assert.equal(smoothLivePose(fr[0], fast[1], 0.1)[11].x, 160);
});
test("no holding/extrapolating weak or missing joints across gaps, seek, ends or tracking loss", () => {
  const a = pose(100),
    b = pose(110);
  b[13].v = 0.2;
  assert.equal(poseAtTime([a, b], [0, 0.1], 0.05)[13], null);
  assert.equal(poseAtTime([a, null], [0, 0.1], 0.05), null);
  assert.equal(poseAtTime([a, b], [0, 0.3], 0.05), null);
  assert.equal(poseAtTime([a, b], [0, 0.1], 0.2), null);
  assert.equal(poseAtTime([a, b], [0, 0.1], -0.01), null);
  assert.equal(smoothDisplayTrack([a, null, b], [0, 0.1, 0.2])[1], null);
  assert.equal(poseAtTime([a, b], [0, 0.1], 0.05)[11].x, 105);
});
test("renderer uses measured endpoints, confidence, bounds and CSS-sized thicker lines", () => {
  const lines = [],
    arcs = [],
    widths = [];
  const ctx = {
    canvas: { getBoundingClientRect: () => ({ width: 320, height: 400 }) },
    save() {},
    restore() {},
    beginPath() {},
    moveTo(x, y) {
      this.from = [x, y];
    },
    lineTo(x, y) {
      lines.push([this.from, [x, y]]);
    },
    stroke() {
      widths.push(this.lineWidth);
    },
    fill() {},
    arc(x, y, r) {
      arcs.push([x, y, r]);
    },
  };
  const f = pose(100);
  f[13] = { x: 120, y: 220, v: 1 };
  f[15].v = 0.1;
  f[12].x = -50;
  drawPoseOverlay(ctx, f, { width: 640, height: 800 });
  assert.ok(lines.some(([a, b]) => a[0] === 100 && b[0] === 120));
  assert.ok(widths[0] >= 5.6);
  assert.ok(!lines.some(([a, b]) => a[0] < 0 || b[0] < 0));
  assert.ok(arcs.every(([, , r]) => r >= 8));
});
test("contain/cover, portrait/landscape and quarter rotations preserve exact coordinates", () => {
  assert.deepEqual(
    projectPosePoint(
      { x: 100, y: 50 },
      {
        sourceWidth: 200,
        sourceHeight: 100,
        displayWidth: 400,
        displayHeight: 400,
      },
    ),
    { x: 200, y: 200 },
  );
  assert.deepEqual(
    projectPosePoint(
      { x: 0, y: 0 },
      {
        sourceWidth: 200,
        sourceHeight: 100,
        displayWidth: 400,
        displayHeight: 400,
        fit: "cover",
      },
    ),
    { x: -200, y: 0 },
  );
  for (const rotation of [0, 90, 180, 270])
    assert.deepEqual(
      projectPosePoint(
        { x: 100, y: 50 },
        {
          sourceWidth: 200,
          sourceHeight: 100,
          displayWidth: 300,
          displayHeight: 600,
          rotation,
        },
      ),
      { x: 150, y: 300 },
    );
  assert.deepEqual(
    projectPosePoint(
      { x: 0, y: 0 },
      {
        sourceWidth: 200,
        sourceHeight: 100,
        displayWidth: 100,
        displayHeight: 200,
        rotation: 90,
      },
    ),
    { x: 100, y: 0 },
  );
});
