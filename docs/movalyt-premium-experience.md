# MOVALYT premium experience

Based exclusively on PR #42 (`276b83369351f0fe9dc8ba7297a4bfb81061bcc7`). Black–lime identity, original local Rubik and approved anatomy artwork retained. No Work redesign was used. This is a stacked Draft PR; no merge or production deployment.

## What changed

- **P1:** expanded player now uses the viewport instead of shrinking the video. Canvas/video remain mounted; ESC, focus wrapping, inert background and return position are handled. Selected variation drives the actual hero artwork. History cards use normal document flow instead of the overlapping summary decoration. Decode/analysis failures offer a direct replacement picker, without a dead preview or duplicate retry. Text scales in rem; navigation reserves its measured height.
- **Results:** measured hold and existing score first, prominent playback, then the primary improvement. Reliability caveats remain visible and unchanged, followed by strengths, evidence and practice. No scoring or coaching generation changed.
- **Player:** bigger media, original aspect ratio, quiet transport groups, short readable labels and optional angles. Enlarged mode hides secondary diagnostics. Playback and skeleton use the existing rendering pipeline.
- **Library/variations:** clear active/experimental/unavailable groups, larger artwork, actual selected pose, fewer repeated labels, persistent next action. Unsupported choices still remain unavailable.
- **History:** one clear empty state; first measurement explains when comparison becomes meaningful. Multiple measurements still use compatible models only. Experimental records are disclosed separately; stored summaries explicitly explain that the video was not retained.
- **Polish:** consistent surfaces, borders, type and spacing across welcome, home, library, filming, upload, processing, report, playback, history and settings. WebKit-specific error-button sizing and offscreen SVG overflow fixed.

## Design and motion contract

Local Rubik; body 1–1.0625rem, support .875–.9375rem, headings 1.375–1.75rem; generous line height for Hebrew. RTL reading/navigation with LTR media time and numeric controls. Spacing on a 4/8px rhythm; 14–20px mobile insets; restrained 12–16px control radii. Near-black `#080a09`, raised `#101411`, lime `#d0ff00`, quiet gray metadata, warm explicit errors. Primary actions ≥52px; small navigation/control targets ≥44px. Visible keyboard focus, labeled controls, 200% text reflow, safe-area-aware bottom bars.

Screen changes use a 140ms opacity response; selected rows/disclosures and player opening use brief 140–160ms feedback. Press response is immediate. No decorative loops, scroll-time JavaScript or scroll-driven layout. Transform/opacity are preferred. `prefers-reduced-motion` disables motion. Existing engine overlay/render scheduling is unchanged.

## Actual screenshots — before / after

These are real local browser captures of PR #42 and this branch, at 320×844 and 390×844, DPR 1. Reports, skeleton, history and processing use the same pinned public video with real MediaPipe inference, never seeded scores. Public fixture provenance: [source and SHA-256](screenshots/complete-analysis/public-fixture.json). Filming illustrations are existing product artwork. Local captures are not screenshots of the hosted Preview.

| Screen/state | Before 320 | After 320 | Before 390 | After 390 |
| --- | --- | --- | --- | --- |
| Welcome | [Open](screenshots/premium-experience/before/welcome-320.png) | [Open](screenshots/premium-experience/after/welcome-320.png) | [Open](screenshots/premium-experience/before/welcome-390.png) | [Open](screenshots/premium-experience/after/welcome-390.png) |
| Home | [Open](screenshots/premium-experience/before/home-320.png) | [Open](screenshots/premium-experience/after/home-320.png) | [Open](screenshots/premium-experience/before/home-390.png) | [Open](screenshots/premium-experience/after/home-390.png) |
| Settings | [Open](screenshots/premium-experience/before/settings-320.png) | [Open](screenshots/premium-experience/after/settings-320.png) | [Open](screenshots/premium-experience/before/settings-390.png) | [Open](screenshots/premium-experience/after/settings-390.png) |
| Exercise library | [Open](screenshots/premium-experience/before/catalog-320.png) | [Open](screenshots/premium-experience/after/catalog-320.png) | [Open](screenshots/premium-experience/before/catalog-390.png) | [Open](screenshots/premium-experience/after/catalog-390.png) |
| Empty search | [Open](screenshots/premium-experience/before/search-empty-320.png) | [Open](screenshots/premium-experience/after/search-empty-320.png) | [Open](screenshots/premium-experience/before/search-empty-390.png) | [Open](screenshots/premium-experience/after/search-empty-390.png) |
| Selected variation | [Open](screenshots/premium-experience/before/variations-320.png) | [Open](screenshots/premium-experience/after/variations-320.png) | [Open](screenshots/premium-experience/before/variations-390.png) | [Open](screenshots/premium-experience/after/variations-390.png) |
| Assistance selection | [Open](screenshots/premium-experience/before/assistance-320.png) | [Open](screenshots/premium-experience/after/assistance-320.png) | [Open](screenshots/premium-experience/before/assistance-390.png) | [Open](screenshots/premium-experience/after/assistance-390.png) |
| Experimental filming | [Open](screenshots/premium-experience/before/experimental-guide-320.png) | [Open](screenshots/premium-experience/after/experimental-guide-320.png) | [Open](screenshots/premium-experience/before/experimental-guide-390.png) | [Open](screenshots/premium-experience/after/experimental-guide-390.png) |
| Experimental upload | [Open](screenshots/premium-experience/before/experimental-upload-320.png) | [Open](screenshots/premium-experience/after/experimental-upload-320.png) | [Open](screenshots/premium-experience/before/experimental-upload-390.png) | [Open](screenshots/premium-experience/after/experimental-upload-390.png) |
| Unavailable analysis | [Open](screenshots/premium-experience/before/unavailable-320.png) | [Open](screenshots/premium-experience/after/unavailable-320.png) | [Open](screenshots/premium-experience/before/unavailable-390.png) | [Open](screenshots/premium-experience/after/unavailable-390.png) |
| Filming guide | [Open](screenshots/premium-experience/before/guide-320.png) | [Open](screenshots/premium-experience/after/guide-320.png) | [Open](screenshots/premium-experience/before/guide-390.png) | [Open](screenshots/premium-experience/after/guide-390.png) |
| Upload | [Open](screenshots/premium-experience/before/upload-320.png) | [Open](screenshots/premium-experience/after/upload-320.png) | [Open](screenshots/premium-experience/before/upload-390.png) | [Open](screenshots/premium-experience/after/upload-390.png) |
| Video review | [Open](screenshots/premium-experience/before/video-review-320.png) | [Open](screenshots/premium-experience/after/video-review-320.png) | [Open](screenshots/premium-experience/before/video-review-390.png) | [Open](screenshots/premium-experience/after/video-review-390.png) |
| Decode error / recovery | [Open](screenshots/premium-experience/before/error-320.png) | [Open](screenshots/premium-experience/after/error-320.png) | [Open](screenshots/premium-experience/before/error-390.png) | [Open](screenshots/premium-experience/after/error-390.png) |
| Cancelled processing | [Open](screenshots/premium-experience/before/cancelled-320.png) | [Open](screenshots/premium-experience/after/cancelled-320.png) | [Open](screenshots/premium-experience/before/cancelled-390.png) | [Open](screenshots/premium-experience/after/cancelled-390.png) |
| Real processing | [Open](screenshots/premium-experience/before/processing-320.png) | [Open](screenshots/premium-experience/after/processing-320.png) | [Open](screenshots/premium-experience/before/processing-390.png) | [Open](screenshots/premium-experience/after/processing-390.png) |
| Results | [Open](screenshots/premium-experience/before/results-320.png) | [Open](screenshots/premium-experience/after/results-320.png) | [Open](screenshots/premium-experience/before/results-390.png) | [Open](screenshots/premium-experience/after/results-390.png) |
| Video + skeleton | [Open](screenshots/premium-experience/before/player-320.png) | [Open](screenshots/premium-experience/after/player-320.png) | [Open](screenshots/premium-experience/before/player-390.png) | [Open](screenshots/premium-experience/after/player-390.png) |
| Joint angles | [Open](screenshots/premium-experience/before/player-angles-320.png) | [Open](screenshots/premium-experience/after/player-angles-320.png) | [Open](screenshots/premium-experience/before/player-angles-390.png) | [Open](screenshots/premium-experience/after/player-angles-390.png) |
| Expanded player | [Open](screenshots/premium-experience/before/player-expanded-320.png) | [Open](screenshots/premium-experience/after/player-expanded-320.png) | [Open](screenshots/premium-experience/before/player-expanded-390.png) | [Open](screenshots/premium-experience/after/player-expanded-390.png) |
| Empty history | [Open](screenshots/premium-experience/before/history-empty-320.png) | [Open](screenshots/premium-experience/after/history-empty-320.png) | [Open](screenshots/premium-experience/before/history-empty-390.png) | [Open](screenshots/premium-experience/after/history-empty-390.png) |
| First measurement | [Open](screenshots/premium-experience/before/history-320.png) | [Open](screenshots/premium-experience/after/history-320.png) | [Open](screenshots/premium-experience/before/history-390.png) | [Open](screenshots/premium-experience/after/history-390.png) |
| Saved summary | [Open](screenshots/premium-experience/before/saved-summary-320.png) | [Open](screenshots/premium-experience/after/saved-summary-320.png) | [Open](screenshots/premium-experience/before/saved-summary-390.png) | [Open](screenshots/premium-experience/after/saved-summary-390.png) |
| No pose / recovery | [Open](screenshots/premium-experience/before/no-pose-320.png) | [Open](screenshots/premium-experience/after/no-pose-320.png) | [Open](screenshots/premium-experience/before/no-pose-390.png) | [Open](screenshots/premium-experience/after/no-pose-390.png) |

Additional accessibility captures: [200% home](screenshots/premium-experience/after/text-200-320.png), [200% library](screenshots/premium-experience/after/catalog-text-200-320.png), [200% results](screenshots/premium-experience/after/results-text-200-320.png), [200% player](screenshots/premium-experience/after/player-text-200-320.png), [reduced motion](screenshots/premium-experience/after/reduced-motion-390.png).

## Validation and limits

- Node suite: **140 passed**. Native packaging suite: **4 passed**. Native web build: **42 modules**, pinned local MediaPipe assets, existing CSP.
- Chromium, 320/390: actual review → cancellation → inference → results → skeleton/angles → expanded/ESC → history → summary → reload → no-pose recovery. No horizontal overflow, page exceptions or outbound POSTs in the captured sessions. Both real reports retain the existing score **58** and measured interval **2.2s**.
- Packaged Capacitor web assets also tested with external HTTPS blocked. This is browser execution of the packaged assets, **not an iOS simulator or physical iPhone**.
- Boundary regression checks cover legacy/corrupt storage preservation, compatible comparisons, consent, experimental negative footage, cancellation/no-pose without fabricated history, training-data preservation and simulated safe-area insets. These boundary-only layout fixtures do not supply the screenshots above.
- WebKit 26.5: navigation, selection, upload/decode recovery, cancellation, 200% text and reduced motion checked at both widths with no overflow/page errors. **Real inference returns an engine error in this Linux WebKit runtime**; results/player success is not claimed for WebKit. [320 error](screenshots/premium-experience/webkit/webkit-inference-limit-320.png), [390 error](screenshots/premium-experience/webkit/webkit-inference-limit-390.png). Long Tasks API is unavailable there; its empty array is not a zero-task measurement. Programmatic scrolling was used because mobile WebKit's automation wheel is unsupported. Physical Safari/Capacitor performance remains unverified.
- The old `verify-analysis-library.py` currently stops at its stale six-planche-choices assertion (PR #42 has seven). Later hard-coded text assertions also describe the former UI. It is **not reported as passing**; the new real-flow acceptance covers selection/search/availability/reload instead. Existing analysis tests remain green.
- All **16 protected engine/measurement/scoring/runtime/storage files** retain exact SHA-256 hashes: [manifest](screenshots/premium-experience/preserved-system.json). No dependency, privacy policy, storage schema or paid service added.

### Measured scroll observations

These are headless Linux **rAF callback cadence**, sampled during 12 automated scroll inputs per screen, not physical display FPS, not proof of smooth iPhone rendering, and not a before/after performance claim. The player-playing sample includes the real video and existing skeleton drawing. No analysis work is moved or changed.

| Width | Screen | rAF callbacks/s | Median / p95 interval (ms) | Long Tasks ≥50ms |
| --- | --- | --- | --- | --- |
| 320 | home | 60.0 | 16.7 / 16.7 | 0 |
| 320 | catalog | 60.0 | 16.7 / 16.8 | 0 |
| 320 | variations | 60.0 | 16.7 / 16.7 | 0 |
| 320 | results | 60.0 | 16.7 / 16.7 | 0 |
| 320 | player | 60.0 | 16.7 / 16.7 | 0 |
| 320 | player-playing | 60.0 | 16.7 / 16.7 | 0 |
| 320 | history | 60.0 | 16.7 / 16.7 | 0 |
| 390 | home | 60.0 | 16.7 / 16.7 | 0 |
| 390 | catalog | 60.0 | 16.7 / 16.8 | 0 |
| 390 | variations | 59.3 | 16.7 / 16.8 | 0 |
| 390 | results | 60.0 | 16.7 / 16.7 | 0 |
| 390 | player | 58.0 | 16.7 / 16.8 | 0 |
| 390 | player-playing | 60.0 | 16.7 / 16.7 | 0 |
| 390 | history | 60.0 | 16.7 / 16.7 | 0 |

Raw records: [Chromium](screenshots/premium-experience/after/checks.json), [baseline](screenshots/premium-experience/before/checks.json), [packaged web](screenshots/premium-experience/native/checks.json), [WebKit](screenshots/premium-experience/webkit/checks.json), [boundaries](screenshots/premium-experience/boundaries/checks.json).

## Skills and references actually used

- **Impeccable 4.8.1:** official [pbakaus/impeccable](https://github.com/pbakaus/impeccable), reviewed pinned commit `924bbd194d02e5e15a227e75b5901fb0d7a4ecad`; context, craft-floor and polish playbooks; static detector engine 0.1.19 SHA-256 `07b763dc00012e9acf219fe2d2e8980f0810fb8af2e4a41c090107a8351d412f`. No global installation or hooks; telemetry disabled. Final static scan leaves six small-text warnings from superseded/hidden styles; these were reviewed against rendered captures rather than suppressed. [Raw warnings](screenshots/premium-experience/impeccable-static.json).
- **Frontend Design:** reviewed official Anthropic skill and applied hierarchy, intentional typography, restrained visual direction and production details.
- **Web Design Guidelines:** reviewed Vercel skill and current official interface rules; applied focus, semantic controls, text zoom, motion preferences, touch targets and performance guidance.
- No standalone Apple/iOS/HIG skill was installed in this environment. Prior repository Apple audit documents mention an old user-supplied archive, but its skill files were not available here. Applied official Apple HIG: [motion](https://developer.apple.com/design/human-interface-guidelines/motion), [scroll views](https://developer.apple.com/design/human-interface-guidelines/scroll-views), [layout](https://developer.apple.com/design/human-interface-guidelines/layout), [buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [playing video](https://developer.apple.com/design/human-interface-guidelines/playing-video).

## Reproduce

Use Python Playwright + Chromium (the harness defaults to `/usr/bin/chromium`), pinned public clip from the provenance above as `../movalyt-test-cache/complete-candidate-4-2.mp4`, and `python scripts/prepare-premium-fixtures.py` for the pinned model/negative fixtures. No personal recording is needed.

```sh
node --test tests/*.test.mjs tests/*.test.cjs
npm --prefix mobile test
python scripts/verify-premium-experience.py --out /tmp/movalyt-after
python scripts/verify-premium-experience.py --baseline --source /path/to/pr42/vercel-app --out /tmp/movalyt-before
MOVALYT_MODEL_FILE=/path/to/pose_landmarker_lite.task npm --prefix mobile run build
python scripts/verify-premium-experience.py --source mobile/www --offline --out /tmp/movalyt-native
python scripts/verify-premium-experience.py --browser webkit --out /tmp/movalyt-webkit
```
