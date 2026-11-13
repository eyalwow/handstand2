# MOVALYT / Handstand Lab / Handstand Coach

MOVALYT is a Hebrew/RTL calisthenics video-analysis and training application. Videos are processed locally with MediaPipe. Handstand timing and technique are experimental measurements from 2D projections, not a validated coach grade. Exercise-library availability is narrower than its catalog.

## Start here

- [Current status and known limits](docs/CURRENT_STATUS.md)
- [Architecture and product boundaries](docs/ARCHITECTURE.md)
- [Analysis engine and a 30-video validation plan](docs/ANALYSIS_ENGINE.md)
- [Repository/PR inventory and cleanup decisions](docs/PROJECT_CLEANUP.md)
- [Instructions for Claude Code](CLAUDE.md)
- [Ready-to-use handoff prompt](docs/CLAUDE_HANDOFF.md)

This handoff is stacked on **Draft #47** (`86263e1`), which includes #43's black/lime UX and #44–#47 reliability work. It is not based on main or the separate #48 black/orange redesign. Do not merge these alternatives simply because their numbers are newer. See the inventory before changing bases.

## Run locally

Requirements: Node.js 22+ for tests/native packaging; Python 3 for a static server. There is no root npm package or frontend compilation step.

```sh
# From the repository root
python3 -m http.server 8000
```

| URL | Product |
| --- | --- |
| `http://localhost:8000/vercel-app/` | Current MOVALYT athlete experience |
| `http://localhost:8000/vercel-app/training.html` | Training library and workout planning |
| `http://localhost:8000/vercel-app/workout.html` | Active workout execution |
| `http://localhost:8000/` | Original standalone Handstand Lab |
| `http://localhost:8000/preview/` | Separate Handstand Coach demo |

Use localhost or HTTPS for browser capabilities. The website downloads pinned MediaPipe runtime/model assets; initial analysis needs network access. A static server does not execute `vercel-app/api/coach.js`. MOVALYT's cloud-feedback policy is intentionally closed; no key is needed for local analysis. The older root/preview demos have different Gemini paths: do not enter credentials or make provider requests during ordinary smoke tests.

## Tests and packaging

```sh
node --test tests/*.test.*
node --check preview/ai-feedback.js
# Native web build (not an APK/IPA build)
cd mobile
npm ci --ignore-scripts --no-fund --no-audit
npm run build
npm test
```

Build before mobile tests: they inspect generated `mobile/www/`. The build copies 42 reachable athlete modules at this snapshot, bundles pinned JS/WASM and validates the model checksum. `mobile/www/`, dependencies and model cache are generated and ignored. First build downloads the model; a verified local model can be supplied with `MOVALYT_MODEL_FILE` (see [mobile instructions](mobile/README.md)). No dependency/model upgrade is required.

Optional browser harnesses require Python Playwright and compatible browser binaries. Read the selected script before running: older harnesses can assume older DOM, external caches, private clips or write screenshots into tracked evidence folders. Prefer `--out /tmp/movalyt-...` where supported. Compilation of a Python harness is not a browser test. Native sync, Android compilation and iOS compilation are separate from `npm run build`; see mobile/README.md. Physical device acceptance remains necessary.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html` | Standalone Lab; inline analyzer and older direct Gemini integration |
| `preview/` | Coach demo and its own feedback module; not a duplicate to delete |
| `vercel-app/` | Athlete UI, current analyzer, training/workout modules and dormant server boundary |
| `mobile/` | Capacitor 8.6.0 wrapper and packaging adapter; athlete only |
| `tests/` | Node regressions, browser fixtures and calibration-source metadata |
| `scripts/` | Browser checks, asset preparation and analysis research tooling |
| `docs/` | Current entrypoint docs plus preserved design/QA/research evidence |
| `.github/workflows/` | Coach/analyzer checks and conditional native build preparation |

## Active versus experimental

Handstand timing, capture questions, local feedback, replay/skeleton, exercise browsing and web training/workout flows exist. Technique scores require affirmative capture answers and remain unvalidated. Front Lever observations are experimental for five unassisted variants, without a grade or verification that the selected variant was performed. Most catalog entries provide guidance/training only. Cloud AI, physical-device certification, calibrated accuracy, accounts/cloud sync and full saved Handstand reports are not established features.

Do not treat historical `PROJECT_STATUS.md`, `design-qa.md` or screenshots as proof of current test results. Fresh handoff verification and its limits are recorded in docs/PROJECT_CLEANUP.md.
