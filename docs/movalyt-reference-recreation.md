# MOVALYT reference recreation — draft review

Base: exact PR #28 head `9d046e680878682f710f9c3a5a99d63dfaa7cfc1`.
Branch: `ui/movalyt-reference-recreation`. Draft PR / Vercel Preview only.

## What changed

A single `movalyt.css` presentation layer replaces the seven linked, overlapping
style layers for this page. Older files remain available for other surfaces.
`movalyt-ui.js` owns six screen states, actual sampling progress, current-frame
preview, score ring, measured metric cards, measured 2D joint angles, highlights
and compatible-model history graph. The original analyzer retains upload,
WebKit fallback, Worker, fixed sampling, timeout/abort, retry, scoring and storage.
Existing Coach, training, Gemini API modules and engine modules were not changed.
The cloud choice remains blocked. Only handstands are advertised as analyzable.

The exact reference photograph was not provided as an independent asset. A new
original AI photo was generated, visually inspected and encoded to 116 KiB WebP.
It is a new approximation, not the exact reference image. Provenance is in
`vercel-app/assets/photography/README.md`. All text, buttons, chart, score ring,
navigation and skeleton are real DOM/SVG/canvas, not a screenshot background.

## Skeleton and progress

Loading renders the current sampled user frame and real MediaPipe landmarks.
The percent comes directly from the existing sampling callback (processed frames /
requested frames); it is explicitly labelled as sampling progress, not total
elapsed time or a fictitious timer. Stage completion follows decode, model init,
scan, scoring and render. Model loading has no invented percentage. Cancellation
and retry retain the original abort/controller behavior.

Replay keeps existing timestamp interpolation and visibility >= 0.5 filtering.
Lime lines are thinner, with round joints; there is no decorative static skeleton.
The new joint panel uses the same available landmark coordinates and confidence
filter to show approximate 2D elbow/shoulder angles; it does not modify scoring.
Canvas intrinsic dimensions follow the decoded video and CSS contains it without
stretching. Native rotated-video decoding is retained, not newly guaranteed on
all mobile codecs/devices. Only the marketing photo has framing guides.

## Validation and screenshot evidence

61 existing Node tests passed after updating only obsolete asset/style assertions.
All module syntax checks pass. Chromium UI tests check 320, 390 and 1440 pixels:
no horizontal overflow on six states, no uncaught JS exceptions, upload, real
Worker inference, cancel/retry, score/results, replay, speed, skeleton toggle,
measured joint angles, and locally saved history. Empty-history screenshots were
also captured with fresh browser storage. Reduced-motion CSS disables transitions
and animation. This is desktop Chromium responsive QA, not physical iPhone QA.

Run `python3 scripts/verify-movalyt-ui.py` for the reproducible integration check
(requires Playwright, system Chromium, ffmpeg and npm). It downloads the pinned
MediaPipe package and SHA-256 verified pose model into a temporary directory,
serves those dependencies locally for restricted browser networking, and otherwise
uses the actual app. Application dependency URLs are not changed on disk.
The browser's direct external Worker model loading initially failed in this cloud
executor, so the successful pipeline evidence uses that local dependency harness.
CDN access from a deployed phone still needs device verification.

**Fixture disclosure:** result/player/history captures use a four-second MP4
encoded from the new AI still image. Real MediaPipe inference produces the
landmarks and scores shown; no scores/poses/history were injected. This checks
integration, not motion accuracy, skeleton tracking on moving subjects, rotated
videos, or medical/sports validity. The fixture and its history exist only in the
QA browser; they are not bundled or seeded into the product. This limitation is
material: use actual moving portrait, landscape and rotated iPhone/Android clips
before acceptance.

| Screen | 390 px | 320 px | 1440 px |
| --- | --- | --- | --- |
| Home | [capture](screenshots/reference-recreation/home-390.png) | [capture](screenshots/reference-recreation/home-320.png) | [capture](screenshots/reference-recreation/home-1440.png) |
| Upload | [capture](screenshots/reference-recreation/analyze-390.png) | [capture](screenshots/reference-recreation/analyze-320.png) | [capture](screenshots/reference-recreation/analyze-1440.png) |
| Processing | [capture](screenshots/reference-recreation/processing-390.png) | [capture](screenshots/reference-recreation/processing-320.png) | [capture](screenshots/reference-recreation/processing-1440.png) |
| Results | [capture](screenshots/reference-recreation/results-390.png) | [capture](screenshots/reference-recreation/results-320.png) | [capture](screenshots/reference-recreation/results-1440.png) |
| Player | [capture](screenshots/reference-recreation/replay-390.png) | [capture](screenshots/reference-recreation/replay-320.png) | [capture](screenshots/reference-recreation/replay-1440.png) |
| History | [capture](screenshots/reference-recreation/history-390.png) | [capture](screenshots/reference-recreation/history-320.png) | [capture](screenshots/reference-recreation/history-1440.png) |
| Empty history | [capture](screenshots/reference-recreation/history-empty-390.png) | [capture](screenshots/reference-recreation/history-empty-320.png) | [capture](screenshots/reference-recreation/history-empty-1440.png) |

## Visual comparison and remaining gaps

Compared rendered screenshots with the two chat references. Corrected clipped
feet/palms, text over the athlete, excessive background crop at desktop, duplicate
score panels in replay, hidden result heading and overflowing screen density.

| Area | Implemented / difference from reference |
| --- | --- |
| Home | Full athlete, white/lime geometric M, RTL three-line heading, lime CTA, three benefit cards. Photo differs from reference. |
| Desktop | Wide photographic hero with full-body athlete and editorial copy. No literal phone mockup collage or separate grip photograph. |
| Upload | Full-body reference photo, dashed lime framing, real camera/gallery actions. Guidance is below the image rather than overlaid at its side. |
| Processing | Actual frame, skeleton, sampling percent, completed stages. No invented thumbnail filmstrip or timed percentage. |
| Results | Actual ring, four actual measured cards, strength/improvement findings, playback action; full details collapsed. Scores follow real model output rather than reference's fictional 92. |
| Player | Actual upload and tracked skeleton, native-rate/speed/frame controls, optional real 2D angles, measured cards. No reference filmstrip or unsupported comparison tabs. |
| History | Actual local measurements, compatible-model graph, dates and empty state. No stored video thumbnails because videos are not retained in history. |

This is **not a pixel-identical reconstruction**: exact photography, several
icons, screen spacing and desktop composition still differ. Physical iPhone and
Android capture, moving-video pose alignment, rotated metadata/codecs and a live
Preview phone check remain required. No merge, production deploy, SSO change or
paid service is authorized or performed.
