const round = value => Math.round(value * 10) / 10;

export function playbackRateForPoseCost(poseMs, fps = 10) {
  if (!Number.isFinite(poseMs) || poseMs <= 0 || !Number.isFinite(fps) || fps <= 0) return 1;
  const frameBudget = 1000 / fps;
  return Math.max(1, Math.min(2, round((frameBudget * 0.95) / poseMs)));
}

export function updatePoseCost(previousMs, sampleMs) {
  if (!Number.isFinite(sampleMs) || sampleMs < 0) return previousMs || 0;
  if (!Number.isFinite(previousMs) || previousMs <= 0) return sampleMs;
  return previousMs * 0.75 + sampleMs * 0.25;
}

export function reportAnalysisTiming(detail) {
  const safe = Object.fromEntries(Object.entries(detail).map(([key, value]) => [
    key,
    typeof value === "number" && Number.isFinite(value) ? round(value) : value,
  ]));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("movalyt:analysis-timing", { detail: safe }));
    console.info("[MOVALYT analysis timing]", safe);
  }
  return safe;
}
