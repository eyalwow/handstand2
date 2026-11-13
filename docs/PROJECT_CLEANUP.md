# Cleanup and Claude Code handoff report

## Scope and baseline

Client-date snapshot: 2026-11-14. New branch: `chore/movalyt-claude-handoff`, stacked on `fix/movalyt-feedback-evidence` (#47), exact baseline `86263e192d258214fdf4e07f96d384e74a6d4bea`. PR #43 depends on #42, not directly on main. Verified Git ancestry: #42 is contained in #43; #43 is contained in #47. #44–#47 include later reliability work. #48 is divergent from main (135 baseline-#43-only / 2 #48-only commits at inventory time); its orange workspace is not substituted for the approved #43 experience.

[Complete tracked-file, remote-branch, all-PR and duplicate inventory](REPOSITORY_INVENTORY.md). Main remains `a6930b7` at inspection. No main merge, branch/PR deletion, shared-history rewrite, Vercel setting change, deployment command, signing operation or paid service was performed.

## Safe changes made

| Path | Change / reason |
| --- | --- |
| README.md | Replaced one-line placeholder with product boundaries, local URLs, test/build order and document navigation |
| CLAUDE.md | Added standing development, Git, privacy, regression and mobile instructions |
| docs/ARCHITECTURE.md | Mapped Lab, Coach, athlete, native package, video processing, measurements, storage owners and provider boundary |
| docs/CURRENT_STATUS.md | Distinguished implemented source behavior from experiments, claims and unverified release gates |
| docs/ANALYSIS_ENGINE.md | Recorded pinned model, metric semantics, tests and a 30-clip pilot validation plan |
| docs/CLAUDE_HANDOFF.md | Added ready-to-paste opening prompt |
| docs/REPOSITORY_INVENTORY.md | Recorded all tracked paths, PR bases/states, remote ancestry, exact duplicate groups and retained candidates |
| docs/PROJECT_CLEANUP.md | This change/verification ledger |
| .gitignore | Added scoped dependency/cache, secret-file and opt-in local evidence paths; preserved video/fixture/evidence visibility |

**Deleted files: none. Moved files: none. Runtime changes: none.** No redundant runtime file was proven safe to remove across all Lab/Coach/athlete/native/test/evidence entrypoints. Reducing file count without that proof would violate this task's safety priority. Organization is improved through navigation and ownership documentation rather than path churn.

The new ignore rules do not untrack existing files. They intentionally do not ignore all videos, screenshots or model metadata. Existing mobile/.gitignore continues to own native-generated output. Private media must stay outside the checkout; ignore rules are not a privacy guarantee.

## Retained pending evidence

- Original root Lab and preview Coach: distinct entrypoints and tests; no consolidation.
- Dormant cloud/provider implementation: policy-gated and covered by API/feedback tests; no provider activation or dead-tail removal.
- Old CSS/artwork modules/design-review pages: full semantic/dynamic reachability not proved; no consolidation.
- Stage-specific browser scripts: some assume an old DOM/upload flow or external caches; retain for adaptation, not certified as current.
- All historical screenshots/reports, including exact duplicates: evidence identity and links differ even when pixels match.
- Native duplicate icons/splash images: platform resource names are significant.
- Frozen legacy analyzer fixture, calibration manifests, assets and tracked motion video: comparison/provenance value.
- All remote branches/PRs and design alternatives: preserved; inventory marks ancestry without calling divergence obsolete.
- Private videos: neither deleted nor added. No private clip was needed for cleanup verification.

## Before/after verification

Environment: Linux, Node 24.19.0 (project requires >=22), npm 11.9.0, system Chromium. Before browser run used a detached worktree at exact #47; after used cleanup worktree. Tests wrote only temporary browser-profile state. External POST requests were monitored and zero observed in the exercised flows.

| Check | Before | After | Meaning / limits |
| --- | --- | --- | --- |
| `node --test tests/*.test.*` | 147 pass, 0 fail | 147 pass, 0 fail | Includes analyzer, Lab/Coach feedback, API/privacy, training/workout, catalog and sampling regressions |
| `cd mobile && npm run build` | Pass, 42 athlete modules | Pass, 42 athlete modules | Static native web package, local JS/WASM/model; not APK/IPA compilation |
| `cd mobile && npm test` after setup/build | 4 pass, 0 fail | 4 pass, 0 fail | Source/package identity, model/runtime paths, native privacy/config contracts |
| JS syntax | Application JS unchanged | 51 files pass `node --check` | vercel-app root/API and preview modules |
| Python compile | Scripts unchanged | 20 scripts compile | Syntax only, not execution/acceptance of old harnesses |
| Runtime/native/tests/config content | Baseline | Byte-identical to baseline | Diff constrained to documentation and root ignore file |
| Fresh Chromium paired smoke | Pass | Pass | Details below |
| Root ignore rules | Absent | Representative cache/build/secret paths ignored | Model/video/source assets not blanket ignored |
| `git diff --check` | Clean baseline | Pass | No whitespace errors |

Initial fresh-checkout `npm test` in mobile failed before dependencies/build existed (`https-proxy-agent` missing). First `npm ci` then failed because the environment's default `/home/agent/.npm/_cacache` path was unavailable. Retrying `npm ci --cache /workspace/npm-cache --ignore-scripts --no-fund --no-audit` succeeded; build and four package tests passed before edits. This setup failure was not hidden or fixed by changing application code/dependencies/lockfiles.

One initial candidate browser smoke failed when reloading immediately after checking a workout set. The handler persists under an asynchronous navigator lock; the harness had not waited for durable storage. The paired rerun waits for the saved set value before reload. Immediate-navigation/interrupted-write durability remains a follow-up risk, not a fixed or passed scenario. No workout code was changed to make the test pass.

### Paired browser smoke coverage

A task-local Node/Playwright harness drove two local Python HTTP servers against baseline and cleanup. Browser used the environment proxy for external runtime requests; HTTPS errors were ignored only in the test context for the cloud inspection certificate. This is not a product TLS/security acceptance test. Raw logs and screenshots stay outside the repository under `/workspace/handoff-evidence` in the originating workspace (not portable artifacts).

- Home, catalog, guide, upload and history at 320/390/1440 CSS px: no horizontal overflow in the exercised states.
- Corrupt MP4: readable playback error, no fabricated analysis.
- Real public UCF101 `HandstandPushups/v_HandStandPushups_g04_c02.avi`, re-encoded H.264 640px: decoded, reviewed and analyzed with real MediaPipe; no pose/score/history injection. Capture answers explicitly set side/full body/unassisted for integration gating; these declarations do not establish that this source meets the product's intended capture conditions.
- Results, skeleton player play/pause and history persisted after reload.
- Training plan: selected exercise and saved; active workout: checked set and reloaded with set preserved; exercise-library search returned a match.
- Original Lab and preview Coach loaded; their behavior additionally covered by unchanged Node suites. No live Gemini call was made.
- Zero uncaught page errors and zero outbound POST requests in either paired run. MediaPipe diagnostic console output is not covered by a blanket zero-warning claim.

Public source reuse checks integration, not correctness of a grade or reference hold duration. Only one real source was used. No physical iPhone/Android, WebKit run, native compilation/signing, cloud-provider response, deployment or labeled accuracy benchmark was performed. These limits apply despite passing tests.

## Reproduce core checks

```sh
node --test tests/*.test.*
node --check preview/ai-feedback.js
cd mobile
npm ci --ignore-scripts --no-fund --no-audit
npm run build
npm test
```

Inspect current browser scripts before use; historical harnesses are not all drop-in acceptance commands. For a fresh manual paired check serve baseline and candidate separately, use fresh browser profiles, the same authorized video/answers and environment, repeat upload/results/player/history and training/workout reload. Compare numeric diagnostic fields and storage outcomes, ignoring run dates/timing performance noise. Do not save private diagnostics to this report.

## Handoff decision

No risky deletion needs approval because none was attempted. The remaining cleanup is investigative: map runtime/style/evidence reachability before proposing any removal. The next substantive product task is a frozen-engine manually labeled reliability pilot, then backward-compatible complete report storage, then new features. The ready-to-paste Claude message is in CLAUDE_HANDOFF.md.

Paired numeric output: before/after score **58 / 58**, selected hold **2.2 / 2.2 seconds**. Raw metric objects, timing result and checked functional outcomes matched exactly. These are observed engine outputs, not reference truth.
