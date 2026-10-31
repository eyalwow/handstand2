import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { analyzeHandstandTimeline } from "../vercel-app/handstand-temporal.js";
import { buildIntelligentCoaching } from "../vercel-app/handstand-coaching.js";
import {
  overallHandstandScore,
  observedEntryWindow,
} from "../vercel-app/handstand-summary.js";
// Synthetic landmark scenarios, not observed athletes or validation labels.
const pose = ({
  hipY = 330,
  ankleY = 120,
  hipX = 300,
  ankleX = 300,
  shoulderX = 300,
  vis = 1,
  split = 0,
} = {}) => {
  const f = Array.from({ length: 33 }, () => ({ x: 300, y: 200, v: vis }));
  for (const [i, x, y] of [
    [11, shoulderX, 500],
    [12, shoulderX, 500],
    [13, 300, 600],
    [14, 300, 600],
    [15, 300, 700],
    [16, 300, 700],
    [23, hipX, hipY],
    [24, hipX, hipY],
    [25, (hipX + ankleX) / 2, (hipY + ankleY) / 2],
    [26, (hipX + ankleX) / 2, (hipY + ankleY) / 2],
    [27, ankleX, ankleY],
    [28, ankleX + split, ankleY],
    [31, ankleX, ankleY],
    [32, ankleX + split, ankleY],
  ])
    f[i] = { x, y, v: vis };
  return f;
};
const standing = () => pose({ hipY: 600, ankleY: 740 });
function attempt(seconds, { movement = () => ({}), ending = "descent" } = {}) {
  const entry = Array.from({ length: 11 }, (_, i) =>
    pose({ hipY: 600 - 27 * i, ankleY: 740 - 62 * i }),
  );
  const held = Array.from({ length: seconds * 10 + 1 }, (_, i) =>
    pose(movement(i)),
  );
  let exit = [];
  if (ending === "descent")
    exit = Array.from({ length: 21 }, (_, i) =>
      pose({ hipY: 330 + Math.max(0, i - 10) * 27, ankleY: 120 + i * 31 }),
    );
  if (ending === "loss")
    exit = Array.from({ length: 11 }, (_, i) =>
      pose({
        hipX: 350 + i * 15,
        ankleX: 500 + i * 5,
        hipY: 330 + i * 12,
        ankleY: 120 + i * 45,
      }),
    );
  const frames = [
    ...Array.from({ length: 8 }, standing),
    ...entry,
    ...held,
    ...exit,
    ...(exit.length ? Array.from({ length: 8 }, standing) : []),
  ];
  return {
    frames,
    timestamps: frames.map((_, i) => i / 10),
    width: 600,
    height: 800,
  };
}
const hold = {
  total: 95,
  hold: 3,
  swayOk: true,
  sc: { banana: 95, lean: 95, shoulder: 95, elbow: 95, sway: 95 },
  val: { banana: 0, lean: 0, shoulder: 0, elbow: 0, sway: 0 },
};
const entry = { total: 95, sc: { reach: 95, shoulder: 95, elbow: 95 } };
function timeline(data, h = hold) {
  return analyzeHandstandTimeline({ ...data, hold: h, entry });
}

test("good ascent: short and long holds retain legacy score but produce different control/duration coaching", () => {
  const short = timeline(attempt(3)),
    long = timeline(attempt(20));
  assert.ok(short.ascent && short.reach);
  assert.ok(short.hold.seconds < 5 && long.hold.seconds > 19);
  assert.ok(short.hold.endObserved && short.hold.startObserved);
  const a = buildIntelligentCoaching(short, hold, entry),
    b = buildIntelligentCoaching(long, { ...hold, hold: 20 }, entry);
  assert.match(a.priority, /קצרה/);
  assert.doesNotMatch(b.priority, /קצרה/);
  assert.ok(a.target.seconds <= 5 && b.target.seconds >= 19);
  assert.notEqual(a.headline, b.headline);
  assert.equal(a.drills.length, 2);
  assert.ok(a.evidence.some((e) => Number.isFinite(e.start)));
  assert.equal(
    overallHandstandScore(hold, entry),
    overallHandstandScore({ ...hold, hold: 20 }, entry),
  );
});
test("good line with significant sway prioritizes control rather than generic praise", () => {
  const t = timeline(
    attempt(5, {
      movement: (i) => ({
        hipX: 300 + 40 * Math.sin(i * 0.6),
        ankleX: 300 + 25 * Math.sin(i * 0.6),
      }),
    }),
  );
  assert.equal(t.control.status, "variable");
  const plan = buildIntelligentCoaching(t, hold, entry);
  assert.match(plan.priority, /שיווי המשקל/);
  assert.doesNotMatch(plan.strength, /יציבה/);
});
test("arch findings use existing measurements and recommend line work", () => {
  const arch = {
    ...hold,
    sc: { ...hold.sc, banana: 30 },
    val: { ...hold.val, banana: 0.13 },
  };
  const t = timeline(attempt(7, { movement: () => ({ hipX: 350 }) }), arch),
    plan = buildIntelligentCoaching(t, arch, entry);
  assert.match(plan.priority, /קו הגוף/);
  assert.match(plan.drills[0].name, /הולו/);
});
test("gradual descent is only compatible with control, never asserted intentional", () => {
  const t = timeline(attempt(3));
  assert.equal(t.ending.kind, "controlled-descent-compatible");
  assert.match(t.ending.reason, /אי אפשר לקבוע כוונה/);
});
test("sustained fast pre-exit drift yields only possible balance loss with bounded explanation", () => {
  const data = attempt(3, {
    ending: "loss",
    movement: (i) => ({
      hipX: 300 + Math.max(0, i - 22) * 8,
      ankleX: 300 + Math.max(0, i - 22) * 15,
    }),
  });
  const t = timeline(data);
  assert.equal(t.ending.kind, "possible-balance-loss");
  assert.ok(t.ending.metrics.pelvisDriftPercent > 0);
  assert.ok(t.ending.timeToDepartureSeconds > 0);
  assert.match(t.ending.possibleExplanation, /ייתכן|ודאית/);
  assert.doesNotMatch(t.ending.possibleExplanation, /אצבע|לחץ/);
});
test("cut off or missing exit cannot become a fall or a complete duration", () => {
  const t = timeline(attempt(3, { ending: "cut" }));
  assert.equal(t.ending.kind, "video-ended");
  assert.equal(t.hold.censored, true);
  const plan = buildIntelligentCoaching(t, hold, entry);
  assert.equal(plan.target, null);
  assert.match(plan.priority, /מקטע|לצלם/);
  const data = attempt(3, { ending: "cut" });
  data.frames.push(...Array(10).fill(null));
  data.timestamps = data.frames.map((_, i) => i / 10);
  assert.equal(timeline(data).ending.kind, "tracking-lost");
});
test("unreliable, out-of-frame, nonmonotonic and fragmented data never manufactures timing or cause", () => {
  for (const visibility of [0.2, NaN, Infinity]) {
    const data = attempt(3);
    data.frames = data.frames.map((f, i) =>
      i % 3 === 0 ? null : f.map((p) => ({ ...p, v: visibility })),
    );
    const t = timeline(data);
    assert.equal(t.hold, null);
    assert.equal(t.control, null);
    assert.equal(t.ending.kind, "not-observed");
    assert.equal(buildIntelligentCoaching(t, hold, entry).target, null);
  }
  const out = attempt(3);
  out.frames = out.frames.map((f) => f.map((p) => ({ ...p, x: -50 })));
  assert.equal(timeline(out).hold, null);
  const bad = attempt(3);
  bad.timestamps[5] = bad.timestamps[4];
  assert.equal(timeline(bad).hold, null);
});
test("clipped start is not re-labeled an ascent; isolated tracking spike is not a fall", () => {
  const frames = Array.from({ length: 31 }, () => pose()),
    data = {
      frames,
      timestamps: frames.map((_, i) => i / 10),
      width: 600,
      height: 800,
    };
  const t = timeline(data);
  assert.equal(t.ascent, null);
  assert.equal(t.hold.startObserved, false);
  const spike = attempt(3, { ending: "cut" });
  spike.frames[30] = pose({ hipX: 450 });
  assert.notEqual(timeline(spike).ending.kind, "possible-balance-loss");
});
test("score parity with legacy engine: 3s/20s, sway and arch keep the same existing formula", () => {
  const source = readFileSync(
      new URL("../vercel-app/handstand-engine.js", import.meta.url),
      "utf8",
    ),
    ctx = {};
  vm.runInNewContext(
    source.slice(
      source.indexOf("const K={"),
      source.indexOf("const sideOf=fr=>"),
    ) + "\nglobalThis.analyze=analyze",
    ctx,
  );
  for (const seconds of [3, 20]) {
    const { frames } = attempt(seconds, { ending: "cut" });
    const legacy = ctx.analyze(frames, 10);
    const copy = structuredClone(frames);
    timeline(
      {
        frames,
        timestamps: frames.map((_, i) => i / 10),
        width: 600,
        height: 800,
      },
      legacy,
    );
    assert.deepEqual(frames, copy);
    assert.equal(overallHandstandScore(legacy, null), Math.round(legacy.total));
  }
});

test("visible pre-end drift in a cut-off clip is not labeled a fall; missing leg evidence remains null", () => {
  const data = attempt(3, {
    ending: "cut",
    movement: (i) => ({
      hipX: 300 + Math.max(0, i - 20) * 5,
      ankleX: 300 + Math.max(0, i - 20) * 8,
    }),
  });
  const t = timeline(data);
  assert.equal(t.ending.kind, "video-ended");
  assert.equal(t.ending.possibleExplanation, null);
  assert.notEqual(t.ending.metrics.growingOscillation, true);
  const hiddenLeg = attempt(3);
  hiddenLeg.frames = hiddenLeg.frames.map((f) => {
    const c = f.map((p) => ({ ...p }));
    c[28].v = 0.1;
    return c;
  });
  assert.equal(timeline(hiddenLeg).ending.metrics.legSeparationChange, null);
});
test("one-fragment short visible interval never licenses a time target when either boundary is missing", () => {
  const data = attempt(3);
  data.frames[25] = null;
  const t = timeline(data);
  assert.equal(t.hold.censored, true);
  assert.equal(buildIntelligentCoaching(t, hold, entry).target, null);
});

test("a motion gate ending during inverted leg/hand adjustments is not by itself a balance loss", () => {
  const data = attempt(3, {
    ending: "cut",
    movement: (i) => ({
      hipX: 300 + Math.max(0, i - 22) * 7,
      ankleX: 300 + Math.max(0, i - 22) * 9,
    }),
  });
  for (let i = 1; i <= 8; i++)
    data.frames.push(
      pose({ hipX: 356 + i * 4, ankleX: 372 + i * 4, ankleY: 120 + i * 20 }),
    );
  data.timestamps = data.frames.map((_, i) => i / 10);
  const t = timeline(data);
  assert.notEqual(t.ending.kind, "possible-balance-loss");
  assert.equal(t.ending.possibleExplanation, null);
  // A motion-gate failure is an end of measured evidence, not an observed exit.
  assert.equal(t.hold.endObserved, false);
  assert.equal(t.hold.censored, true);
  assert.equal(buildIntelligentCoaching(t, hold, entry).target, null);
});

test("only sustained visible departure certifies the end; a brief or occluded exit stays censored", () => {
  for (const [tail, expected] of [
    [Array.from({length: 8}, standing), true],
    [Array.from({length: 3}, standing), false],
    [[null, ...Array.from({length: 8}, standing)], false],
    [Array.from({length: 8}, () => standing().map(p => ({...p, v: .2}))), false],
  ]) {
    const data = attempt(3, {ending: "cut"});
    data.frames.push(...tail);
    data.timestamps = data.frames.map((_, i) => i / 10);
    const result = timeline(data);
    assert.equal(result.hold.endObserved, expected);
    assert.equal(result.hold.censored, !expected);
    if (!expected) assert.equal(buildIntelligentCoaching(result, hold, entry).target, null);
  }
});

test("frozen d39701c legacy baseline values remain 100/100/90/85 for short/long/sway/arch", () => {
  const source = readFileSync(
      new URL("../vercel-app/handstand-engine.js", import.meta.url),
      "utf8",
    ),
    context = {};
  vm.runInNewContext(
    source.slice(source.indexOf("const K={"), source.indexOf("const ENAME=")) +
      "\nglobalThis.analyze=analyze;globalThis.analyzeEntry=analyzeEntry;",
    context,
  );
  const cases = [
    [3, {}, 100],
    [20, {}, 100],
    [
      5,
      {
        movement: (i) => ({
          hipX: 300 + 40 * Math.sin(i * 0.6),
          ankleX: 300 + 25 * Math.sin(i * 0.6),
        }),
      },
      90,
    ],
    [7, { movement: () => ({ hipX: 350 }) }, 85],
  ];
  for (const [seconds, options, expected] of cases) {
    const data = attempt(seconds, options),
      res = context.analyze(data.frames, 10),
      frames = observedEntryWindow(data.frames, 10, res),
      entry = frames ? context.analyzeEntry(frames, 10) : null;
    if (entry?.arch === null)
      entry.total =
        (entry.sc.reach * 0.4 +
          entry.sc.shoulder * 0.2 +
          entry.sc.elbow * 0.15) /
        0.75;
    assert.equal(overallHandstandScore(res, entry), expected);
  }
});
