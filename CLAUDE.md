# Claude Code working instructions

## Read before editing

Read README.md, docs/CURRENT_STATUS.md, docs/ARCHITECTURE.md, docs/ANALYSIS_ENGINE.md and docs/PROJECT_CLEANUP.md. Verify `git status`, current branch and remote PR heads; saved status is a snapshot, not live truth. Preserve other people's edits.

## Products and source of truth

- `index.html`: original standalone Handstand Lab, inline analyzer.
- `preview/index.html` + `preview/ai-feedback.js`: separate Handstand Coach demo. Changes here do not automatically change MOVALYT.
- `vercel-app/`: current MOVALYT athlete, training and workout source.
- `mobile/`: packages the athlete module graph from vercel-app; generated www is never source. Training/workout pages and server functions are excluded.
- Current baseline includes #43 UX and #44–#47 reliability changes. #48 is a divergent redesign from main. Do not substitute it or resurrect rejected designs without an explicit task.

## Git workflow

Use a separate task branch. This cleanup PR is stacked on `fix/movalyt-feedback-evidence` (#47), not main. Review only the cleanup delta against that base. Do not merge, force-push, rebase shared stacks, close/delete PRs/branches, deploy or change Vercel settings without explicit authorization. Create Draft PRs with actual validation results and name the dependency/base. Before pushing, inspect staged files, secrets and private-data risk.

## Engineering rules

Prefer the smallest behavior-preserving change. Do not refactor architecture, rename storage/exercise IDs, consolidate apparently similar engines or delete historical tests/assets solely to reduce file count. A file absent from the main page can still be used by another entrypoint, dynamic module, build adapter, browser harness or historical evidence. Preserve DOM IDs used by harnesses. Keep raw metrics, timing, score policy, display smoothing and coaching separate.

Do not change model/library versions, thresholds, score formulas, phase definitions, capture gates, consent policy, storage schemas, native origins or permission scope without explicit task authorization and relevant regression coverage. Missing evidence is null/unknown, never a zero grade. Pose visibility is not probability of accuracy. User capture answers are declarations, not automatic verification.

## Required verification

For application changes: run `node --test tests/*.test.*`, syntax checks for changed JS and `git diff --check`. For packaging/module graph changes: also `cd mobile && npm ci --ignore-scripts --no-fund --no-audit && npm run build && npm test`. Root tests have no install step. Read both workflow files for CI's actual checks; do not claim Python py_compile is browser coverage.

For flow/UI changes: interact with affected screens, check console/network, test 320/390/1440px, reduced motion and keyboard; run WebKit when available. For engine changes: paired baseline/candidate runs on identical authorized clips, source timestamps, all candidate runs and diagnostics; compare timing, geometry, abstentions and recommendations. Synthetic fixtures test logic/integration, not human accuracy. Run relevant training/workout and Coach regressions even when focusing on athlete UI.

Do not assert pass without running. Record environment/tool versions, failures, skips and physical-device gaps. Do not run stale browser harnesses blindly: inspect selectors, cache paths, output paths and network behavior first.

## Privacy and external services

No private clips, frames, landmarks, per-person diagnostic reports, keys or identifying filenames in Git, screenshots, issues or PR bodies. Use authorized local data outside the checkout. Do not inspect unrelated private files. No raw-video upload or saving video without explicit consent; report storage and media consent are distinct. Do not enable MOVALYT cloud feedback, introduce paid services or call older demo Gemini integrations during routine tests. `.gitignore` is a guardrail, not a privacy system; inspect staged content.

## iOS and Android

Preserve `capacitor://localhost` (iOS), `https://localhost` (Android), app ID, local-only CSP and model checksum. Do not add server.url, broad storage permissions, mixed content or credentials. Validate codec/HEVC, portrait metadata, media timestamps, Worker/main fallback, background/resume, memory and picker behavior on real devices before claiming support. Desktop Chromium packaging tests do not certify WKWebView or Android WebView. Signing, store publication and paid native services require separate authorization.

## Handoff

Explain what changed, why, tests actually run and remaining limits. Keep current docs updated; preserve historical reports as dated evidence. If a deletion cannot be proven safe, retain it and add a concrete investigation note.
