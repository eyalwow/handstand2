// Kinematics only. No inference of intention, finger pressure, impact or injury.
// Provisional descriptive gates, not validated biological or scoring cutoffs.
export const FALL_POLICY = Object.freeze({
  preSeconds: 1.5,
  postSeconds: 2,
  minPreSeconds: 0.5,
  minDepartureSeconds: 0.4,
  minDepartureSamples: 5,
  exitTiltDegrees: 35,
  fastPelvisBodyLengthsPerSecond: 0.18,
  fastTiltDegreesPerSecond: 45,
  minDriftBodyLengths: 0.06,
  minTiltChangeDegrees: 8,
});
const med = (a) => {
  const s = [...a].sort((a, b) => a - b),
    i = s.length >> 1;
  return !s.length ? null : s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const range = (a) => (a.length ? Math.max(...a) - Math.min(...a) : null);
const rounded = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : null);
export function analyzeHandstandEnding({ samples, run, scale, videoEnd }) {
  if (
    !Array.isArray(samples) ||
    !run?.length ||
    !(scale > 0 && Number.isFinite(scale))
  )
    return {
      kind: "not-observed",
      evidence: [],
      reason: "אין רצף אמין לניתוח סיום.",
    };
  const end = run.at(-1),
    pre = run.filter((s) => s.t >= end.t - FALL_POLICY.preSeconds);
  const result = {
    kind: "not-observed",
    at: end.t,
    windowStart: pre[0].t,
    windowEnd: end.t,
    evidence: [],
    possibleExplanation: null,
  };
  if (pre.length < 6 || pre.at(-1).t - pre[0].t < FALL_POLICY.minPreSeconds)
    return { ...result, reason: "אין מספיק רצף לפני סיום ההחזקה." };
  const a = pre.slice(0, Math.max(2, Math.floor(pre.length / 3))),
    b = pre.slice(-Math.max(2, Math.floor(pre.length / 3)));
  const delta = (key) => {
    const x = a.map(key).filter(Number.isFinite),
      y = b.map(key).filter(Number.isFinite);
    return x.length >= 2 && y.length >= 2 ? med(y) - med(x) : null;
  };
  const dt = med(b.map((s) => s.t)) - med(a.map((s) => s.t));
  const drift = delta((s) => s.hipOffset / scale),
    speed = dt > 0 ? drift / dt : null;
  const tilt = delta((s) => s.tilt),
    shoulder = delta((s) => s.shoulder),
    arch = delta((s) => s.arch),
    leg = delta((s) => s.legGap);
  const changes = (values) => {
    let sign = 0,
      count = 0;
    for (let i = 1; i < values.length; i++) {
      const d = values[i] - values[i - 1];
      if (Math.abs(d) < 0.003) continue;
      const next = Math.sign(d);
      if (sign && next !== sign) count++;
      sign = next;
    }
    return count;
  };
  const growing =
    pre.length >= 15 && pre.at(-1).t - pre[0].t >= 1.4
      ? changes(pre.map((s) => s.hipOffset / scale)) >= 3 &&
        range(b.map((s) => s.hipOffset / scale)) >
          Math.max(0.04, range(a.map((s) => s.hipOffset / scale)) * 1.8)
      : null;
  result.metrics = {
    pelvisDriftPercent: rounded(drift * 100),
    pelvisSpeedPercentPerSecond: rounded(speed * 100),
    direction:
      Math.abs(drift) < 0.02
        ? "small"
        : drift > 0
          ? "screen-right"
          : "screen-left",
    tiltChangeDegrees: rounded(tilt),
    shoulderChangeDegrees: rounded(shoulder),
    bodyLineChangePercent: arch === null ? null : rounded(arch * 100),
    legSeparationChange: rounded(leg),
    growingOscillation: growing,
    observedWindowSeconds: rounded(end.t - pre[0].t),
  };
  result.evidence.push({
    key: "pelvis",
    start: pre[0].t,
    end: end.t,
    value: result.metrics.pelvisDriftPercent,
    unit: "% body length",
  });
  let tail = [];
  for (let i = end.i + 1; i < samples.length; i++) {
    const s = samples[i];
    if (!s || s.t - (tail.at(-1)?.t ?? end.t) > 0.2) break;
    if (s.t > end.t + FALL_POLICY.postSeconds) break;
    tail.push(s);
  }
  result.windowEnd = tail.at(-1)?.t ?? end.t;
  if (!tail.length)
    return {
      ...result,
      kind: videoEnd - end.t <= 0.25 ? "video-ended" : "tracking-lost",
      reason:
        videoEnd - end.t <= 0.25
          ? "הסרטון מסתיים לפני שניתן לראות את היציאה."
          : "הזיהוי נקטע לפני שניתן לראות את היציאה.",
    };
  // A motion/velocity gate ending is not itself loss of balance. Hand walking
  // or a leg adjustment can end a stationary interval while still inverted.
  let departure = [],
    candidate = [];
  for (const s of tail) {
    if (!s.inverted || Math.abs(s.tilt) > FALL_POLICY.exitTiltDegrees)
      candidate.push(s);
    else candidate = [];
    if (candidate.length > departure.length) departure = [...candidate];
  }
  if (
    departure.length < FALL_POLICY.minDepartureSamples ||
    departure.at(-1).t - departure[0].t < FALL_POLICY.minDepartureSeconds - 1e-9
  )
    return {
      ...result,
      kind:
        videoEnd - (tail.at(-1)?.t ?? end.t) <= 0.25
          ? "video-ended"
          : "unclear",
      reason:
        "לא נצפתה יציאה ברורה ורציפה ממנח העמידה. תנועה בתוך העמידה אינה הוכחה לאיבוד איזון.",
    };
  const all = [...pre.slice(-5), ...tail],
    departTime = departure[0].t;
  let rapid = [];
  for (let i = 1; i < all.length; i++) {
    const x = all[i - 1],
      y = all[i],
      dt = y.t - x.t;
    if (dt <= 0 || dt > 0.2) continue;
    rapid.push({
      t: y.t,
      fast:
        Math.abs((y.hipOffset - x.hipOffset) / scale / dt) >
          FALL_POLICY.fastPelvisBodyLengthsPerSecond ||
        Math.abs((y.tilt - x.tilt) / dt) > FALL_POLICY.fastTiltDegreesPerSecond,
    });
  }
  const burst = rapid.some(
    (s, i) =>
      s.fast &&
      rapid[i + 1]?.fast &&
      rapid[i + 2]?.fast &&
      s.t <= departTime + 0.3,
  );
  const driftPresent =
    Math.abs(drift) > FALL_POLICY.minDriftBodyLengths ||
    Math.abs(tilt) > FALL_POLICY.minTiltChangeDegrees ||
    growing === true;
  const lower = tail.at(-1).p.ankle.y - tail[0].p.ankle.y;
  const maxTiltSpeed = Math.max(
    0,
    ...all
      .slice(1)
      .map((s, i) =>
        s.inverted && all[i].inverted
          ? Math.abs((s.tilt - all[i].tilt) / (s.t - all[i].t))
          : 0,
      ),
  );
  const monotonic =
    tail
      .slice(1)
      .filter((s, i) => s.p.ankle.y >= tail[i].p.ankle.y - scale * 0.015)
      .length / Math.max(1, tail.length - 1);
  if (burst && driftPresent) {
    result.kind = "possible-balance-loss";
    result.reason =
      "נראתה נטייה גוברת ותנועה מהירה סביב היציאה מהאנך. ייתכן איבוד איזון; לא ניתן לקבוע כוונה או נפילה.";
    result.possibleExplanation =
      Math.abs(shoulder) > 10
        ? "שינוי בפתיחת הכתפיים הופיע סמוך לנטייה; ייתכן קשר, אך הסיבה אינה ודאית."
        : "האגן התרחק מקו כפות הידיים לפני היציאה; ייתכן שהתיקון לא הספיק. הסיבה אינה ודאית.";
  } else if (
    !burst &&
    Math.abs(drift) < FALL_POLICY.minDriftBodyLengths &&
    lower > scale * 0.2 &&
    monotonic >= 0.8 &&
    tail.at(-1).t - tail[0].t >= 0.6 &&
    maxTiltSpeed < FALL_POLICY.fastTiltDegreesPerSecond &&
    tail.some((s) => s.standing)
  ) {
    result.kind = "controlled-descent-compatible";
    result.reason =
      "נראתה הורדת רגליים הדרגתית ללא סטייה חדה מקדימה. התנועה מתאימה לירידה מבוקרת, אך אי אפשר לקבוע כוונה.";
  } else {
    result.kind = "unclear";
    result.reason =
      "נצפתה יציאה מהאנך, אך התנועה אינה מספיקה להבחין בין ירידה יזומה לאיבוד איזון.";
  }
  return { ...result, timeToDepartureSeconds: rounded(departTime - pre[0].t) };
}
