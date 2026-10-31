// Display-only. These coordinates must never replace measurements in the engine.
export const POSE_CONNECTIONS = Object.freeze([
  [11, 13],
  [13, 15],
  [11, 23],
  [23, 25],
  [25, 27],
  [27, 31],
  [12, 14],
  [14, 16],
  [12, 24],
  [24, 26],
  [26, 28],
  [28, 32],
  [11, 12],
  [23, 24],
]);
const JOINTS = [...new Set(POSE_CONNECTIONS.flat())];
const confident = (p) =>
  p &&
  Number.isFinite(p.v) &&
  p.v <= 1 &&
  p.v >= 0.5 &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y);
export function smoothDisplayTrack(frames, times) {
  return frames.map((f, i) => {
    if (!f) return null;
    const a = frames[i - 1],
      b = frames[i + 1];
    if (
      !a ||
      !b ||
      !Number.isFinite(times[i]) ||
      !(times[i] - times[i - 1] > 0 && times[i] - times[i - 1] <= 0.16) ||
      !(times[i + 1] - times[i] > 0 && times[i + 1] - times[i] <= 0.16)
    )
      return f.map((p) => (p ? { ...p } : p));
    const scales = [
      [11, 27],
      [12, 28],
    ]
      .filter(([x, y]) => confident(f[x]) && confident(f[y]))
      .map(([x, y]) => Math.hypot(f[x].x - f[y].x, f[x].y - f[y].y));
    const scale = scales.length ? Math.max(...scales) : 0;
    return f.map((p, j) => {
      if (!confident(p) || !confident(a[j]) || !confident(b[j]) || !scale)
        return p ? { ...p } : p;
      const near = (q) => Math.hypot(q.x - p.x, q.y - p.y) <= scale * 0.035;
      if (!near(a[j]) || !near(b[j])) return { ...p };
      const x = 0.15 * a[j].x + 0.7 * p.x + 0.15 * b[j].x,
        y = 0.15 * a[j].y + 0.7 * p.y + 0.15 * b[j].y;
      return Math.hypot(x - p.x, y - p.y) <= scale * 0.012
        ? { ...p, x, y }
        : { ...p };
    });
  });
}
export function poseAtTime(frames, times, time) {
  if (
    !Number.isFinite(time) ||
    !times.length ||
    time < times[0] ||
    time > times.at(-1)
  )
    return null;
  let lo = 0,
    hi = times.length - 1;
  while (lo < hi) {
    const m = Math.ceil((lo + hi) / 2);
    if (times[m] <= time) lo = m;
    else hi = m - 1;
  }
  const a = frames[lo];
  if (!a) return null;
  if (Math.abs(time - times[lo]) < 1e-6)
    return a.map((p) => (confident(p) ? { ...p } : null));
  const b = frames[lo + 1],
    span = times[lo + 1] - times[lo];
  if (!b || !(span > 0 && span <= 0.16)) return null;
  const t = (time - times[lo]) / span;
  return a.map((p, j) =>
    confident(p) && confident(b[j])
      ? {
          x: p.x + (b[j].x - p.x) * t,
          y: p.y + (b[j].y - p.y) * t,
          v: Math.min(p.v, b[j].v),
        }
      : null,
  );
}
export function drawPoseOverlay(
  ctx,
  points,
  { width, height, displayWidth } = {},
) {
  if (!points || !(width > 0 && height > 0)) return;
  const rect = ctx.canvas.getBoundingClientRect?.();
  const cssWidth =
    displayWidth ||
    (rect?.width && rect?.height
      ? Math.min(rect.width, (rect.height * width) / height)
      : rect?.width) ||
    width;
  const cssLine = Math.max(2.8, Math.min(4, cssWidth / 110)),
    ratio = width / Math.max(1, cssWidth),
    line = cssLine * ratio;
  const valid = (p) =>
    confident(p) && p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
  ctx.save();
  ctx.strokeStyle = "#C4FF64";
  ctx.fillStyle = "#C4FF64";
  ctx.lineWidth = line;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "#C4FF6433";
  ctx.shadowBlur = ratio * 1.5;
  for (const [a, b] of POSE_CONNECTIONS) {
    const p = points[a],
      q = points[b];
    if (!valid(p) || !valid(q)) continue;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  for (const i of JOINTS) {
    const p = points[i];
    if (!valid(p)) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(4, cssLine * 1.3) * ratio, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#101713";
    ctx.lineWidth = ratio * 1.1;
    ctx.stroke();
  }
  ctx.restore();
}
// For independently layered media consumers/tests. Live player draws video and
// pose in the same canvas, using browser-decoded orientation with no CSS crop.
export function projectPosePoint(
  point,
  {
    sourceWidth,
    sourceHeight,
    displayWidth,
    displayHeight,
    rotation = 0,
    fit = "contain",
  },
) {
  let x = point.x,
    y = point.y,
    w = sourceWidth,
    h = sourceHeight;
  if (rotation === 90) {
    [x, y] = [h - y, x];
    [w, h] = [h, w];
  } else if (rotation === 180) {
    [x, y] = [w - x, h - y];
  } else if (rotation === 270) {
    [x, y] = [y, w - x];
    [w, h] = [h, w];
  }
  const scale = (fit === "cover" ? Math.max : Math.min)(
    displayWidth / w,
    displayHeight / h,
  );
  return {
    x: x * scale + (displayWidth - w * scale) / 2,
    y: y * scale + (displayHeight - h * scale) / 2,
  };
}
export function smoothLivePose(previous, current, dt) {
  if (!current) return null;
  if (!previous || !(dt > 0 && dt <= 0.16)) return current;
  const lengths = [
    [11, 27],
    [12, 28],
  ]
    .filter(([a, b]) => confident(current[a]) && confident(current[b]))
    .map(([a, b]) =>
      Math.hypot(current[a].x - current[b].x, current[a].y - current[b].y),
    );
  const scale = Math.max(0, ...lengths);
  return current.map((p, i) =>
    confident(p) &&
    confident(previous[i]) &&
    Math.hypot(p.x - previous[i].x, p.y - previous[i].y) < scale * 0.035
      ? {
          ...p,
          x: 0.85 * p.x + 0.15 * previous[i].x,
          y: 0.85 * p.y + 0.15 * previous[i].y,
        }
      : p,
  );
}
