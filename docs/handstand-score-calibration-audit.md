# Handstand score calibration audit — 2026-11-01

Checkpoint: Draft #34 at `d16fc10`. No scoring thresholds, weights, pose
acquisition, hold detection, entry grading, Front Lever or Coach logic are
changed by this follow-up. There is not enough labeled evidence to fit a new
coach-equivalent 1–100 scale or verify an 80–85 grade for the supplied attempt.

## What the current number means

The body-line thresholds originate in repository commit `0d4ef40`: `.03/.12`
multiplied by the global `SCALE=1.5`, yielding `.045/.18`. No supporting dataset,
biomechanical reference or threshold-validation experiment is recorded there.
The reviewed sources below do not establish this exact percentage cutoff.

The mapping is already continuous and linear between 4.5% and 18%, with
saturation outside that band. At the measured median offset 19.019746%, its
unclipped value is negative, so the component is zero. This is a scoring-policy
choice, not a missing observation converted to zero.

For three projected joint centers, let the perpendicular hip offset be `r`
times the shoulder–ankle axis length, and let the hip's position along that axis
be `t` (0 < t < 1). The projected hip deficit is
`atan(r/t) + atan(r/(1-t))`, at least `2*atan(2*r)`. Thus `r=.18` corresponds
to a projected deficit of at least approximately 39.6 degrees. This geometric
identity does not identify lumbar curvature, anatomical pelvic tilt, a true 3D
joint angle, or an appropriate point deduction.

FIG's hold-position guidance uses angular categories and execution deductions,
including small/medium/large deviations. It does not define a pelvis offset of
18% as zero on a separately weighted 0–100 component. Its competition E-score
cannot be directly transplanted into MOVALYT's standalone index without a
declared scoring model and validation. The 2024 handstand study below illustrates
the use of independent experienced raters and matched front/side videos; its
published supplement contains analysis data, not an accessible labeled video
corpus suitable for fitting this app's thresholds.

## Evidence about camera and tracking

- Google's `visibility` describes whether a joint is visible, not a calibrated
  probability that its angle is accurate. The app now reports visibility,
  observation coverage and sample percentiles with that distinction explicit.
- The camera-view study below compared OpenPose with marker-based motion capture
  and found view-dependent errors and projection effects. It supports testing
  viewpoint sensitivity; its error magnitudes must not be assigned to MediaPipe
  handstands as if they were this app's measured uncertainty.
- An ideal pinhole camera preserves collinearity: camera angle alone cannot bend
  a truly straight three-point line with perfectly known landmarks. It can
  magnify or hide a nonzero bend. In our analytic experiment, a fixed 20-degree
  3D bend spans line indices 0–100 across yaw 0/45/75 and pitch 0/30/60 degrees.
  The straight control stays 100 in all nine views. Extreme views here are
  stress cases, not estimated camera angles of the user's video.
- The same real MediaPipe inference was also observed for its optional 3D world
  predictions, only through the local QA server. Over the unchanged 174-sample
  hold, median shoulder deficit is 28.71 degrees in model 3D vs 33.10 in image
  2D, and elbow deficit 18.16 vs 28.17. Model 3D body-line ratio is 17.02% vs
  19.02% in 2D. These are correlated outputs of one model, not independent motion
  capture or camera calibration. No 3D score or corrective bonus is shipped.

The original review of visible-side overlays remains useful for spotting gross
mis-tracking, but cannot exclude a systematic error in anatomical joint-center
location. Consequently neither the existing 48 nor the subjective 80–85 is a
validated ground-truth athlete grade.

## What changed in code

`handstand-score-policy.js` centralizes the **unchanged** mapping with explicit
`calibrationStatus: unvalidated`, image-plane space and unknown camera calibration.
Nonfinite/missing metric inputs return `null`, while genuine finite measurements
past a zero band remain zero. Visibility never earns a score bonus or penalty.

The result now exposes three separate dimensions:

```text
combinedIndex = .30*line + .20*lean + .20*shoulder + .15*elbow + .15*stability
techniqueOnlyIndex = (.30*line + .20*lean + .20*shoulder + .15*elbow) / .85
stabilityIndex = stability component
durationSeconds = observed hold interval, with zero point weight
```

The combined floor of 1 is retained. Technique-only can be zero. This extraction
does not lower the old score: the extra value was already implicit in its weights.
The technical caption shows technique and stability separately; the measurement
notice identifies an experimental, uncalibrated index. Coach files are untouched.
Per-component evidence reports eligible samples, coverage, median minimum joint
visibility, observed P10/P90, units and linear/full/zero-band status. Sample
percentiles describe variation; they are not anatomical confidence intervals.

## Before/after on the authorized compressed copy

Three fresh actual local uploads use pinned MediaPipe 0.10.14 Lite, CPU Worker
and Chromium with verified locally served assets. Complete new diagnostics
repeat identically, with zero page errors and zero outbound POSTs.

| Dimension | d16fc10 | This change |
| --- | --- | --- |
| Duration, each of 3 uploads | 17.3s | 17.3s |
| Combined rounded index | 48 | 48 |
| Line | 0 | 0 |
| Lean | 77.2429 | 77.2429 |
| Shoulder | 47.8890 | 47.8890 |
| Elbow | 50.9984 | 50.9984 |
| Stability | 100 | 100 |
| Technique without stability | implicit 38.4425 | explicit 38.4425 |

Identical-input replay against the actual `d16fc10` module preserves the entire
hold object, raw metric values, component scores and total exactly on all three
fresh private traces and all twelve new UCF traces. Timing and sampling source
files are unchanged. No hold-time reward or global numerical uplift is added.

An offline coordinate stress test applies 1,024 constant per-joint corner-offset
patterns throughout the fixed interval at ±2, ±4 and ±8 **per image coordinate**
in source pixels. Combined-index envelopes are 40.78–55.17, 33.62–64.59 and
27.69–78.52, respectively. Joint displacement can be sqrt(2) times the per-axis
offset. These scenario envelopes are not exhaustive continuous bounds, confidence
intervals, estimated tracking errors or a basis for choosing a replacement score.
They illustrate sensitivity without secretly varying timing or fitting 85.

## New actual-video comparison and its limits

Public source URLs and original-file checksums are in
`tests/fixtures/handstand-calibration-corpus.json`; media stays outside Git and
is never downloaded in CI. Each successfully decoded input below ran three times.

| Input | Observed source context | Hold / total | Line / lean / shoulder / elbow / stability |
| --- | --- | --- | --- |
| UCF g01 c01 | cropped body, stair walking | unavailable | unavailable |
| UCF g02 c01 | distant/occluded stair scene | no pose/grade | unavailable |
| UCF g03 c01 | cropped legs, hand walking | unavailable | unavailable |
| UCF g05 c02 | walking/stepping on mats, straighter projected line | 2.12s / 70 | 100 / 75.85 / 71.10 / 72.77 / 0 |
| University handstand-to-roll, normalized H.264 | brief educational demonstration | 0.5s / no grade | insufficient duration |

The UCF g05 technique-only index is 82.71 and its stability index is 0; its
combined index is 70.31. This demonstrates the separation of observed line and
motion, not that its athlete belongs to an independently verified skill class.
Action-class labels and an instructional video's title are not coach grades.
These clips do **not** establish discrimination among weak/medium/good/excellent
static handstands. Three cropped/no-pose abstentions are robustness outcomes,
not low skill labels or proof of good recall. Original university HEVC with
-90-degree rotation timed out before inference in test Chromium; its separately
recorded H.264 derivation succeeds. This is a codec/presentation limitation,
not an athlete scoring result or a demonstrated iPhone failure.

## Validation and what is still missing

- 127/127 Node tests pass (119 prior plus eight policy/evidence/projection tests).
  New tests preserve finite real zeros, reject invalid measurements, verify
  continuous monotone mapping and immutable policy, separate duration/stability,
  and distinguish visibility/variation from calibrated accuracy.
- Three fresh full private uploads preserve 17.3s and all numeric scores exactly.
  The scored public clip and blank/upright/sideways negatives also ran three more
  times each after the changes, with repeated diagnostics and no false grades.
- Raw private files, world/2D traces, scenario dumps, diagrams and full run reports
  remain local. The first requested .05s sample in this fresh run has a reported
  presentation time of 0s, outside the selected attempt. No acquisition correction
  is inferred from that observation; physical frame/timestamp QA remains needed.
- Absolute calibration still needs full-body videos spanning the four intended
  levels, independent coach ratings under one declared rubric, matched views of
  the same attempts and reviewed joint annotations. Separate athletes for fitting
  and held-out testing; assess rater agreement, ranking, score error, false
  positives and abstentions by viewpoint. Predefine acceptance criteria before
  changing bands. No sample size or numerical acceptance threshold is invented
  from the current convenience set.

The Draft is suitable for a controlled physical-iPhone/Safari investigation,
beginning with the same H.264 file and three repeated uploads. Device/codec
coverage and professional score validity remain unverified. No IPA, deployment,
merge, paid service or workflow invocation is part of this task.

## Primary references

1. [FIG MAG Code of Points 2025–2028, Article 9.2, pages 18–19](https://www.worldgymnastics.sport/publicdir/rules/files/en_1.1%20-%20MAG%20Code%20of%20Points%202025-2028.pdf).
2. [Malíř et al., 2024, handstand evaluation with experienced raters and two views](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0302922).
3. [Baldinger et al., 2025, camera-view validation against motion capture](https://doi.org/10.3390/s25030799), [author-university full text](https://mediatum.ub.tum.de/doc/1774181/1774181.pdf). OpenPose study, not MediaPipe handstand validation.
4. [Google Pose Landmarker output definitions](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/python#handle_and_display_results).
