import { exerciseById, HANDSTAND_METRICS } from "./analysis-catalog.js";
export const ANALYSIS_ENGINES = Object.freeze({
  "handstand-v3-fixed": Object.freeze({
    exerciseId: "handstand",
    module: "./handstand-engine.js",
    metrics: HANDSTAND_METRICS,
  }),
  'front-lever-observation-v1': Object.freeze({
    familyId:'front-lever', module:'./front-lever-analysis.js', metrics:[], experimental:true,
  }),
});
export function analysisFor(exerciseId, {allowExperimental=false}={}) {
  const exercise = exerciseById(exerciseId);
  return exercise && (exercise.status === "available" || (allowExperimental && exercise.experimental))
    ? ANALYSIS_ENGINES[exercise.engineId] || null
    : null;
}
