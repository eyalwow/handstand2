// Phase observation only. No scoring input, landmark modification or confidence relaxation.
export const ENTRY_OBSERVATION_POLICY = Object.freeze({
  confidence: 0.65,
  minSamples: 8,
  minCoverage: 0.8,
  minSeconds: 0.5,
  maxTrackingGapSeconds: 0.3,
  minAnkleRiseBodyLengths: 0.3,
});
export function observeHandstandEntry(samples) {
  const policy = ENTRY_OBSERVATION_POLICY;
  const unknown = (reason) => ({ ascent: null, diagnostics: { reason } });
  if (
    !Array.isArray(samples) ||
    samples.filter(Boolean).length < policy.minSamples
  )
    return unknown("insufficient-tracking");
  const prepared = (s) =>
    s &&
    s.p.ankle.y > s.p.shoulder.y &&
    s.p.ankle.y > s.p.hip.y &&
    s.p.ankle.y >= s.p.wrist.y - 0.1 * s.scale;
  const terminal = (s) =>
    s && s.reach && s.inverted && (s.legGap === null || s.legGap <= 0.35);
  let reached = false,
    lastFailure = "no-complete-inversion";
  for (let end = 2; end < samples.length; end++) {
    const vertical = samples.slice(end - 2, end + 1);
    if (!vertical.every(terminal) || vertical[2].t - vertical[0].t > 0.4)
      continue;
    reached = true;
    let run = [],
      preparation = null;
    for (const s of samples.slice(0, end - 2)) {
      if (prepared(s) && (!run.length || s.t - run.at(-1).t <= 0.2 + 1e-9))
        run.push(s);
      else run = prepared(s) ? [s] : [];
      if (run.length >= 3) preparation = [...run];
    }
    if (!preparation) {
      lastFailure = "no-reliable-preparation";
      continue;
    }
    const start = preparation[0].i,
      window = samples.slice(start, end + 1),
      good = window.filter(Boolean),
      duration = vertical.at(-1).t - preparation[0].t;
    if (good.length < policy.minSamples || duration < policy.minSeconds) {
      lastFailure = "transition-too-short";
      continue;
    }
    if (good.length / window.length < policy.minCoverage) {
      lastFailure = "tracking-coverage";
      continue;
    }
    if (
      good.some(
        (s, i) =>
          i && s.t - good[i - 1].t > policy.maxTrackingGapSeconds + 1e-9,
      )
    ) {
      lastFailure = "tracking-gap";
      continue;
    }
    const scale =
      vertical.reduce((sum, s) => sum + s.scale, 0) / vertical.length;
    const initialAnkle =
      preparation.slice(0, 3).reduce((sum, s) => sum + s.p.ankle.y, 0) / 3;
    const finalAnkle = vertical.reduce((sum, s) => sum + s.p.ankle.y, 0) / 3;
    const ankleRise = (initialAnkle - finalAnkle) / scale;
    if (!(ankleRise >= policy.minAnkleRiseBodyLengths)) {
      lastFailure = "insufficient-observed-leg-rise";
      continue;
    }
    return {
      ascent: {
        start: preparation[0].t,
        end: vertical.at(-1).t,
        verticalStart: vertical[0].t,
        preparationEnd: preparation.at(-1).t,
      },
      diagnostics: {
        reason: "observed",
        validSamples: good.length,
        samples: window.length,
        coverage: good.length / window.length,
        ankleRiseBodyLengths: ankleRise,
      },
    };
  }
  return unknown(reached ? lastFailure : "no-complete-inversion");
}
