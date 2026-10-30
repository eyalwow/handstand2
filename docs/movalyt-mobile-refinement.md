# MOVALYT — mobile refinement on PR #29

Continues `ui/movalyt-reference-recreation` directly from `78bc42b`. No new PR,
merge, production deployment, SSO change, Coach changes or cloud activation.
Desktop receives only a basic 1440px usability/overflow check.

## Changes against the approved mobile reference

| Screen | Important corrections |
| --- | --- |
| Home | Immersive edge-to-edge athlete, overlaid M/wordmark, a real information action, three-line heading at the athlete's side, 58px lime camera action, three evenly sized benefit cards. Secondary website sections now live in a disclosure below the first screen. Short viewports have a compact layout. |
| Capture | Full-body image at the left, actual line icons and four instructions at the right, lime framing around the athlete, centered short guidance below, large capture action and a shared camera/gallery bar. No cropped hands or feet in the demonstration image. |
| Processing | Compact app header, actual current video frame and actual lime pose, left-to-right progress bar with percentage at the right, compact completion list, quieter privacy copy, reachable Cancel. Loading state retains original sampling and abort behavior. |
| Results | App header instead of website branding, larger open-track score ring, compact measured duration, four measured icon cards, actual green/orange findings and a full-width playback action. Long explanations remain available through disclosures. |
| Player | Skeleton toggle overlays the actual video; angle control and real time readout share a toolbar. The video, scrubber, transport controls and four measured cards fit a mobile hierarchy. Approximate joint angles use current real pose coordinates. |
| History | Actual graph/list switch, clearer grid labels, lime area fill and latest-value badge, compact date/score rows, accessible expandable measurement details, and a restrained new-analysis action. No fabricated progress, video thumbnails or sample entries. |

The normal 390px result image shows **71**, not the reference's 92: that is the
unchanged engine's result for the real motion test. The history graph is flat
because it contains repeated real analyses of that same clip, not invented daily
improvements. The processing/player video comes from the selected test clip, not
from the marketing photograph.

## Mobile app behavior

- Fixed three-destination navigation, >=44px primary touch targets, real native
  file/camera inputs preserving `accept="video/*"` and `capture="environment"`.
- Top/bottom/side safe areas, viewport-fit cover, portrait standalone metadata,
  Dynamic Island space via safe-area insets, and compact short-height layout.
- Native modal dialog, backdrop/close/Escape handling, focus return and contained
  modal scrolling. Viewport-height/keyboard handling is UI-only. There are no text
  entry forms in the current core flow; a physical system-keyboard test was not run.
- Reduced Motion disables animation/transitions. Screen headings receive route
  focus without decorative focus rectangles; actionable keyboard focus remains.
- Reload explains why the video must be selected again; locally saved measurement
  history survives. Graph/list switching does not write or clear storage.
- `analysis-history.js` is the read-only data boundary shared by home/history UI.
  The engine, sampling, Worker, WebKit compatibility module, formulas, thresholds,
  model files and cloud/Coach modules are byte-identical to the PR #29 baseline.
  The existing inline replay gets only a real playback-time presentation hook.

This prepares the web UI for a future wrapper. It does not add Capacitor, package
an application, enable offline operation or claim App Store/Play Store readiness.

## Photograph and typography

One image-edit generation was performed using the original AI source. The new
photograph has darker concrete/steel background, less bright window grid,
stronger side lighting and a more useful left-hand subject crop. Both palms and
feet were inspected before replacing the WebP. The exact original reference photo
was not supplied; camera angle/anatomy/lighting remain an approximation. No further
image-generation attempts were made. No paid external service was configured.

Rubik Hebrew and Latin weights 400/600/800 are now bundled locally from
`@fontsource/rubik@5.2.8` under SIL OFL; license and provenance are in
`vercel-app/assets/fonts/`. This fixes fallback-font differences and removes the
Google Fonts request from this page. The six font files total about 84 KiB;
the refined 1024×1536 photograph is about 108 KiB.

## Reproducible real-motion checks

Run:

```sh
node --test tests/*.test.*
python3 scripts/verify-movalyt-ui.py --browser chromium
python3 scripts/verify-movalyt-ui.py --browser webkit --webkit-executable /path/to/webkit-launcher
```

The script downloads `v_HandstandWalking_g04_c01.avi` from the UCF101 test split
hosted at `sumith2425/UCF101`, checks its published Git LFS SHA-256
`7862ce384b0b15cbcda5d6741b5294933deec9635f54b0339793f19049458539`, and
encodes it to H.264 for the native video picker. It is an actual person moving on
his hands. No image loop, synthetic landmarks, injected scores or injected history
are used. Source: https://huggingface.co/datasets/sumith2425/UCF101/tree/main/test/HandstandWalking

The fixture is temporary QA material, not a shipped application asset. Raw clips
are not checked in. MediaPipe 0.10.14 and the existing SHA-256 verified pose model
are served locally only by the QA harness because direct browser Worker downloads
are unreliable in this executor. Production dependency URLs are unchanged.

### Passed

- **61 Node tests**, plus module syntax checks. Existing history tests now exercise
  the shared data reader rather than duplicating its parsing implementation.
- **Chromium touch/portrait:** 320×640, 375×812, 390×844 and 430×932. Six states,
  no horizontal overflow, native file chooser, actual progress, cancel/retry,
  real Worker inference, result cards, moving skeleton, speed, joint angles,
  graph/list state, history preservation and reload behavior. Forty-two frames
  were processed per run; all four real-motion runs scored 71.
- Modal visibility/Escape/focus restoration, Reduced Motion and simulated 47px
  top/34px bottom safe-area bounds. Safe-area simulation is not a physical iPhone.
- Desktop 1440px basic usability/overflow smoke, with no desktop redesign.

### WebKit result and limitation

Playwright WebKit 26.5 was installed and launched. Home, capture, empty history,
navigation, modal/focus, Reduced Motion, simulated safe areas, file selection and
cancellation were exercised at the four mobile widths. **The full video-analysis
check failed during scan** with:

```
Error: undefined is not an object (evaluating 'GLctx.activeTexture')
```

The CPU model initialized in the Worker. A separate feature probe confirmed that
this Linux WebKit build exposes Worker OffscreenCanvas while returning no WebGL
context there. The existing fallback is only selected when Worker OffscreenCanvas
is absent. These engine modules were not modified to work around the limitation.

A separate compatibility-mode diagnostic was also attempted, but produced no
reliable video pose and is not counted as passed. Native Linux WebKit media probes
also encountered read-only `/var/tmp` media caching and black decoded frames;
allowing that temporary cache did not establish a working full video pipeline.
These observations do not establish an iPhone regression or a successful Safari
video test. The machine-readable WebKit report records later checks as unrun.

There is **no physical iPhone or Android device** attached. Actual phone camera,
gallery, Dynamic Island/system keyboard, Safari/iOS codecs, rotated phone videos
and live Preview playback still require device validation. Motion testing here
uses a real landscape clip in portrait app layouts; no rotated-codec success is
claimed. A green Chromium report does not substitute for these device checks.

## Updated screenshots

All primary screenshots below are actual viewport captures, not composites or
mockup backgrounds. Results/player/history are produced by real motion inference.

| Screen | 320 | 375 | 390 | 430 |
| --- | --- | --- | --- | --- |
| Home | [image](screenshots/mobile-refinement/home-320.png) | [image](screenshots/mobile-refinement/home-375.png) | [image](screenshots/mobile-refinement/home-390.png) | [image](screenshots/mobile-refinement/home-430.png) |
| Capture | [image](screenshots/mobile-refinement/analyze-320.png) | [image](screenshots/mobile-refinement/analyze-375.png) | [image](screenshots/mobile-refinement/analyze-390.png) | [image](screenshots/mobile-refinement/analyze-430.png) |
| Processing | [image](screenshots/mobile-refinement/processing-320.png) | [image](screenshots/mobile-refinement/processing-375.png) | [image](screenshots/mobile-refinement/processing-390.png) | [image](screenshots/mobile-refinement/processing-430.png) |
| Results | [image](screenshots/mobile-refinement/results-320.png) | [image](screenshots/mobile-refinement/results-375.png) | [image](screenshots/mobile-refinement/results-390.png) | [image](screenshots/mobile-refinement/results-430.png) |
| Player | [image](screenshots/mobile-refinement/replay-320.png) | [image](screenshots/mobile-refinement/replay-375.png) | [image](screenshots/mobile-refinement/replay-390.png) | [image](screenshots/mobile-refinement/replay-430.png) |
| History | [image](screenshots/mobile-refinement/history-320.png) | [image](screenshots/mobile-refinement/history-375.png) | [image](screenshots/mobile-refinement/history-390.png) | [image](screenshots/mobile-refinement/history-430.png) |

Empty-history, safe-area simulation, WebKit UI/error captures and JSON reports
are in the same directory. The previous iteration's captures remain in
`reference-recreation/` for before/after review.

## Delivery / remaining acceptance work

PR: https://github.com/eyalwow/handstand2/pull/29 — remains Draft.

Phone Preview:
https://handstand-lab-coach-git-ui-movalyt-referenc-ae8ec2-eyalwen-6443.vercel.app/vercel-app/

The project's existing Vercel authentication still applies; sign in as the owner
if prompted. Protection has not been disabled, and a publicly accessible Preview
or physical phone check is not claimed.

Remaining differences: exact original athlete asset, some camera/crop and icon
shapes, and fine spacing still differ from the mockup. History intentionally has
no retained video thumbnails; progress intentionally shows actual sampling rather
than a timed animation. The most important outstanding acceptance gate is a real
Safari/iPhone and Android moving-video test, including rotated video and camera
selection. No merge or production release is recommended from these checks alone.
