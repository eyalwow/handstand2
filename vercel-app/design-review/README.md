# MOVALYT — Stage A design approval

This directory is an isolated, read-only visual proposal. The running application
at `../index.html`, analysis engine, Worker, scoring, history and cloud/Coach code
remain unchanged. There is no link from the active app into this proposal.

Four screens only: Welcome, home, capture and analysis player. Use the review
navigation or `?capture=1#welcome`, `#home`, `#upload`, `#player` for full viewport
inspection. Primary links only move between design screens; they do not upload or
analyze video. Native media controls are intentionally disabled. No user choices,
results or history are written to storage. Full onboarding and integration wait
for explicit design approval.

All demo material is scoped here. Player metric scores/timeline and feedback are
explicitly labeled design examples. The image is identified as AI imagery, never
as a live camera or actual user video. The skeleton and optional angles come from
real MediaPipe inference on that AI source image, not hand-drawn landmark data.
This is not motion tracking or a successful video-analysis test.

## Original assets

- `assets/front-lever.webp`: original AI image of an adult woman in a full Front
  Lever; Welcome. The exercise is explicitly marked Coming Soon.
- `assets/capture-handstand.webp`: original AI side-view handstand in a training
  top; distinct from the existing home hero. Capture guidance and the clearly
  labeled player illustration share this source.
- `assets/planche.webp`: original AI full planche on low parallettes, prepared for
  asset approval; not a shipped catalog item or a working analysis feature.
- Home reuses the project's existing original AI handstand hero. This proposal
  uses four different original sports photographs in the asset set rather than
  repeating one photograph throughout the product.

The three new PNG sources remain in `/workspace/generated_images/` with filenames
`exec-eca28f50-64fd-4311-91d4-95e28f3f5604.png`,
`exec-b1963c6f-1f6d-4460-8fb4-3b4f26a405c6.png` and
`exec-ed716271-4df8-4fc3-aeed-65b23664e703.png` respectively. Each was generated
independently and visually inspected for full-body framing, contact points and
obvious anatomical defects before WebP encoding. These are marketing/design
images, not authoritative exercise technique references. No CaliPro artwork,
branding, copy, frame or video is bundled. No paid external service was configured.

## Photo pose provenance

`assets/handstand-pose.json` records the input WebP SHA-256, the verified model
SHA-256, and 33 normalized output landmarks. Generated with MediaPipe
`@mediapipe/tasks-vision@0.10.14`, `pose_landmarker_lite.task`, CPU delegate,
`runningMode: IMAGE`, one person, on the 1024×1536 source rendered to a 320×480
canvas. Visibility >= 0.5 filters this review overlay, consistently with the
existing UI; the production engine and thresholds are not modified.

The pose asset was measured once offline. It is not a model download or live
analysis in the review page. Rendering maps normalized coordinates back to the
source aspect ratio. Angle cards calculate approximate 2D angles from those
coordinates and are labeled as an AI-image measurement. Metric score cards are
separate design fixtures and make no claim to correspond to that photo.

## Checks

Run `python3 scripts/verify-stage-a-design.py` from the repository root. Requires
Playwright and `/usr/bin/chromium`. It serves local static files, creates the four
390×844 viewport captures, verifies the marked pose/angle toggles and review
navigation, checks 320/430 overflow, and fails on storage writes, active-engine/API
requests or uncaught JavaScript errors. It does not test the actual application
analysis pipeline or physical devices.
