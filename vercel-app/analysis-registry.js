import { ANALYSIS_CATALOG, exerciseById, HANDSTAND_METRICS } from "./analysis-catalog.js";
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

// Family display and filtering derive from the same registered, runnable options.
// This never makes a family itself dispatchable or enables additional variants.
export const variationsFor = id => ANALYSIS_CATALOG.filter(x => x.familyId === id && x.variation && x.id !== id);
export function analysisAvailability(id) {
  const options = [exerciseById(id), ...variationsFor(id)].filter(Boolean);
  const active = options.filter(x => analysisFor(x.id));
  const experimental = options.filter(x => !analysisFor(x.id) && analysisFor(x.id, {allowExperimental:true}));
  return {status:active.length ? 'active' : experimental.length ? 'experimental' : 'unavailable',
    count:active.length + experimental.length, hasVariations:variationsFor(id).length > 0};
}
export function analysisAvailabilityLabel(id) {
  const {status,count,hasVariations} = analysisAvailability(id);
  if(status === 'active') return 'ניתוח פעיל';
  if(status === 'experimental') return hasVariations ? `ניתוח ניסיוני · ${count} וריאציות · ללא ציון` : 'ניתוח ניסיוני · ללא ציון';
  return 'ניתוח לא זמין';
}
