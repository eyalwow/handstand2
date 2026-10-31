import test from 'node:test';
import assert from 'node:assert/strict';
import {HANDSTAND_SCORE_POLICY,projectedMetricScore,separateScoreDimensions} from '../vercel-app/handstand-score-policy.js';
import {measureHandstand} from '../vercel-app/handstand-measurement.js';
import {cameraProjectionExperiment} from '../scripts/audit-handstand-calibration.mjs';

test('legacy line mapping is continuous, monotone and saturates at the documented endpoints',()=>{
  assert.equal(projectedMetricScore('banana',.045),100);
  assert.equal(projectedMetricScore('banana',.18),0);
  let previous=100;
  for(let i=0;i<=200;i++) {
    const score=projectedMetricScore('banana',i/1000);
    assert.ok(score>=0&&score<=previous);previous=score;
  }
  assert.ok(projectedMetricScore('banana',.18-1e-8)<.001);
});
test('missing or nonfinite measurements cannot be represented as a real zero',()=>{
  for(const value of [null,undefined,NaN,Infinity])assert.equal(projectedMetricScore('banana',value),null);
  assert.equal(projectedMetricScore('banana',.3),0);
  assert.equal(projectedMetricScore('unknown',0),null);
  assert.equal(separateScoreDimensions({banana:NaN},10),null);
  assert.equal(separateScoreDimensions({banana:101,lean:100,shoulder:100,elbow:100,sway:100},10),null);
});
test('the policy is explicitly uncalibrated and cannot be silently mutated',()=>{
  assert.equal(HANDSTAND_SCORE_POLICY.calibrationStatus,'unvalidated');
  assert.equal(HANDSTAND_SCORE_POLICY.cameraCalibration,'unknown');
  assert.throws(()=>{HANDSTAND_SCORE_POLICY.bands.banana[1]=.4;},TypeError);
  assert.throws(()=>{HANDSTAND_SCORE_POLICY.weights.sway=.9;},TypeError);
});
test('stability and duration remain separate from the technique-only index',()=>{
  const scores={banana:0,lean:77.24288196152942,shoulder:47.88899517483624,elbow:50.99844613907294,sway:100};
  const short=separateScoreDimensions(scores,3),long=separateScoreDimensions(scores,20);
  assert.equal(short.combinedIndex,47.67614234813407);
  assert.equal(short.techniqueOnlyIndex,38.4425204095695);
  assert.equal(long.combinedIndex,short.combinedIndex);
  assert.equal(long.techniqueOnlyIndex,short.techniqueOnlyIndex);
  assert.equal(separateScoreDimensions({...scores,sway:0},20).techniqueOnlyIndex,short.techniqueOnlyIndex);
  assert.equal(long.stabilityIndex,100);assert.equal(long.durationSeconds,20);
});
test('the unchanged mapping differentiates analytic technical levels without giving a duration bonus',()=>{
  const totals=[];
  for(const fraction of [0,.25,.5,1]) {
    const scores=Object.fromEntries(Object.entries(HANDSTAND_SCORE_POLICY.bands).map(([k,[good,bad]])=>[k,projectedMetricScore(k,good+fraction*(bad-good))]));
    totals.push(separateScoreDimensions(scores,100).combinedIndex);
  }
  for(let i=1;i<totals.length;i++)assert.ok(totals[i]<totals[i-1]);
  assert.equal(totals[0],100);assert.equal(totals.at(-1),1);
});
test('visibility and temporal variation are reported as observations, not accuracy probabilities',()=>{
  const frames=Array.from({length:31},()=>{
    const f=Array.from({length:33},()=>({x:300,y:200,v:1}));
    for(const side of [0,1])for(const [i,y]of [[11,500],[13,600],[15,700],[23,330],[27,120]])f[i+side]={x:300,y,v:.9};
    return f;
  });
  const result=measureHandstand({frames,timestamps:frames.map((_,i)=>i/10),width:600,height:800});
  assert.equal(result.hold.hold,3);
  assert.equal(result.hold.total,100);
  const evidence=result.diagnostics.metricEvidence.banana;
  assert.equal(evidence.medianMinimumVisibility,.9);
  assert.equal(evidence.coverage,1);
  assert.equal(evidence.observedP10,0);assert.equal(evidence.observedP90,0);
  assert.equal(result.diagnostics.scorePolicy.calibrationStatus,'unvalidated');
  assert.equal(result.diagnostics.scoreDimensions.durationSeconds,3);
});
test('a perspective camera preserves a truly collinear body line in the analytic experiment',()=>{
  const straight=cameraProjectionExperiment().filter(x=>Math.abs(x.trueHipDeficitDegrees)<1e-5);
  assert.equal(straight.length,9);
  assert.ok(straight.every(x=>Math.abs(x.projectedOffset)<1e-12&&x.lineIndex===100));
});
test('the same nonzero 3D bend can have different projected scores; no camera bonus is inferred',()=>{
  const bent=cameraProjectionExperiment().filter(x=>Math.abs(x.trueHipDeficitDegrees-20)<1e-5);
  assert.equal(bent.length,9);
  assert.equal(Math.min(...bent.map(x=>x.lineIndex)),0);
  assert.equal(Math.max(...bent.map(x=>x.lineIndex)),100);
  assert.equal(HANDSTAND_SCORE_POLICY.cameraCalibration,'unknown');
});
