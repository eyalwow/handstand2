import { exerciseById, HANDSTAND_METRICS } from "./analysis-catalog.js";
export const ANALYSIS_ENGINES = Object.freeze({
  "handstand-v3-fixed": Object.freeze({
    exerciseId: "handstand",
    module: "./handstand-engine.js",
    metrics: HANDSTAND_METRICS,
  }),
});
export function analysisFor(exerciseId) {
  const exercise = exerciseById(exerciseId);
  return exercise?.status === "available"
    ? ANALYSIS_ENGINES[exercise.engineId] || null
    : null;
}
