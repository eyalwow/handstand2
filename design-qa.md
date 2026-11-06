# MOVALYT complete analysis UI — design QA

Final result: passed for the approved screen implementation and Chromium/native analysis flow. Platform limits remain explicit below.

## Source and scope

The two approved eight-screen strips attached to the latest user request are the visual target: charcoal/black, lime actions, clean approved athlete illustrations, Hebrew RTL, compact family selection, filming checklist, video selection/review, real processing, measured results, a separate player and local history. They were inspected inline against the real captures. No downloadable source bitmap was supplied for automated source image-diff metrics; no pixel identity to the sketches is claimed.

Base: PR #41, `d621cac369870569dd335445c013e06d0f6fb4f2`. The catalog has not been redesigned. Chromium and local WebKit comparisons confirm pixel identity to #41 at 320, 390 and 1440 CSS pixels.

## Visual comparison and corrections

- Home: original approved rear-view handstand, single two-line message, privacy note, truthful engine availability and real latest analysis/empty state.
- Family: large complete hero, compact selected rows and assistance inside the family. Removed redundant thumbnail/difficulty/English lines; all original options/IDs remain.
- Guide: selected exercise, four real reminder checkboxes, large title-free illustration and an upload action before optional detail. Retained the full engine limitations and instructions.
- Upload: chosen exercise and correct illustration, real local file preview, required experimental consent, explicit Start and cancel. File selection does not invoke inference.
- Processing: actual stages/percentage, a labeled illustration only before the first actual video frame, real frame/pose display, tracking-presence messaging and reachable cancellation. Removed a legacy upload button that incorrectly remained visible during processing.
- Results: two measured values, full reliability/calibration warning, existing evidence-based feedback and expandable metric detail. Fixed score digits wrapping at narrow widths; no reference/example score was copied.
- Player: one heading, real MediaPipe skeleton, timeline, frame stepping, playback/speed and independently selectable overlays. Reliable-result warnings follow the controls; abstention warnings remain prominent.
- History: truthful graph/list/empty/corrupt states, model-compatible comparisons and read-only stored summaries. Unsupported video/full-report reconstruction is clearly unavailable.

All visible app-owned interactive targets checked by the browser harness meet 44 × 44px, with associated label areas used for native file/checkbox inputs. Images decode, RTL is retained, no horizontal overflow is present, reduced-motion tests disable motion, and every view reserves navigation/safe-area clearance. Real text can require vertical scrolling at 320px.

## Evidence

The Hebrew [screen-by-screen comparison and gap report](docs/movalyt-complete-analysis-gap-report.md) links 320/390/1440 captures for each screen, the actual public QA footage provenance and all machine-readable checks.

- [Local Chromium checks](docs/screenshots/complete-analysis/local/checks.json): full real CPU Worker inference → measured results → real skeleton/playback → saved history → reload/summary, plus cancel/no-pose/decode cases.
- [Actual hosted WebKit checks](docs/screenshots/complete-analysis/preview/checks.json): real deployed UI, selection, assistance, filming conditions, upload errors, history tabs/empty states and 44px targets at all three widths.
- [Native web package checks](docs/screenshots/complete-analysis/native/checks.json): the same real analysis flow with external HTTPS blocked; bundled model/WASM and original CSP.
- [Existing UI regression](docs/screenshots/complete-analysis/existing-ui.json): 75 variant/guide/reload cases.
- [Boundary checks](docs/screenshots/complete-analysis/boundaries.json): history compatibility/corruption, experimental consent, real negative motion, no-pose and simulated safe areas. Older explicitly labeled test-only storage/DOM fixtures are not screenshots or product data.
- Existing suites: 140/140 Node, 4/4 native package tests; 42 athlete modules packaged. Both GitHub application and native preparation workflows pass.
- [Preserved-system hashes](docs/screenshots/complete-analysis/preserved-system.json): unchanged engines, measurement/scoring/timing, MediaPipe, catalog/IDs, selection and storage boundaries.

The real public QA clip produced the engine's score 58 and an observed 2.2-second segment, explicitly censored at its start. No grade, landmark or history was seeded for application screenshots.

## Preview and practical limits

[Tested READY athlete Preview](https://handstand-lab-coach-i3koyj3v5-eyalwen-6443.vercel.app/vercel-app/) — Preview environment, existing static HTML/CSS/ES-module app, application commit `c8fa6d6be9e875477727a024b47bb6ab99f9b32b`. Vercel sign-in may be required. Evidence-only follow-ups do not change the tested app.

WebKit UI passes locally and on the Preview. Real video inference in this Linux WPE/WebKit environment fails during scanning on both PR #41 and this branch, without showing a score; [baseline comparison](docs/screenshots/complete-analysis/webkit-inference-baseline.json). This is not claimed as passing iPhone inference. Physical iPhone/Android/WebView certification remains open. Hosted end-to-end inference is not claimed; successful inference evidence is Chromium local and the native web bundle.

The unrelated `handstand-coach-demo` Vercel integration retains its pre-existing missing `coach-app` Root Directory failure. The intended athlete Preview is READY. No protection settings or TLS trust boundaries were changed. Local QA serves app directories on loopback only.

No merge, Production, paid services, active-workout screens or training-plan development.

## Reproduce

```sh
git worktree add --detach /tmp/movalyt-analysis-base d621cac369870569dd335445c013e06d0f6fb4f2
node --test tests/*.test.*
python scripts/verify-complete-analysis.py --inference
python scripts/verify-premium-analysis.py --widths 390 320 1440
python scripts/verify-premium-boundaries.py --out /tmp/complete-boundaries
npm --prefix mobile run build
npm --prefix mobile test
```

Python checks require Playwright, Chromium and Pillow. The public clip and pinned model cache are described in the fixture manifest; the clip is not bundled. Native build accepts `MOVALYT_MODEL_FILE` for the checksum-verified model. Serve `mobile/www` on loopback and add `--url <local-native-url> --inference --offline-model` to verify the packaged flow without external model access. Hosted checks accept `--browser webkit --url <preview>/vercel-app/ --access-file <private temporary authentication file>`; never publish the access file.
