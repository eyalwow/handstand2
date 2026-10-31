# Compressed-source validation of Draft #34

This follow-up uses the authorized compressed copy: 68.9s, H.264, 512×896,
688 samples per full upload. The original uncompressed attachment exceeds the
executor's 32 MiB transfer limit. Compression can change inference; these are
not measurements of the inaccessible original bytes or physical iPhone tests.
Private media, extracted frames, pose traces and full result dumps stay outside
Git. Only aggregate findings are recorded here.

## Repeated real inference

Three independent full application uploads ran at each checkpoint with real
pinned MediaPipe 0.10.14 Lite, CPU Worker, Chromium and locally served verified
assets. No inference mocks, input poses or scores were injected. All three
complete diagnostics match at each checkpoint. The three final raw pose traces
also match each other. No page errors or outbound POSTs occurred.

| Checkpoint | Main hold interval | Seconds in runs 1 / 2 / 3 | Total in runs 1 / 2 / 3 | Line | Lean | Shoulder | Elbow | Sway |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #33 / db6fe32 | 42.35–62.05 | 19.7 / 19.7 / 19.7 | 48 / 48 / 48 | 0 | 78.50 | 46.73 | 50.02 | 100 |
| Initial #34 / 20dadce | 42.333–62.133 | 19.8 / 19.8 / 19.8 | 48 / 48 / 48 | 0 | 78.63 | 46.80 | 49.85 | 100 |
| Updated #34 / temporal-v3 | 42.333–59.633 | 17.3 / 17.3 / 17.3 | 48 / 48 / 48 | 0 | 77.24 | 47.89 | 51.00 | 100 |

The original reported 13.8s and repeatability failures were not reproduced on
this compressed copy in Chromium: even #33 is repeatable here. Do not claim
that this establishes repeatability of the uncompressed original, Safari or all
devices. Replaying the **identical captured final poses** through #33 gives
19.7s / 48 and through updated #34 gives 17.3s / 48. This isolates the numerical
effect of the interval-policy change from fresh inference/input differences.

## Frame review and the bounded fix

The main attempt becomes eligible around 42.3s. Frames near 56s remain inverted;
there is no visible departure that justifies splitting there. Around 59.7s the
support begins progressively lowering: shoulders approach the wrists while
elbows close. Feet remain high until about 62.2s. Merely testing inversion had
included this dynamic lowering in held-support time.

The new boundary requires a continuous 0.6s observation with valid, noncollapsed
arms, shoulder lowering relative to the wrists >=2.5% of body scale, elbow
closure >=10 degrees, wrist drift <=3% of body scale, and compatible progression
on >=80% of steps. Both changes must already be beginning at the window's
start; a future movement cannot backdate the boundary into a stationary prefix.
Robust two-sample endpoint medians reduce isolated detector noise. These are
provisional kinematic gates, not validated biological cutoffs.

The observed window here is 59.733–60.333s: shoulder drop 3.16% of body scale,
elbow closure 10.71 degrees, wrist drift 0.26%. The last preceding observed hold
sample is 59.633s. Confirmation uses future frames, so this is offline timing,
not zero-latency live detection. The onset is a sampled estimate, not a claim of
0.1s anatomical ground truth. The reported 17.3s excludes the lowering phase;
the longer 19.8s interval describes inversion continuing through that phase.

Constant bent arms remain eligible and are graded technically. A quick
correction or camera translation alone cannot trigger this boundary. Continued
lowering cannot immediately seed another hold: require return to the prior
support height/angle (1% body-scale and 5-degree slack), or a new inversion after
a visible non-inverted posture. No samples are bridged across missing tracking.
The ending remains descriptive, with no claim of intention or a diagnosed fall.
Coach files are unchanged; the engine supplies the observed phase boundary.

## Why body line is still zero

All 174 selected samples have usable geometry. The selected visible right side
has median minimum core-joint visibility 98.93%; the hidden left elbow is often
below 0.5 and is excluded. Frame overlays show the selected hip behind the
projected shoulder–ankle axis. The final median normalized perpendicular pelvis
offset is **0.19019746 (19.02%)**. This is finite, not a missing/zero-length angle.

The unchanged component mapping is:

```text
lineScore = clamp(100 * (0.18 - medianAbsoluteOffset) / (0.18 - 0.045), 0, 100)
```

An offset >=18% therefore saturates at zero. The old horizontal-intercept metric
was 18.72%; the initial perpendicular metric was 18.49%. The final interval's
19.02% is higher because it excludes later lowering frames with a smaller pelvis
offset. Changing this zero would require changing the scoring policy, not fixing
an arithmetic failure demonstrated by these measurements.

Final median lean is 8.60 degrees, shoulder deficit 33.10 degrees, elbow deficit
28.17 degrees and robust sway 0.685% of body length. With unchanged weights,
the total is 47.676, rounded to 48. No entry grade is added. Duration contributes
no points. No score or interval is forced to the subjective 85 / 18 references.

These are projected measurements and heuristic bands, not verified anatomical
angles or professionally calibrated athlete grades. High visibility does not
prove accuracy; oblique-camera bias and the severity of the zero band still
need labeled multi-view/coach-reviewed validation. One clip cannot justify
widening the bands or claiming that 48 is a universal ground-truth grade.
The timeline's ascent observation can describe an earlier attempt in this
multi-attempt clip. No numeric ascent grade enters this result. Associating
coaching observations with the selected attempt remains separate work; Coach
logic and files are deliberately unchanged in this task.

## Regression and delivery

119/119 Node tests pass, including five follow-up tests. The new support-lowering
regression fails before the implementation and passes after it. Coverage includes
constant bent support, brief recovery, camera translation, collapsed/occluded
evidence, suppression of re-seeding during descent, a recovered/new attempt, and
a genuine finite zero with an unreliable hidden side. Previous ankle-correction,
true-exit, tracking, timing, negative and frozen legacy-score tests still pass.

Five existing integration/negative fixtures were each uploaded three more times
through real MediaPipe after the change. Public walking footage remains 0.72s
without a grade; the static integration fixture remains 3.8s / 76. Blank, upright
and sideways footage receives no hold or grade. Full diagnostics repeat exactly.
Two negative excerpts from the authorized compressed source (preparation at
8–29s and after departure at 63s onward) were also uploaded three times each
with fresh actual MediaPipe inference. Neither produces a hold or a grade;
complete diagnostics match, with zero page errors and zero outbound POSTs.

Use `scripts/verify-handstand-measurement.py --phase after --runs 3` for repeated
candidate uploads; `--phase both` compares against #33. Optional `--trace-dir`
captures original Worker outputs locally and rejects paths inside the repository.
Use `--runs 1` only for diagnosis, not as a repeatability validation.

Draft #34 stays stacked directly on #33. No merge, Production deployment, IPA,
paid service or workflow invocation. Front Lever, Coach, Capacitor/native and
workflow files are unchanged. Private media/frames/poses/traces remain local.
