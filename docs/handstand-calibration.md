# Handstand calibration audit — 2026-10-31

Stacked on Draft PR #32 at `fceaedefd2cbd7633bc3575868ce33c3abddd283`.
PR #29 → #30 → #31 → #32 were open Drafts, not merged when checked.

## Proven issue and bounded fix

The temporal observer previously treated any adjacent sample failing `hold` as
an observed end. A motion or tilt gate can fail while the athlete remains
inverted. The ending observer already correctly refuses to infer a departure
without sustained visible evidence, but the interval could still be marked
uncensored and eligible for a duration-based coaching target.

The interval now also requires the existing ending observer's sustained
departure evidence before setting `endObserved`. The ending is computed once
and reused. No confidence, geometry, velocity, minimum-duration or gap threshold
is changed. No samples are joined or extrapolated. Scoring and duration formulas,
raw landmarks, selection of the longest run, and start-boundary logic are unchanged.

The regression failed before the fix (`endObserved` was true for an inverted
adjustment without an observed departure). It now remains censored and cannot
license a duration target. Sustained visible exits still qualify; brief exits,
weak tracking and missing evidence do not. Existing positive descent and
possible-balance-loss tests, frozen numeric score regressions, and no-pose,
split-leg, fragmented/timing/visibility negatives remain covered.

## Interpretation of the two analysis paths

The legacy scorer selects a globally visible side, uses a strict inverted-pose
run with short gap bridging, and grades median projected body/arm measurements
plus robust sway. Its reliability gates reject a relaxed fallback, substantial
leg separation, short/poorly covered/low-visibility tracks. The temporal observer
uses source timestamps, stronger per-joint quality checks and motion/tilt gates
without gap bridging. `renderHandstandInsights` replaces the earlier legacy
duration with the temporal interval. These windows can differ; the displayed
duration is not the interval used for the numeric grade. This remains a limitation,
not an unreviewed change to grading policy.

Duration is not a weighted score component. Stability is only one component of
the legacy technique grade. Visibility is MediaPipe's tracking value, not a
calibrated probability of joint accuracy. Projected 2D angles from an oblique
camera are not anatomical ground truth. Display smoothing does not alter raw
scoring or temporal measurements. No arbitrary target score or duration is used.

## Validation and limits

- Before: 100/100 Node tests. Added assertions reproduce the specific boundary bug.
- After: 101/101 Node tests, module syntax and diff whitespace checks pass.
- The authorized private clip was available and processed with actual pinned
  MediaPipe 0.10.14 / Lite model, CPU Worker and production fixed sequential
  sampling. A full local application upload was also checked. Library/WASM/model
  assets were served locally for network isolation; inference was not mocked.
- The exact original reported duration was not reproduced, but repeated full
  application inference produced varying nearby short intervals as well as a
  longer interval. A captured short run split on the ankle-relative-to-wrist
  vertical-velocity gate while inversion, visibility, tilt and leg-gap gates
  still passed. The later hold fragment remained observed. This is not evidence
  of an actual departure, nor does it license removing motion gates that also
  reject kicks/descents. The origin of inference/input variation remains unresolved.
- Replaying the identical captured landmarks through baseline and patched code
  preserves duration and changes only end certainty/censoring. Separate fresh
  inference runs must not be presented as a causal numeric before/after comparison.
  The duration/repeatability problem is not declared fixed. Private frame traces,
  numerical before/after results,
  comparison annotations and contact sheets are delivered locally, excluded from
  this repository and PR. The subjective visual score is not a validation label.
- No current iPhone/native binary, physical-device reproduction, population-level
  calibration, or accuracy claim. Do not merge based on this audit alone.

No private media, poses or diagnostic dumps are committed. Front Lever, Coach,
SSO, Capacitor/native files and Production are untouched. Commit uses `[skip ci]`;
no workflow, IPA export or paid service was requested.
