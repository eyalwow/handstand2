# Analysis engine reference and validation plan

## Runtime

Active athlete runtime: `@mediapipe/tasks-vision` **0.10.14**, PoseLandmarker **Lite float16 v1** (33 pose landmarks). Website defaults use pinned jsDelivr JS/WASM and Google model URL; native build bundles the same dependency/model. The packaged model SHA-256 is `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`. No model/library changes are part of cleanup.

Read pose-runtime.js, pose-worker.js and pose-main.js for execution/delegate/fallback behavior; read video-sampling.js and handstand-sampling.js for frame acquisition. Local model inference is not an LLM video interpretation. Frames and pose arrays remain local under the athlete path. Diagnostics may contain derived information and must not be published from private clips.

## Measurement contracts

Handstand measurement is `handstand-v4-observed`; temporal policy and score policy have separate versions. Registry engine ID `handstand-v3-fixed` is historical dispatch identity, not permission to rename persisted IDs. Follow actual exported versions rather than inferring the algorithm from that ID.

| Metric | Actual meaning / limitation |
| --- | --- |
| Hold timing | Selected longest established observed run; source-time span, not sum of attempts. Endpoints may be uncertain; observed time is not automatically complete hold time. |
| Banana/body-line offset | Projected pelvis offset from shoulder–ankle axis normalized by body-axis length; not spinal diagnosis. |
| Lean | Absolute projected inclination from image vertical; no automatic gravity/camera calibration. |
| Shoulder/elbow deficit | Deficit from 180 degrees in selected-side projected joint angle; not bilateral anatomy or 3D ROM. |
| Sway | Robust dispersion of horizontal pelvis offset relative to wrist, normalized by body length; not overall stability or vertical lowering. |
| Entry/ending | Observed transitions associated with selected attempt where supported; intent/cause cannot be inferred. |
| Evidence | Coverage, sample counts, visibility, observed percentiles and scope; visibility is not accuracy probability and percentiles are not confidence intervals. |

handstand-measurement.js uses raw selected-interval geometry; pose-overlay.js smooths only display. No smoothed/interpolated track is graded. handstand-score-policy.js marks calibration unvalidated: hold bands combine body line 30%, lean 20%, shoulders 20%, elbows 15%, sway 15%; duration weight is zero. handstand-summary.js combines available hold/entry phases (70/30 when both exist). Missing phases do not become zero penalties, and different phase scopes must not be compared as identical scores.

#44–#47 preserve timing independently of technique, show endpoint uncertainty, require explicit side/full-body/unassisted capture answers for technique, and scope feedback to projected evidence/selected attempt. Read upload-review.js and handstand-engine.js for the actual gate; user answers are not automatic validation. Existing numeric gates are implementation choices, not demonstrated accuracy.

## Existing tests and their limits

- `handstand-boundaries`, `handstand-measurement`, `entry-observation`, `handstand-summary`, `intelligent-handstand`: phase/geometry/feedback regressions.
- `handstand-score-policy`: score contracts, not coach calibration.
- `video-sampling`, `pose-overlay`, `analysis-performance`: acquisition/display/lifecycle checks.
- `front-lever*`: separate experimental contract.
- `analyzer-quality`, `consent`, `vercel-coach`: privacy and feedback boundaries; older Coach has separate coach.test.mjs.
- `tests/fixtures/handstand-calibration-corpus.json`: public source metadata explicitly labeled robustness research, not a coach-labeled benchmark; no redistribution assumed.
- Browser scripts include real-runtime, mock/fixture and historical layout checks. Inspect each before execution. Do not convert an old report's pass into a new pass.

Root tests and mobile packaging tests should run before/after any engine work. Preserve `handstand-legacy-db6fe32.js`: a frozen comparison fixture, not dead production code.

## About 30 authorized videos: first validation batch

Thirty clips are a pilot for finding failure modes, not a defensible population accuracy claim. Obtain permission and keep private sources outside Git; record anonymous clip IDs, hashes, codec/rotation/FPS, camera angle, support and sample provenance in a private manifest. No private filenames, frames, poses or per-video reports in PRs.

Suggested primary allocation: 8 clear side-view complete holds of different durations/levels, 6 continuous holds with corrections, 4 partial/occluded/poor-quality clips, 4 wall/assisted clips, 4 multiple-attempt or dynamic negatives (walking/pushups/kicks), 4 oblique/front/camera-motion clips. Add tags across categories for lighting, body/build/clothing, portrait rotation and codec. Include at least several independent athletes/sessions; do not count transcoded versions as independent participants. Retain originals and label derivatives.

1. Freeze source commit, policy/model versions and environment before running. Do not change thresholds or score bands during baseline collection.
2. Two raters independently label entry, established hold start/end, corrections, tracking uncertainty, exit/support lowering, assistance and all attempts, blinded to engine output. Mark uncertain boundaries as time ranges; missing boundaries stay unknown. Resolve disagreements while preserving original labels.
3. Compare selected attempt, start/end errors, signed/absolute duration errors, temporal IoU, false split/merge and abstentions. Inspect all candidate runs, not just the winning interval. Separate tracking loss from actual departure.
4. At sampled frames, compare projected geometry against manually annotated same-plane landmarks. Ask coaches for ordinal quality and appropriate priority cue separately; agreement with a global score cannot validate geometry.
5. Run original and controlled codec/quality derivatives in identical baseline/candidate environments; use same-athlete/session splits and a held-out batch before tuning. Keep synthetic temporal regressions separate from real-video evidence.
6. Log each failure by clip/time/category: decode, clock, landmark/side, onset, ending, split/merge, wrong attempt, false confidence, geometry, coaching or persistence. Add a minimal regression for every reproduced defect.

Proposed future acceptance targets (must be preregistered with raters, not claimed as achieved): timing MAE <=0.3s, 95th-percentile error <=0.8s, duration bias within +/-0.15s; detection precision >=95%, recall >=90%; false split/merge each <=5%; insufficient-information recall >=95%, unnecessary abstention <=10%. Report denominators, confidence intervals, subgroup results and rater agreement. Thirty clips cannot establish narrow confidence bounds for all of these, especially tail rates. Expand the benchmark before commercial claims.

Keep reliability dimensions distinct: tracking quality, geometry suitability, phase completeness and professional validation. Do not invent a percentage confidence from visibility. After baseline diagnosis, seek explicit authorization for targeted algorithm changes and compare paired results without optimizing against the locked test set.

## Result preservation follow-up (not implemented)

Use a versioned complete-result store alongside legacy summaries: stable ID, UTC date, engine/model/score versions, phase scope, timing/endpoints, raw metrics/units/evidence, recommendation rule+rendered text and quality/abstention reasons. Read old records without filling absent measurements. Publish save success only after durable write; test quota/corrupt/future-schema behavior and round-trip reload. Media is absent by default; optional video retention needs separate consent and capacity/delete controls. See ARCHITECTURE.md for current storage owners.
