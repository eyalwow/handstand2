import { analyzeHandstandEnding } from "./handstand-fall.js";
export const TEMPORAL_POLICY = Object.freeze({
  version: "temporal-v1",
  confidence: 0.65,
  maxGapSeconds: 0.2,
  minHoldSeconds: 0.5,
  minHoldSamples: 6,
  reachDegrees: 12,
  holdDegrees: 25,
  shortHoldSeconds: 5,
  maxVerticalTransitionBodyLengthsPerSecond: 0.45,
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
  return samples.map((s, i) => {
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
  const candidates = continuousRuns(samples, (s) => s.hold).filter(
    (run) =>
      run.length >= TEMPORAL_POLICY.minHoldSamples &&
      run.at(-1).t - run[0].t >= TEMPORAL_POLICY.minHoldSeconds,
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
  let ascent = null;
  if (reachRun && Number.isFinite(entry?.total)) {
    const end = reachRun[0].i,
      window = samples.slice(Math.max(0, end - 30), end + 1);
    const connected = continuousRuns(window, () => true).find(
      (r) => r.at(-1).i === end,
    );
    const first = connected?.find((s) => s.standing);
    if (first && reach.start - first.t >= 0.5)
      ascent = { start: first.t, end: reach.start, score: entry.total };
  }
  if (!run) return { ...unknown, quality: "partial", reach, ascent };
  const first = run[0],
    last = run.at(-1),
    before = samples[first.i - 1],
    after = samples[last.i + 1];
  const startObserved = !!(before && !before.hold && first.t - before.t <= 0.2),
    endObserved = !!(after && !after.hold && after.t - last.t <= 0.2);
  const scale = median(run.map((s) => s.scale));
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
    startObserved,
    endObserved,
    censored: !startObserved || !endObserved,
  };
  return {
    version: TEMPORAL_POLICY.version,
    quality: "measured",
    reach,
    ascent,
    hold: interval,
    control,
    ending: analyzeHandstandEnding({
      samples,
      run,
      scale,
      videoEnd: timestamps.at(-1),
    }),
  };
}
