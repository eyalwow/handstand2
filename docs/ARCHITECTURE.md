# System architecture

Snapshot: #47 at `86263e192d258214fdf4e07f96d384e74a6d4bea`; includes #43, excludes divergent #48.

## Product boundaries

**Handstand Lab** is the original root `index.html`, a standalone analyzer with inline JS and an older direct-provider feedback path. **Handstand Coach** is `preview/index.html`, with its own `preview/ai-feedback.js` evidence, local plan and optional personal-key Gemini request. Both remain public entrypoints/test targets; neither is merely a backup of the athlete page.

**MOVALYT athlete** lives in `vercel-app/`. `index.html` loads handstand-engine.js, home-ui.js and variation-history-ui.js plus four CSS entry sheets. JS imports compose navigation, onboarding, exercise selection, upload review, measurement and reporting. Styling layers and older CSS/assets must be traced before consolidation. `training.html` and `workout.html` are separate web surfaces, not included in native packaging.

## Athlete video pipeline

1. `analysis-catalog.js`, `analysis-registry.js`, `analysis-selection.js`, `analysis-library-ui.js`: stable catalog IDs, capabilities, variants and dispatch. Availability is derived from runnable engines; library size is not supported-analysis count.
2. `upload-review.js`: File/Blob preview, object-URL lifecycle, exercise association, capture declarations and explicit start. It does not upload or persist video.
3. `handstand-engine.js`: orchestration, input errors, cancellation, frame capture, routing, measurement, report and limited summary persistence.
4. `video-sampling.js` + `handstand-sampling.js`: chronological seeks/source timestamps; Handstand uses presented media-frame time when available. Repeated final-frame handling is diagnostic. Do not replace time with wall clock or blindly infer duration from fps.
5. `pose-runtime.js`: Worker lifecycle/timeouts; feature-specific main-thread fallback through pose-main.js. `pose-worker.js`: pinned MediaPipe Tasks Vision initialization and inference. GPU/CPU behavior is runtime-dependent.
6. `handstand-temporal.js`: raw observation validity, side selection, hold candidates, motion, support lowering, selected interval and endpoint uncertainty. `handstand-entry.js`/`handstand-fall.js`: entry/ending observations. #47 associates ascent evidence with the selected attempt.
7. `handstand-measurement.js` + `handstand-score-policy.js`: selected-interval geometry, validity gates, projected metrics and unvalidated scoring bands. `handstand-summary.js`: phase scope and combination.
8. `handstand-coaching.js`, `handstand-insights-ui.js`, `movalyt-ui.js`: evidence-scoped local feedback/report. `pose-overlay.js` smooths display only; smoothed points must not be graded.
9. `front-lever-analysis.js`/`front-lever-ui.js`: separate experimental observation contract, never a Handstand grade.

## Training and Coach

`exercise-library.js` defines training exercises; analysis-catalog maps training names to stable derived IDs. `training-core.js` and `training-ui.js` manage plans. `workout-core.js`, `workout-ui.js` and workout media manage active sets, timers, resume and completion. Exercise-library presence does not authorize an analysis engine for that exercise.

The older Coach module and MOVALYT's similarly named `ai-feedback.js` have different contracts. Athlete `server-gemini.js` explicitly disables cloud feedback. `api/coach.js` returns disabled status and denies POST under current policy; its downstream validation/provider implementation is retained, not an active cloud feature. Static HTTP cannot execute this function. Never copy the older personal-key behavior into the athlete implicitly.

## Data

Browser-local, origin-scoped storage:

| Key | Owner |
| --- | --- |
| `handstand-lab-analyses-v1` | Legacy Handstand score/date/model summaries |
| `movalyt-variation-observations-v1` | Front Lever experimental time/metrics |
| `movalyt-preferences-v1` | Onboarding preferences |
| `movalyt-library-selection-v1` | Catalog selection |
| `handstand-lab-workouts-v1` | Training plans/history |
| `handstand-lab-active-workout-v1` | Resumable workout |
| `handstand-lab-training-ui-v1` | Training UI state |

Read each owner's validators before modifying. A new origin, storage-key rename or native scheme change can appear as data loss. Handstand summary records do not contain full metric reports or videos; timing-only outcomes do not become complete saved reports. No new migration is implemented by this handoff. No accounts/cloud sync are established here.

## Mobile and deployment

Capacitor 8.6.0 sources are in mobile/android and mobile/ios. `mobile/scripts/build-web.mjs` traverses athlete JS imports, copies assets/styles, bundles Tasks Vision 0.10.14 plus a verified Lite model, localizes only runtime asset defaults and adds native-shell.js/CSP. It excludes training/workout/server pages. `native-build.json` records source/package hashes. Do not edit generated www or native public folders.

Website deployment configuration remains `vercel-app/vercel.json`; this task does not change Vercel or deploy. Root/preview and Vercel source-root choices are separate product entrypoints; verify linked deployment metadata before any future publishing. CI contains historical branch/PR conditions, particularly iOS export limited to #31. Do not broaden them as cleanup.
