import { observeHandstandEntry } from "./handstand-entry.js";
import { analyzeHandstandEnding } from "./handstand-fall.js";
export const TEMPORAL_POLICY = Object.freeze({
  version: "temporal-v3",
  confidence: 0.65,
  maxGapSeconds: 0.2,
  minHoldSeconds: 0.5,
  minHoldSamples: 6,
  reachDegrees: 12,
  holdDegrees: 25,
  shortHoldSeconds: 5,
  maxVerticalTransitionBodyLengthsPerSecond: 0.45,
  minRetainedVerticalExtension: 0.85,
  supportLoweringWindowSeconds: 0.6,
  supportLoweringShoulderDrop: 0.025,
  supportLoweringElbowClosureDegrees: 10,
  supportLoweringMaxWristDrift: 0.03,
  supportRecoveryHeightSlack: 0.01,
  supportRecoveryElbowSlackDegrees: 5,
  variablePelvisRangeBodyLengths: 0.08,
  variableTiltRangeDegrees: 12,
});
const SIDES = [
  { shoulder: 11, elbow: 13, wrist: 15, hip: 23, knee: 25, ankle: 27 },
  { shoulder: 12, elbow: 14, wrist: 16, hip: 24, knee: 26, ankle: 28 },
];
export const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((a, b) => a - b),
    i = s.length >> 1;
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
export const quantile = (a, q) => {
  if (!a.length) return null;
  const s = [...a].sort((a, b) => a - b);
  return s[Math.round((s.length - 1) * q)];
};
const angle = (a, b, c) => {
  const x = a.x - b.x,
    y = a.y - b.y,
    u = c.x - b.x,
    v = c.y - b.y,
    n = Math.hypot(x, y) * Math.hypot(u, v);
  return n > 0
    ? (Math.acos(Math.max(-1, Math.min(1, (x * u + y * v) / n))) * 180) /
        Math.PI
    : null;
};
export function continuousRuns(samples, predicate) {
  const runs = [];
  let run = [];
  for (const s of samples) {
    if (
      s &&
      predicate(s) &&
      (!run.length || s.t - run.at(-1).t <= TEMPORAL_POLICY.maxGapSeconds)
    ) {
      run.push(s);
    } else {
      if (run.length) runs.push(run);
      run = s && predicate(s) ? [s] : [];
    }
  }
  if (run.length) runs.push(run);
  return runs;
}
export function extractTemporalSamples(
  frames,
  timestamps,
  { width, height, side } = {},
) {
  if (
    !Array.isArray(frames) ||
    !Array.isArray(timestamps) ||
    frames.length !== timestamps.length ||
    !(width > 0 && height > 0) ||
    timestamps.some(
      (t, i) => !Number.isFinite(t) || t < 0 || (i && t <= timestamps[i - 1]),
    )
  )
    return [];
  const valid = (p) =>
    p &&
    Number.isFinite(p.v) &&
    p.v <= 1 &&
    p.v >= TEMPORAL_POLICY.confidence &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= 0 &&
    p.x <= width &&
    p.y >= 0 &&
    p.y <= height;
  const keys = ["shoulder", "elbow", "wrist", "hip", "ankle"];
  const k =
    side ||
    SIDES.map((k) => ({
      k,
      n: frames.filter((f) => f && keys.every((n) => valid(f[k[n]]))).length,
    })).sort((a, b) => b.n - a.n)[0].k;
  const samples = frames.map((f, i) => {
    if (!f || !keys.every((n) => valid(f[k[n]]))) return null;
    const p = Object.fromEntries(keys.map((n) => [n, f[k[n]]]));
    const scale = Math.max(
      Math.hypot(p.ankle.x - p.shoulder.x, p.ankle.y - p.shoulder.y),
      2 * Math.hypot(p.hip.x - p.shoulder.x, p.hip.y - p.shoulder.y),
      2 * Math.hypot(p.wrist.x - p.shoulder.x, p.wrist.y - p.shoulder.y),
    );
    if (scale < Math.min(width, height) * 0.12) return null;
    const gap =
      valid(f[27]) && valid(f[28])
        ? Math.hypot(f[27].x - f[28].x, f[27].y - f[28].y) / scale
        : null;
    const a = p.ankle,
      s = p.shoulder,
      h = p.hip,
      w = p.wrist;
    const tilted = (Math.atan2(a.x - w.x, w.y - a.y) * 180) / Math.PI;
    const torsoLegY = a.y - s.y,
      ratio =
        Math.abs(torsoLegY) > 0.01 * scale ? (h.y - s.y) / torsoLegY : null;
    const arch =
      ratio === null ? null : (h.x - (s.x + ratio * (a.x - s.x))) / scale;
    const inverted = a.y < h.y && h.y < s.y && s.y < w.y;
    return {
      i,
      t: timestamps[i],
      p,
      scale,
      legGap: gap,
      tilt: tilted,
      arch,
      shoulder: angle(h, s, p.elbow),
      elbow: angle(s, p.elbow, w),
      hipOffset: h.x - w.x,
      inverted,
      standing: h.y > s.y && a.y > s.y,
      hold:
        inverted &&
        Math.abs(tilted) <= TEMPORAL_POLICY.holdDegrees &&
        (gap === null || gap <= 0.35),
      reach: inverted && Math.abs(tilted) <= TEMPORAL_POLICY.reachDegrees,
    };
  });
  for (const s of samples) if (s) s.postureHold = s.hold;
  // A vertically moving kick/descent can be inverted without being a hold.
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (!s?.hold) continue;
    const a = samples[i - 1] || s,
      b = samples[i + 1] || s,
      dt = b.t - a.t;
    if (!(dt > 0 && dt <= 0.4)) {
      s.hold = false;
      continue;
    }
    const velocity =
      (b.p.ankle.y - b.p.wrist.y - (a.p.ankle.y - a.p.wrist.y)) / s.scale / dt;
    if (
      Math.abs(velocity) >
      TEMPORAL_POLICY.maxVerticalTransitionBodyLengthsPerSecond
    )
      s.hold = false;
  }
  // Reject isolated tracking teleports; do not fill the resulting gap.
  const observed = samples.map((s, i) => {
    const a = samples[i - 1],
      b = samples[i + 1];
    if (!s || !a || !b || b.t - a.t > 0.4) return s;
    const distance = (u, v) =>
      Math.hypot(u.p.hip.x - v.p.hip.x, u.p.hip.y - v.p.hip.y) / s.scale;
    return distance(a, b) < 0.04 &&
      distance(a, s) > 0.18 &&
      distance(b, s) > 0.18
      ? null
      : s;
  });
  for (let i = 0; i < observed.length; i++)
    if (observed[i]) observed[i].supportLowering = supportLoweringEvidence(observed, i);
  return observed;
}
// A progressively lowering support is a dynamic exit phase, even while the
// ankles remain above the hips. Constant bent arms remain a technique issue.
// Require coordinated, sustained changes relative to nearly anchored wrists;
// one joint jump, camera translation or a quick correction is not enough.
export function supportLoweringEvidence(samples, index) {
  const first = samples[index];
  if (!first?.inverted) return null;
  const window = [];
  for (let i = index; i < samples.length; i++) {
    const s = samples[i];
    if (!s?.inverted || !Number.isFinite(s.elbow) ||
        [s.p.shoulder,s.p.wrist].some(p=>Math.hypot(p.x-s.p.elbow.x,p.y-s.p.elbow.y)<s.scale*.025) ||
        (window.length && s.t-window.at(-1).t > TEMPORAL_POLICY.maxGapSeconds+1e-9)) return null;
    window.push(s);
    if (s.t-first.t >= TEMPORAL_POLICY.supportLoweringWindowSeconds-1e-9) break;
  }
  if (window.length<6 || window.at(-1).t-first.t<TEMPORAL_POLICY.supportLoweringWindowSeconds-1e-9) return null;
  const scale=median(window.map(s=>s.scale));
  const height=s=>s.p.shoulder.y-s.p.wrist.y;
  if (height(window[1])-height(first)<=scale*.001 || first.elbow-window[1].elbow<=.5) return null;
  const start=window.slice(0,2),end=window.slice(-2);
  const drop=(median(end.map(height))-median(start.map(height)))/scale;
  const closure=median(start.map(s=>s.elbow))-median(end.map(s=>s.elbow));
  const wristDrift=Math.max(...window.map(s=>Math.hypot(s.p.wrist.x-first.p.wrist.x,s.p.wrist.y-first.p.wrist.y)))/scale;
  const trend=window.slice(1).filter((s,i)=>height(s)>=height(window[i])-scale*.003 && s.elbow<=window[i].elbow+1).length/(window.length-1);
  if (drop<TEMPORAL_POLICY.supportLoweringShoulderDrop || closure<TEMPORAL_POLICY.supportLoweringElbowClosureDegrees ||
      wristDrift>TEMPORAL_POLICY.supportLoweringMaxWristDrift || trend<.8) return null;
  return {start:first.t,end:window.at(-1).t,samples:window.length,
    shoulderDropBodyLengths:drop,elbowClosureDegrees:closure,wristDriftBodyLengths:wristDrift};
}
// Motion establishes a hold; it does not veto each later balance correction.
// Unknown frames and visible departures still break the interval. A substantial
// loss of vertical extension also ends it, even before the ankles pass the hips.
export function establishedHoldRuns(samples) {
  const runs = [];
  let seed = [], run = null, extension = null, supportReset = null;
  for (const s of samples) {
    if (supportReset) {
      if (s && !s.inverted) supportReset=null;
      else if (!s || s.t<supportReset.notBefore ||
          s.p.wrist.y-s.p.shoulder.y<supportReset.height-s.scale*TEMPORAL_POLICY.supportRecoveryHeightSlack ||
          s.elbow<supportReset.elbow-TEMPORAL_POLICY.supportRecoveryElbowSlackDegrees) {
        seed=[];
        continue;
      } else supportReset=null;
    }
    if (run) {
      if (s?.postureHold && !s.supportLowering && s.t - run.at(-1).t <= TEMPORAL_POLICY.maxGapSeconds + 1e-9 &&
          s.p.wrist.y - s.p.ankle.y >= extension * TEMPORAL_POLICY.minRetainedVerticalExtension) {
        run.push(s);
        continue;
      }
      if (s?.supportLowering) {
        const tail=run.slice(-6);
        supportReset={notBefore:s.supportLowering.end,
          height:median(tail.map(x=>x.p.wrist.y-x.p.shoulder.y)),elbow:median(tail.map(x=>x.elbow))};
      }
      runs.push(run);
      run = null;
    }
    if (!s?.hold || s.supportLowering || (seed.length && s.t - seed.at(-1).t > TEMPORAL_POLICY.maxGapSeconds + 1e-9)) seed = [];
    if (!s?.hold || s.supportLowering) continue;
    seed.push(s);
    if (seed.length >= TEMPORAL_POLICY.minHoldSamples &&
        seed.at(-1).t - seed[0].t >= TEMPORAL_POLICY.minHoldSeconds - 1e-9) {
      run = seed;
      extension = median(seed.map(s => s.p.wrist.y - s.p.ankle.y));
      seed = [];
    }
  }
  if (run) runs.push(run);
  return runs;
}
export function analyzeHandstandTimeline({
  frames,
  timestamps,
  width,
  height,
  hold = null,
  entry = null,
} = {}) {
  const samples = extractTemporalSamples(frames, timestamps, {
    width,
    height,
    side: hold?.k,
  });
  const unknown = {
    version: TEMPORAL_POLICY.version,
    quality: "insufficient",
    hold: null,
    reach: null,
    ascent: null,
    control: null,
    ending: {
      kind: "not-observed",
      evidence: [],
      reason: "אין רצף זיהוי אמין מספיק.",
    },
  };
  if (!samples.length) return unknown;
  const good = samples.filter(Boolean);
  if (good.length < 6) return unknown;
  const candidates = establishedHoldRuns(samples).filter(
    (run) =>
      run.length >= TEMPORAL_POLICY.minHoldSamples &&
      run.at(-1).t - run[0].t >= TEMPORAL_POLICY.minHoldSeconds - 1e-9,
  );
  const run = candidates.sort(
    (a, b) => b.at(-1).t - b[0].t - (a.at(-1).t - a[0].t),
  )[0];
  const reachRun = continuousRuns(samples, (s) => s.reach).find(
    (run) => run.length >= 3 && run.at(-1).t - run[0].t >= 0.19,
  );
  const reach = reachRun
    ? { start: reachRun[0].t, end: reachRun.at(-1).t }
    : null;
  const entryObservation = observeHandstandEntry(samples);
  const ascent = entryObservation.ascent
    ? {
        ...entryObservation.ascent,
        score: Number.isFinite(entry?.total) ? entry.total : null,
      }
    : null;
  const entryDiagnostics = entryObservation.diagnostics;
  if (!run)
    return { ...unknown, quality: "partial", reach, ascent, entryDiagnostics };
  const first = run[0],
    last = run.at(-1),
    before = samples[first.i - 1],
    after = samples[last.i + 1];
  const scale = median(run.map((s) => s.scale));
  const supportLowering = after?.supportLowering || null;
  let ending = analyzeHandstandEnding({
    samples,
    run,
    scale,
    videoEnd: timestamps.at(-1),
  });
  if (supportLowering) ending={...ending,kind:"unclear",possibleExplanation:null,supportLowering,
    reason:"נצפתה הנמכה רציפה של הכתפיים ביחס לכפות הידיים יחד עם כיפוף מתמשך במרפקים. שלב ההנמכה אינו נכלל בזמן ההחזקה; אי אפשר לקבוע את כוונת היציאה."};
  const startObserved = !!(before && !before.hold && first.t - before.t <= 0.2),
    // A failed motion/tilt gate alone cannot certify an end. Require a sustained
    // departure or the separate coordinated support-lowering observation.
    endObserved = !!(
      after &&
      after.t - last.t <= 0.2 &&
      (supportLowering || (!after.hold && Number.isFinite(ending.timeToDepartureSeconds)))
    );
  const offsets = run.map((s) => s.hipOffset / scale),
    center = median(offsets),
    spread = quantile(offsets, 0.9) - quantile(offsets, 0.1);
  const tiltRange =
    quantile(
      run.map((s) => s.tilt),
      0.9,
    ) -
    quantile(
      run.map((s) => s.tilt),
      0.1,
    );
  const control = {
    pelvisRangePercent: spread * 100,
    pelvisMadPercent: median(offsets.map((x) => Math.abs(x - center))) * 100,
    tiltRangeDegrees: tiltRange,
    status:
      spread > TEMPORAL_POLICY.variablePelvisRangeBodyLengths ||
      tiltRange > TEMPORAL_POLICY.variableTiltRangeDegrees
        ? "variable"
        : "limited-motion",
    start: first.t,
    end: last.t,
  };
  const interval = {
    start: first.t,
    end: last.t,
    seconds: last.t - first.t,
    samples: run.length,
    startFrame: first.i,
    endFrame: last.i,
    endReason: supportLowering ? "support-lowering" : "posture-or-tracking-boundary",
    startObserved,
    endObserved,
    censored: !startObserved || !endObserved,
  };
  return {
    version: TEMPORAL_POLICY.version,
    quality: "measured",
    reach,
    ascent,
    entryDiagnostics,
    hold: interval,
    control,
    ending,
  };
}
