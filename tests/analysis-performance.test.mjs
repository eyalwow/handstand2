import test from "node:test";
import assert from "node:assert/strict";
import {playbackRateForPoseCost,updatePoseCost,reportAnalysisTiming} from "../vercel-app/analysis-performance.js";

test("analysis playback adapts to measured pose cost without dropping below real time",()=>{
 assert.equal(playbackRateForPoseCost(20),2);
 assert.equal(playbackRateForPoseCost(40),2);
 assert.equal(playbackRateForPoseCost(80),1);
 assert.equal(playbackRateForPoseCost(180),1);
 assert.equal(playbackRateForPoseCost(NaN),1);
 assert.equal(updatePoseCost(40,80),50);
 assert.equal(updatePoseCost(0,60),60);
});

test("analysis timing report rounds numeric fields without changing labels",()=>{
 assert.deepEqual(reportAnalysisTiming({outcome:"scored",scanMs:123.456,poseFrames:27}),{outcome:"scored",scanMs:123.5,poseFrames:27});
});
