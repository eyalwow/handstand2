# MOVALYT fitness UX upgrade

Base: Draft #49, `chore/movalyt-claude-handoff`, commit `22a6631becf7c42cf47247bd2ca6d199a4dc1820`. Separate work branch `feat/movalyt-fitness-polish`. Work performed 2026-11-15. No #48 integration, merge, Production action, backend, provider activation or paid service.

## Initial visual/interaction audit and priorities

Fresh screenshots were captured from the running #49 source before edits at 320/360/390/1440px. Existing handoff reports were context, not pass evidence. No desktop browser control tool was exposed, so repeatable real Chromium/Playwright interactions and screenshot inspection were used.

| Priority | Screen / problem | User impact | Implemented response |
| --- | --- | --- | --- |
| P1 | Home only reveals video analysis; training is hard to discover | Existing daily-use features feel disconnected | Direct useful home cards and web training navigation; preserve native package scope |
| P1 | Legacy history infers numerical improvement from same-model scores despite unknown capture conditions | False confidence in progress | Remove delta labels and connecting trend area/line; retain actual records and discrete scores with explicit limits |
| P1 | Training and athlete pages use different brand chrome and controls | Product feels assembled from separate pages | Shared black/lime tokens, mark, local Hebrew type, panels, inputs and navigation |
| P1 | Results emphasize an experimental score | Perceived precision exceeds evidence | Observed duration first; neutral experimental score, accessible experimental label and visible uncertainty |
| P1 | Narrow layouts and enlarged type can squeeze controls | Difficult use during effort or with larger text | Wrapping hero/actions, intrinsic grids, large sets, root 200% testing and measured nav clearance |
| P2 | Catalog includes large unavailable cards with unfinished art | Excess scroll and unfinished-product impression | Compact text fallback; consistent approved-image sizing, visible counts, inline expandable filter fields |
| P2 | Repeated large artwork in upload | Delays choosing the actual video | Compact illustration, stronger selection/review grouping and full-size preview |
| P2 | Workout timer and set controls are weakly prioritized | More reading/tapping during exercise | Larger set surfaces, centered high-contrast rest clock, full-width wrapping controls and consistent summary |
| P2 | Replay lacked a visible H1; results duplicated landmark names | Assistive navigation ambiguity | Correct page heading and distinct measurement-report landmark |

## Changes by flow

1. **Home:** compact illustrated training panel, one analysis CTA, training/catalog cards, accessible last-analysis route. No fabricated metrics.
2. **Catalog/guide:** real availability grouping retained, readable cards/filters/counts, artwork normalized and missing-art placeholders removed visually without deleting assets. Unsupported analysis remains disabled.
3. **Upload:** exercise and local-video review remain separate; capture questions and unsure default remain untouched. Artwork reduced to make file choice faster.
4. **Processing:** bordered work panel, clear real stage indicators, larger readable progress and cancel control; no invented time-to-complete or fake progress.
5. **Results/replay:** observed duration distinguished from experimental index; report groups, controls and larger player surface. Timing-only explanation placed before video, without converting it to a score or altering engine text. Existing per-joint overlay and advanced evidence remain accessible.
6. **Training/workout:** same brand, local fonts, readable plans/filters, larger sets and timer, clear next/previous actions and actual completion summary. Core workout state/persistence is unchanged.
7. **History:** retained original storage/readers/records; no fabricated duration, missing video or coach report. Links to saved workouts exist only on web. Same-model scores remain discrete, explicitly not proof of progression.

## Skills, sources and permissions

Reviewed skills.sh listings and official source text. No `npx skills add`, external installer script, unknown skill binary or new runtime dependency was executed. Skills were applied as read-only guidance; existing browser tooling performed checks.

| Source | Applied guidance / limits |
| --- | --- |
| [Anthropic Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Specific fitness hierarchy, restrained chrome, purposeful artwork, cohesive copy and visual review; pinned black/lime brief wins |
| [Vercel Web Design Guidelines](https://skills.sh/vercel-labs/agent-skills/web-design-guidelines) / [official rules](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) | Native controls, clear labels/focus, safe areas, reduced motion, rem text, tabular timers, local fonts and lightweight interactions |
| [Apple HIG accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [layout](https://developer.apple.com/design/human-interface-guidelines/layout), [design tips](https://developer.apple.com/design/tips/) | Read directly as platform guidance, not a third-party installed skill; applied touch targets, larger-text reflow, RTL and safe areas. No Apple native certification claim |
| Product Design Audit | Screenshot-first current-state review and evidence tied to screens. No canvas or image-generation detour required for the existing approved design |
| [Anthropic webapp-testing](https://github.com/anthropics/skills/tree/main/skills/webapp-testing) | Reconnaissance, real interactions, stable selectors, state waits, console/network monitoring and cleanup. Adapted to installed Node Playwright; did not run black-box external helpers |
| [Vercel agent-browser](https://skills.sh/vercel-labs/agent-browser/agent-browser) | Reviewed capability/permission stub; CLI not installed or invoked. Used installed Playwright instead; no claim of running agent-browser |
| [Cloudflare web-perf](https://skills.sh/cloudflare/skills/web-perf) | Applied network/source inspection and scoped lab observations. Chrome DevTools MCP trace tools absent; no Lighthouse, field INP or full performance-trace result claimed |

No React-specific skill/framework was introduced into the vanilla JS application. axe-core 4.10.3 was used for rendered-page checks, not as proof of full WCAG compliance.

## Verification

- Before: root suite **147 pass / 0 fail** on #49. After: **147 pass / 0 fail**. Three older tests that required no training navigation, and the test expecting score-delta labels, were updated to the new authorized behavior; privacy and storage assertions retained.
- Native package builds with **43 athlete modules** (one new presentation module) and bundled pinned model. After: **5/5 package tests** including a new test for shared assets and removal of unavailable training links. Existing package contracts remain.
- Model, engine, sampling, temporal/measurement/score policies, pose overlay, coaching, workout/training cores, storage readers/keys, Lab/Coach demos and Vercel configuration remain byte-identical to base. Presentation modules/HTML/CSS and packaging adapter are the implementation surface.
- Paired real public-video inference against baseline/candidate: **58/100, 2.2s**, raw metric object and hold timing match exactly. This is an integration regression, not accuracy validation. Source: public UCF101 HandstandPushups g04 c02, H.264 640px derivative; no generated poses/results or private clips. Capture answers used for scored regression are explicit test declarations, not proof that the source meets intended capture conditions.
- Corrupt MP4: recoverable error. Unanswered capture setup: observed timing only, no visible grade and no history write. Synthetic no-body video: error without grade/history. Cancellation: recoverable upload, no history write.
- Four widths **320/360/390/1440**, normal and root **200% text**: 48 layout/axe combinations across home/catalog/upload/history/training/workout; 16 more across real results/replay. No horizontal page overflow in checked states. Root font scaling tests rem-based content; it is not a physical OS Dynamic Type test or every browser's text-only zoom implementation.
- Real interactions at all four widths: supported filter, empty search, experimental Front Lever path, training-library search/details/Escape, set selection, rest/start/skip, saved set reload, finish/continue/confirm and summary.
- Keyboard checks at enlarged text: actual controls received visible focus above bottom navigation; about dialog closed with Escape. A BODY tab-cycle boundary is not an actionable control and is excluded from the overlap assertion.
- Initial a11y sweep found moderate duplicate-landmark and replay-H1 issues; both corrected. Final sweep: zero axe violations across all 64 checked state/width/text-size combinations. No accessibility certification implied.
- An early test read Front Lever consent before asynchronous hash navigation finished; corrected to wait for the visible control. No app change was made to hide that test failure.
- Workout reload deliberately waits for actual local storage write; immediate-reload race described in prior cleanup remains outside this presentation task.

### Performance scope

No animation library, large imagery, expensive blur or backend was added. New assets are about 26KB of uncompressed CSS/JS at this snapshot. Training/workout no longer request external Google Fonts; local font faces use swap. Browser request checks verify this. Batched training-library rendering remains unchanged. Local rAF/paint/long-task observations were collected without throttling; they are not real-device scroll FPS, field CWV or a speedup claim. No removal of old CSS was attempted without reachability proof.

A local unthrottled training load exposed layout shifts as empty day tabs/headings filled. Reserving their known chrome reduced the observed non-input layout-shift sum from 0.166 during implementation to 0.050 in the checked run; this is a single local observation, not a before/after Production CWV claim. The same run recorded no long tasks and a roughly 16.7ms median rAF callback interval, which is not proof of physical-device scrolling quality.

### Reproduce

```sh
node --test tests/*.test.*
cd mobile
npm ci --ignore-scripts --no-fund --no-audit
npm run build
npm test
cd ..
# Requires an existing Playwright installation and Chromium, plus axe-core script:
node scripts/verify-fitness-ui.cjs --axe /absolute/path/axe.min.js --out /tmp/movalyt-fitness-qa
```

The browser script uses a fresh profile and local temporary server, produces report.json/screenshots, and never calls a provider. Use --chromium to supply a different local Chromium path; --port avoids conflicts. If Playwright is installed in a tooling directory, expose that directory's node_modules through NODE_PATH; do not add application dependencies just for the harness. Real-video paired/state tests were task-local and used authorized public/synthetic inputs, not private data in Git.

### Not verified

WebKit binary was present but failed to launch because host GTK4/Graphene/Harfbuzz-ICU/Manette/Hyphen/GLES libraries are missing; no supported system-package helper was exposed. No physical iPhone/Android, camera permission sheets, native compilation/signing, PWA install/resume, screen-reader session or labeled pose-accuracy certification. Native HTTP packaging tests are not WKWebView tests. Local inference browser used environment proxy and ignored its inspection certificate in the test context; not a product TLS/security test.

## Before / after evidence

All images captured in this task. Full-page screenshots include fixed navigation at the viewport's location; scroll/focus interactions were tested separately. Blank or stale captures were not used as accepted evidence. Motion/video screenshots use public research footage and do not establish measurement accuracy.

| Screen | Before | After |
| --- | --- | --- |
| Home | [image](fitness-upgrade/screenshots/before-home-390.png) | [image](fitness-upgrade/screenshots/after-home-390.png) |
| Catalog | [image](fitness-upgrade/screenshots/before-catalog-390.png) | [image](fitness-upgrade/screenshots/after-catalog-390.png) |
| Upload | [image](fitness-upgrade/screenshots/before-analyze-390.png) | [image](fitness-upgrade/screenshots/after-analyze-390.png) |
| Training | [image](fitness-upgrade/screenshots/before-training-390.png) | [image](fitness-upgrade/screenshots/after-training-390.png) |
| Workout | [image](fitness-upgrade/screenshots/before-workout-390.png) | [image](fitness-upgrade/screenshots/after-workout-390.png) |
| Real results | [image](fitness-upgrade/screenshots/before-results-390.png) | [image](fitness-upgrade/screenshots/after-results-390.png) |

[Player](fitness-upgrade/screenshots/after-player-390.png) · [Timing-only state](fitness-upgrade/screenshots/timing-only-390.png) · [Workout summary](fitness-upgrade/screenshots/workout-summary-390.png)

See DESIGN.md for tokens and ownership. Preview availability/protection must be checked from the new Draft PR; no Vercel setting is changed to make it public.

## QA follow-up — 15 November 2026

The original PR #50 snapshot has eight independently reproduced QA findings. Their fixes, measured before/after evidence, regression coverage and platform limits are tracked in [PR50_REGRESSION_FIXES.md](PR50_REGRESSION_FIXES.md). Read that follow-up alongside the historical implementation checks above.

## Navigation and training follow-up — 18 November 2026

[Final navigation/UX validation](PR50_FINAL_VALIDATION.md) records the cross-document Back correction, per-entry catalog state, focused training/review/player improvements, current tests and platform limits. The earlier 15 November Back check covered same-document history only.
