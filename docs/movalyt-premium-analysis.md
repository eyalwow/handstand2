# MOVALYT premium mobile analysis

[Draft PR #40](https://github.com/eyalwow/handstand2/pull/40) is stacked on #39 at `497d463`. [Athlete Preview](https://handstand-lab-coach-6p4cr2x8n-eyalwen-6443.vercel.app/vercel-app/) is READY at application commit `3b1bb07`; `/vercel-app/` is essential because the deployment root serves the older website. Vercel sign-in may be required.

## What changed

The supplied eight-screen reference guides the charcoal surfaces, grayscale athlete artwork, lime selection and actions, typography, rounded cards and restrained motion. This iteration implements analysis only. Existing training/workout source, routes, storage and identities are preserved; training actions are outside the new analysis flow.

| Phase | Commit | Review scope |
| --- | --- | --- |
| A — foundations | `d253b3f` | Shared color/spacing/type/radius tokens, 44px controls, safe areas, navigation, reduced motion, native CSS packaging |
| B — selection | `93f58b9` | Analysis home, bilingual library, search/filter/sort, family hero, variation rows, structured instructions and filming guide |
| C — analysis | `d2b6c95` | Memory-only video preview and explicit Start, integrated player/results, read-only saved measurement summaries |
| D — polish and QA | `071c97d` and follow-ups | Responsive layouts, compact reference-style catalog, native-safe initialization, actual-media and storage-boundary verification |

The final follow-up imports review/history UI before exposing the router, ensuring a fast file selection cannot bypass review while modules are still loading. Files remain in memory and object URLs are revoked on replacement/discard/exit. The original engine continues to handle decoding, two-minute duration limits, cancellation, inference, measurement, grading and persistence.

Planche and Front Lever use their approved full-variation stills on family cards. Handstand uses the corrected rear-view illustration; Planche Lean remains inside Planche with its supplied illustration. Banded variants remain in-family. L-Sit's family cover reuses its approved full still. Existing illustrations are contained without cropping. Missing artwork gets a quiet pending label rather than a branded M.

## Reference comparison

This is a visual/manual comparison against the supplied sketch, not a claim of pixel identity.

| Reference | Implemented | Intentional difference / remaining gap |
| --- | --- | --- |
| Compact logo, title, count, search and two-column library | Compact logo/title, actual catalog count, inline search plus filter/sort control, two columns on phones | Actual count is 20 main exercises/families and 159 catalog options. Availability is derived from registered engines. |
| Hero and thumbnail variation list, lime selection | Approved family hero, bilingual thumbnail rows, difficulty/status, assistance switch and retained selection | All original variants remain: Planche has 7 unassisted choices including Lean and 6 assisted choices. Nothing was removed to match the sketch's six rows. |
| Large illustration and instructions | Full contained illustration, numbered execution cues, filming preparation, criteria and explicit limitations | No empty muscle/tips tabs, invented anatomy data or green muscle highlights. Approved textless artwork was unavailable; embedded captions remain. |
| Video, 97 score and metric bars | Existing player/skeleton controls alongside actual grade/hold/coaching when available; honest error/partial states | No 97, invented hold or seeded feedback. Public acceptance clips abstain; no newly inferred successful grade is claimed. |
| Progress chart and recent entries | Existing same-model chart, illustrated saved entries, read-only summary dialogs | Legacy Handstand records contain only score/date/model. Video, skeleton, hold time and a full historical report cannot be reconstructed; the UI says so. |
| Active workout, timer, completion and program screens | Outside this iteration; original code/data preserved | Deliberately excluded by the user's analysis-only scope. |
| New analysis home/settings | One primary analysis CTA, approved hero, real/empty recent state; preferences/privacy and existing consent controls | No account, new backend, synthetic progress or paid integration. |

## Evidence

Real screenshots are captured from the application, with no screenshot-only app mode and no fabricated report data. Full hosted evidence is from `7ed8ecf`; final focused screenshots/checks are from `3b1bb07`:

- Hosted library: [320](screenshots/premium-analysis/handoff-preview/webkit-catalog-320.png), [390](screenshots/premium-analysis/handoff-preview/webkit-catalog-390.png), [1440](screenshots/premium-analysis/handoff-preview/webkit-catalog-1440.png).
- Hosted 390px: [Home](screenshots/premium-analysis/handoff-preview/webkit-home-390.png), [Planche family](screenshots/premium-analysis/handoff-preview/webkit-planche-family-390.png), [Lean instructions](screenshots/premium-analysis/handoff-preview/webkit-planche-lean-390.png), [Handstand guide](screenshots/premium-analysis/handoff-preview/webkit-handstand-guide-390.png), [Upload](screenshots/premium-analysis/handoff-preview/webkit-upload-390.png), [History empty state](screenshots/premium-analysis/handoff-preview/webkit-history-empty-390.png), [Settings/privacy](screenshots/premium-analysis/handoff-preview/webkit-settings-390.png).
- Actual Chromium CPU Worker flow: [video review](screenshots/premium-analysis/local/chromium-video-review-390.png), [processing](screenshots/premium-analysis/local/chromium-processing-390.png), [unreliable result](screenshots/premium-analysis/local/chromium-actual-unreliable-390.png), [player](screenshots/premium-analysis/local/chromium-player-390.png).
- Boundaries: [safe-area simulation](screenshots/premium-analysis/boundaries/safe-area-390.png), [Front Lever negative](screenshots/premium-analysis/boundaries/front-lever-negative-390.png), [no body](screenshots/premium-analysis/boundaries/no-pose-390.png).

## Verification and practical limits

- All **140 Node tests** pass, including original engine hashes, numerical regressions, original identity snapshots, consent, analysis dispatch and history isolation. Only obsolete photo-home expectations were adapted to the requested illustration-based home; analysis/privacy safeguards remain.
- Capacitor web rebuild packages **40 athlete modules** and checksum-verified local MediaPipe assets. **4/4 package tests** pass. The same stylesheet and UI modules are included; no unsafe-eval or broader CSP was added.
- Chromium locally at **320/390/1440**: 75 variation → guide → reload cases, images, Hebrew/English search, filtering/sorting, empty search, 44px controls, RTL, no horizontal overflow, corrupt-file review, actual MP4 preview, explicit Start, cancellation, real CPU Worker inference and player/skeleton/frame controls. The public motion clip yields 42 pose frames per run and `unreliable` with no grade/history. [Machine-readable checks](screenshots/premium-analysis/local/chromium-checks.json).
- WebKit local UI and hosted Preview UI at the same widths: real application navigation and assets, 75 variation/guide/reload cases per target. [Local WebKit](screenshots/premium-analysis/webkit/webkit-checks.json), [full hosted Preview matrix](screenshots/premium-analysis/preview-webkit/webkit-checks.json). After exposing the actual engine reliability notice, a [final focused hosted check](screenshots/premium-analysis/handoff-preview/webkit-checks.json) repeats home/library/filter/sort, Lean and banded choices, guides, upload/error/history at all three widths. Hosted browser checks suppress only Vercel's injected preview toolbar; the app code, assets and protection settings are unchanged. Temporary auth links are outside the repository.
- Native web package, same three widths and 75 cases: [checks](screenshots/premium-analysis/native-web/chromium-checks.json). The test polls application state through DevTools rather than weakening the package's CSP.
- Read-only legacy summary opening, same-model comparison, corrupt-history preservation and training storage preservation use explicitly labeled **test-only stored fixtures**, with no screenshots and no app writes. A separate reliable-report DOM fixture checks player/summary layout at all three widths without persisting a grade. These are UI contract tests, not successful live inference. [Boundary checks](screenshots/premium-analysis/boundaries/checks.json).
- Real Front Lever negative footage requires the original side-view consent, remains experimental and shows no grade/history. A generated solid-color negative clip yields `no-pose` with readable retry. No pose landmarks or grades were injected into the live-media checks. Public fixture URLs/checksums are reproducible with `scripts/prepare-premium-fixtures.py`.

### Outstanding limitations

1. **No fresh successful graded clip was established.** Three real public clips were tried; the unchanged measurement engine abstained. Numerical/coaching regressions and the reliable-report UI contract pass, but a real positive Handstand acceptance clip remains needed. No positive Front Lever validation is claimed.
2. **Linux WebKit/WPE real video inference fails at scan with `GLctx.activeTexture`.** A hosted #39 baseline and this redesign produce the same error. [Baseline evidence](screenshots/premium-analysis/preview-webkit/baseline-inference.json) and [redesign evidence](screenshots/premium-analysis/preview-webkit/actual-inference.json). This is not proof of physical iPhone/Safari or Capacitor WebView behavior; those require device QA. The error state remains score-free and offers retry.
3. Hosted Chromium acceptance was not run because that browser does not trust the environment proxy CA. Automatic approval rejected adding the CA to its persistent user trust store because this would broaden certificate trust beyond Preview validation. No trust settings were changed; already-trusted WebKit was used for actual hosted UI acceptance instead.
4. Safe areas were tested with a 47px/34px CSS simulation. Keyboard/rotation behavior still needs a physical mobile device. No APK/IPA or native platform build is claimed.
5. The separate `handstand-coach-demo` Vercel integration retains its pre-existing missing `coach-app` Root Directory failure. The intended athlete Preview is READY. No project settings were changed.

No merge of #37/#38/#39/#40, production deployment, new backend/account system or paid service activation.

## Reproduction and CI

Run `npm ci --prefix mobile --cache /tmp/movalyt-npm-cache`, `npm --prefix mobile run build`, `python3 scripts/prepare-premium-fixtures.py`, then `node --test tests/*.test.*`, `npm --prefix mobile test`, `python3 scripts/verify-premium-analysis.py --inference` and `python3 scripts/verify-premium-boundaries.py`. The UI harness also accepts `--path /mobile/www/`, `--browser webkit`, or `--url` plus an ephemeral `--access-file` outside the repository for protected Preview QA. Browser binaries/host dependencies and ffmpeg are prerequisites; no service credentials are committed.

[Validate handstand coach](https://github.com/eyalwow/handstand2/actions/runs/41923627751) and [MOVALYT native preparation](https://github.com/eyalwow/handstand2/actions/runs/41923627549) both passed on handoff application commit `3b1bb07`. Additional real-clip probe [records](screenshots/premium-analysis/additional-real-clip-checks.json) contain source checksums and abstention outcomes; source footage is not committed.
