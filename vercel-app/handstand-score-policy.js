// These legacy bands are an image-plane index, not a validated coach grade.
// Visibility is an observation gate; it is never a probability of angle accuracy.
export const HANDSTAND_SCORE_POLICY = Object.freeze({
  version:'projected-technique-v1',
  calibrationStatus:'unvalidated',
  measurementSpace:'image-plane-2d',
  cameraCalibration:'unknown',
  durationWeight:0,
  bands:Object.freeze({banana:Object.freeze([.045,.18]),lean:Object.freeze([4.5,22.5]),
    shoulder:Object.freeze([12,52.5]),elbow:Object.freeze([12,45]),sway:Object.freeze([.015,.075])}),
  weights:Object.freeze({banana:.3,lean:.2,shoulder:.2,elbow:.15,sway:.15}),
});

export function projectedMetricScore(name,value) {
  const limits=HANDSTAND_SCORE_POLICY.bands[name];
  if(!limits || !Number.isFinite(value)) return null;
  const [good,bad]=limits;
  return Math.max(0,Math.min(100,100*(bad-value)/(bad-good)));
}

export function separateScoreDimensions(scores,durationSeconds) {
  const weights=HANDSTAND_SCORE_POLICY.weights;
  if(!Object.keys(weights).every(n=>Number.isFinite(scores?.[n])&&scores[n]>=0&&scores[n]<=100)) return null;
  const weighted=Object.keys(weights).reduce((sum,n)=>sum+scores[n]*weights[n],0);
  const techniqueOnly=Object.keys(weights).filter(n=>n!=='sway').reduce((sum,n)=>sum+scores[n]*weights[n],0)/(1-weights.sway);
  return {combinedIndex:Math.max(1,weighted),techniqueOnlyIndex:techniqueOnly,
    stabilityIndex:scores.sway,durationSeconds};
}
