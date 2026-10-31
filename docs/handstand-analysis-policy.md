# Intelligent handstand analysis — policy v1

Baseline: PR #29 HEAD `d39701c`. Local-only, 2D camera-plane evidence. This is an
uncalibrated coaching aid, not a fall diagnosis, certification of unsupported
balance or a measurement of finger pressure. No personal test video is used.

## Scoring decision (before implementation)

Keep `overallHandstandScore` and the existing metric thresholds/weights unchanged:
hold = body line 30%, lean 20%, shoulder 20%, elbow 15%, sway 15%; existing
SCALE=1.5. If ascent was observed, combine hold 70% / ascent 30%, renormalizing
missing phases. Existing history model IDs remain valid because values do not
change. Do not collapse endurance into technique or create a new unvalidated
composite. A 3s and 20s identical-line attempt may retain the same legacy score.

Present three distinct dimensions: existing score (explicitly labeled), observed
hold time, and measured control (pelvis displacement/trend, not another arbitrary
0–100 score). Short observed holds (<5s) must change the headline, primary issue,
training pair and next goal. Five seconds is a coaching practice target, not a
biomechanical pass threshold or a deduction. Longer clips earn no unobserved
seconds. A future composite requires labeled coach-reviewed clips, validation
across camera angles/ages/devices, and a new history model version before release.

## Temporal evidence

Use original, unsmoothed landmarks and actual sampled timestamps in seconds.
Confidence >=0.65 for core joints, finite on-image coordinates. This is an
additional conservative evidence gate, not a change to MediaPipe or legacy
scoring thresholds. Fixed side chosen by coverage; never switch sides mid-event.
Require continuous reliable observations; do not bridge occlusion or camera gaps.

An observed near-vertical reach requires three consecutive samples within 12° of
vertical. A hold candidate requires the supported inverted ordering, inclination
<=25°, close enough ankles when both visible, and no rapid vertical leg
transition (>0.45 estimated body lengths/s relative to wrists). This excludes
ascent/leg lowering from hold time. Scale uses the largest shoulder–ankle, twice
shoulder–hip or twice wrist–shoulder distance to remain finite during exit.
Longest continuous interval
>=0.5s, at least six samples, duration = last timestamp - first timestamp. This
measures a visible inverted interval, not proven free balance. It can include
corrections and imperfect body line. Mark left/right censoring when the clip or
tracking does not establish the start/end. A clipped interval is a lower bound;
missing data never becomes a duration or zero score.

Ascent needs a reliable observed non-inverted-to-inverted transition; its quality
is reported only if the existing ascent module also has evidence. Body-line,
shoulder and elbow quality remain the existing measurements. Control summarizes
robust pelvis-to-wrist displacement, tilt, and changes over a continuous hold.
Single-frame glitches cannot establish an event. Out-of-frame/cropped joints and
low-confidence runs are rejected. Camera motion, perspective, support and hand
walking can confound all 2D inferences and must remain explicit limitations.

## Ending / fall analysis

Separate module examines up to 1.5s before the end of the hold plus observed exit.
Report signed pelvis displacement and speed relative to the wrists (normalized
by the hold's body length), tilt/direction, shoulder and line change, optional
leg motion and growing oscillation when enough data exists. Directions are
screen-left/right, never anatomical forward/backward from an unknown camera.

Require an actual departure from the inverted position or inclination >35°,
not just a stationary-hold velocity gate ending (hand walking/leg adjustments
can end that interval). Require continuous reliable departure and post-departure
observations before
calling an ending compatible with loss of balance or a controlled descent.
Classifications are `possible-balance-loss`, `controlled-descent-compatible`,
`unclear`, `video-ended`, `tracking-lost` or `not-observed`; none asserts intention,
impact, injury or a cause of falling. Clipped endings cannot prove a fall, even
if pre-end drift is visible. Sudden drift/tilt suggests a possible balance loss;
a gradual observed leg lowering with no preceding abrupt drift is compatible
with a controlled descent. Ambiguous evidence remains unclear. Possible causes
must be phrased as hypotheses tied to measured changes. Never infer finger
pressure, weakness, fear or fatigue from landmarks.

## Feedback contract

Every successful legacy analysis receives measured strengths (or explicitly
unknown), one prioritized issue, timestamped numerical evidence, a bounded
possible explanation or 'cannot determine', two conservative relevant practice
drills, and a next target only where continuous reliable timing supports it.
Censored/weak segments instead request a complete side-view recording. No cloud
request, new model or raw video persistence. Exercise suggestions are practice
options, not personalized medical/training prescriptions.

## Display overlay

Separate rendering-only filter: small, symmetric 3-sample correction at most,
only when adjacent joints are confident, close in time and displacement is small.
No interpolation across missing/weak samples; fast/large movement stays raw. No
filter output enters scoring, phases, angle readouts or stored metrics. Same
renderer in processing and playback. CSS-size-aware lime strokes/joint rings;
video and pose share one canvas, so contain/crop scaling cannot drift apart.
Decoded browser video orientation is the source of truth. Truly sideways footage
may still be unrecognizable to MediaPipe; do not invent a rotated pose to fix it.

## Required comparison/tests

Synthetic temporal landmark fixtures (clearly labeled tests, never product data):
good ascent + 3s/20s hold, significant sway, arch, controlled lowering, possible
balance loss, clipped ending, unreliable/occluded tracking; exact score parity
against legacy. Display tests: confidence/gaps, impulse/real motion, pixel
geometry and rotations/contain/cover mappings. Real existing motion clip: actual
MediaPipe, cancel/retry, playback/toggle/angles, refresh/history and mobile widths;
before/after captures at the same timestamp. Rotated/portrait/landscape derived
fixtures must be distinguished from independently annotated ground truth.

### Provisional descriptive gates

`TEMPORAL_POLICY` and `FALL_POLICY` expose units and defaults separately from the
unchanged legacy scoring policy. Control uses 10–90 percentile pelvis range >8%
of estimated body scale or tilt range >12°. Possible balance loss additionally
requires at least five consecutive departure samples spanning 0.4s, a sustained
three-sample velocity burst (>0.18 body lengths/s or >45°/s), plus prior drift
>6%, tilt change >8°, or supported growing oscillation. These conservative gates
are engineering defaults for describing visible motion, not validated coaching
or biological boundaries. They do not alter numerical scores. Camera-specific
calibration is deliberately not claimed; labeled independent footage is required.

### PR #30 observation refinement

Entry phase observability is now independent of numeric entry-score eligibility.
A separate local observer requires visible preparation, measured ankle rise and
three complete near-vertical samples. It preserves the existing 0.65 evidence
confidence, eight valid samples and 80% coverage. Its observation never changes
the numeric score or fills missing landmarks. A pelvis can stay at the same
image height while the body rotates into a handstand, so the legacy 15% upward
pelvis displacement gate is not used to claim whether the phase was seen. It
remains unchanged in the legacy score path; missing entry grades stay missing.
Default overlay now shows only 12 core joints; all-point mode is opt-in. The
canonical report puts detailed metrics in collapsed advanced details.
