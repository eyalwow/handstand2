# Handstand measurement v4 — review draft

Based exactly on Draft #33, `db6fe32a82e8e1388140f924c718d817ae5c62cd`.
This supersedes the numerical-policy freeze in the historical v1 audit for this
new draft only. It does not claim a validated calibration or release readiness.

## Changes and criteria

- Handstand acquisition waits for `requestVideoFrameCallback` after each seek,
  rather than treating the media clock's `seeked` event as proof that the new
  pixels are presented. The otherwise hidden video receives a temporary 1px
  compositor surface; its inline style is restored on success, failure or cancel.
  Presented source time drives both MediaPipe VIDEO timestamps and measurement.
  Non-increasing source frames cause an explicit decode failure. Browsers without
  this API use the existing seek boundary and label the clock `seek-clock`;
  repeatability of that fallback still needs device verification.
- A hold still requires six consecutive reliable samples spanning at least 0.5s,
  inversion, tilt <=25 degrees, visible ankle separation <=0.35 body lengths and
  the existing <=0.45 body-lengths/s transition gate to establish itself. Once
  established, ankle velocity alone cannot split it. Continuation requires
  reliable inverted posture and at least 85% of the seed's median wrist-to-ankle
  vertical extension. Occlusion, a source gap >0.2s, visible departure, or larger
  extension loss breaks the run; separate attempts are never joined. The 15%
  extension allowance is a provisional geometric safeguard, not a validated
  biological threshold. Slow departures and large legitimate corrections need
  labeled footage before adjusting it.
- Duration and hold technique use the same side and longest observed interval.
  Duration is last source timestamp minus first, without the former extra 1/fps.
  Missing beginning/end evidence remains censored. No extrapolation is added.
- Hold grading requires >=1.5s and 10 valid samples, joint visibility >=0.65,
  and usable segment geometry on >=80% of the interval. Segments shorter than
  2.5% of body scale or outside 65–135% of their interval median cannot support
  an angle grade. These are measurement quality gates; insufficient evidence
  returns no hold grade, rather than zero, a guessed replacement, or a score
  based on an unrelated interval. New history IDs `v4-observed-*` keep old/new
  grades out of the same trend; historical storage is preserved.
- Body line is the perpendicular pelvis distance to the shoulder–ankle axis,
  divided by that axis's length. The old horizontal-intercept formula adds a
  factor of 1/cos(axis tilt); the new distance is invariant under image-plane
  rotation. Grade the median absolute offset so opposite-direction bends cannot
  cancel. The signed median remains available to existing feedback consumers.
- Technical bands and weights remain unchanged: body line 30%, lean 20%,
  shoulders 20%, elbows 15%, robust sway 15%. Full-to-zero bands are respectively
  4.5–18% axis length, 4.5–22.5 degrees, 12–52.5 degrees shoulder deficit,
  12–45 degrees elbow deficit, and 1.5–7.5% robust sway. Genuine poor technique can
  still earn zero in a component. The total is bounded to 1–100; there is no
  floor or bonus per component. Existing observed ascent contributes 30% when
  available, hold 70%, with missing phases renormalized. Duration contributes no
  points. Stability remains a separately visible component, not a substitute
  for body line or arm quality.

The old hold scorer is removed from production and frozen under
`tests/fixtures/handstand-legacy-db6fe32.js` for historical comparisons. Existing
legacy-score tests explicitly read that fixture; new regression tests exercise
the production measurement module.

## Meaning of the reported zero

The reported body-line score of zero is possible under the old formula whenever
the measured median horizontal offset reaches 18% of the shoulder–ankle length.
It is not automatically an arithmetic bug. The intercept formula, a different
grading interval, a weakly tracked hip/ankle, real arch and camera projection
must be distinguished using the original poses/frames. The rotation correction
alone is bounded (about 10% at 25 degrees); it cannot justify changing a genuine
zero to 85. No thresholds were widened to fit the subjective reference.

Confidence is not calibrated joint accuracy. The new geometry gates detect
collapse and inconsistent tracking, but cannot undo a systematic plausible
tracking error or infer 3D anatomy from an oblique view. Those limitations remain.

## Verification

`node --test --test-isolation=none tests/*.test.*`: 114/114 pass, including 13 new
tests for ankle corrections, true exits, shortening, missing tracking, invalid
timestamps, score separation, collapsed geometry, rotation invariance, duration
independence, frame presentation, cancellation and stale-frame rejection.

Actual local application uploads use pinned MediaPipe 0.10.14, Lite model
SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`,
CPU Worker, Chromium, and locally served copies of the original WASM/model/module
assets. No inference mocks or injected landmarks/scores. The repeatability
runner compares complete diagnostics and also replays the new run's identical
poses through the baseline scorer/timeline to distinguish algorithm changes from
different input acquisition. Raw inference poses remain in browser memory.
Reports are written outside the repository; no media or private traces are added.

Actual local upload results (three independent uploads per version per case;
all three complete diagnostic objects match within each version):

| Case | #33 time / total | v4 time / total | Hold components before → after: line, lean, shoulders, elbows, sway |
| --- | --- | --- | --- |
| UCF101 HandstandWalking g04 c01, moving public footage | 1.00s / 71 | 0.72s / unavailable | 51.8, 100, 100, 100, 0 → unavailable (short interval) |
| Licensed Isabella Mendes photo encoded as a 4s video, **static integration fixture only** | 3.80s / 76 | 3.80s / 76 | 44.0, 100, 80.8, 76.1, 100 → 44.3, 100, 80.8, 76.1, 100 |
| Blank 3s video | no hold / no score | no hold / no score | unavailable |
| Upright squat photo encoded as a 3s video | no hold / no score | no hold / no score | unavailable |
| Public walking clip physically rotated 90 degrees | no hold / no score | no hold / no score | unavailable |

This is 30 genuine application uploads with MediaPipe CPU inference, zero page
errors and zero outbound POSTs. The static fixture checks that decoding, inference,
grading, rendering and history work together; it validates neither real athlete
duration nor motion accuracy. Public moving footage's old grade used a different,
longer interval than its displayed 1s. The new 0.72s interval has only eight
samples and is not graded. This is deliberate abstention, not evidence of a
better numeric grade. Running the identical new poses through the old engine
gives 1s / 70 (not the independently acquired 71), demonstrating why fresh-run
before/after differences alone cannot establish causality.

An additional public UCF101 HandStandPushups g01 c01 clip produced no established
hold/grade in all three before and all three after uploads. This is an observed
abstention on different movement, not a labeled accuracy or recall result.
The earlier Pexels wall-handstand fixture could not be downloaded (HTTP 403).

Identical analytic landmarks reproduce the specific velocity split on #33:
an 8s held posture with one 45px ankle correction is reported as 3.8s by the
baseline timeline and 8s by v4. This is a regression scenario, not real footage.
Real exits, rapid kicks, low confidence, missing frames, leg lowering and source
timestamp errors remain covered by rejection/boundary tests. A real poor technique
component is not artificially raised, and the static integration grade remains 76.

Public moving source: `sumith2425/UCF101`,
`test/HandstandWalking/v_HandstandWalking_g04_c01.avi`, source SHA-256
`7862ce384b0b15cbcda5d6741b5294933deec9635f54b0339793f19049458539`.
Derived test clips and full numerical reports stay outside Git.

The original `IMG_3410.mp4` is **not available in this environment**. It has been
requested again. Its required three MediaPipe runs and the explanation of its
specific zero remain blocked on that file. No 18s/85 target was encoded.

Reproduce locally, after extracting the two npm packages described in the runner:

```sh
python3 scripts/verify-handstand-measurement.py \
  --video /private/path/IMG_3410.mp4 \
  --assets /tmp/handstand-assets --out /tmp/private-handstand-report.json
```

No Front Lever analyzer, Handstand Coach files, Capacitor settings, workflow,
Production deployment or merge is changed/requested. The branch is a Draft PR
stacked on #33; the commit uses `[skip ci]`. Physical iPhone/Safari, MOV/HEVC,
rotated/HDR sources, oblique cameras and representative labeled freestanding
positive/negative footage remain required for an accuracy claim.
