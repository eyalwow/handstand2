# MOVALYT — apple-design implementation

Same Draft PR #30, branch `feat/intelligent-handstand-analysis`. Baseline
`e03320e714c424b958445eab09aa382b3dd731fb`. The supplied skill was read from its local
archive and applied to web layout/typography/controls; no install or refresh script
was run. [Design audit and reference rationale](apple-design-audit.md).

## Visible changes

- Upload: one native gallery/file picker, a separate camera action, expandable
  filming tips and a content-sized photograph card that also supports 200% text.
- Processing: readable stage/status text, honest existing progress, RTL progression,
  and preserved cancellation. No new simulated progress or pose samples.
- Results: compact score beside the measured hold interval, prominent **צפה בסרטון
  עם שלד**, readable strength/focus/evidence/drills, advanced metrics collapsed.
- Player: original aspect ratio, full-width seeking, readable clock/speed, grouped
  frame-back/play/frame-forward controls and separate skeleton/angle switches.
  Default 12-joint overlay and opt-in advanced overlay are preserved.
- Navigation: RTL back affordances, ≥44px control targets, fixed safe-area-aware
  tabs; Analysis returns to the existing result/player instead of restarting upload.
- Dark palette/approved photographs/local Rubik retained. Body 17px, support15px,
  metadata13px via rem; stronger control boundaries, reduced motion/transparency
  and forced-color fallbacks. No new paid asset or cloud service.

Flow styles now live in `vercel-app/mobile-flow.css`. Superseded component rules
were removed from app.css rather than accumulated as overrides. UI formatters and
route handlers changed; measurements and coaching content generation did not.

## Actual screenshots

| Flow | Before and after at 390px |
| --- | --- |
| Upload | [Comparison](screenshots/apple-design/capture-comparison.jpg) |
| Processing | [Comparison](screenshots/apple-design/processing-comparison.jpg) |
| Results | [Comparison](screenshots/apple-design/results-comparison.jpg) |
| Skeleton player | [Comparison](screenshots/apple-design/player-comparison.jpg) |

[Overview](screenshots/apple-design/comparison.jpg) ·
[Full report](screenshots/apple-design/after-report-full-390.png).
Other widths and 200% text/portrait captures are in the same directory. These are
actual local Chromium captures, not mockups; processing uses real inference.
The public handstand-walking fixture is existing cached UCF101 `g04_c01`, plus a
padded portrait derivative. No newly supplied personal video was used or committed.

## Validation

- **89/89 Node tests pass**, production module syntax, Python harness compilation,
  and whitespace checks pass. Existing functional harness and new design harness
  used native file inputs, the actual Worker/MediaPipe and moving video, without
  injecting scores/poses/history.
- Chromium mobile emulation at **320/375/390/430px**: upload → real progress →
  results → visible skeleton CTA → synchronized replay. Play/pause, .5× speed,
  frame steps, skeleton/angles, cancel/retry, history/reload and navigation pass.
  Desktop1440 received a basic usability/overflow smoke check.
- At390: 200% root font/reflow, keyboard focus/Space playback, reduced motion,
  increased contrast and simulated47/34px safe areas pass. No horizontal overflow
  or uncaught JavaScript errors. Expected user-cancellation AbortError is logged.
- Final baseline case71; final four widths and portrait derivative71,42 samples.
  One earlier run during concurrent testing returned70. Inference is not assumed
  perfectly deterministic: the oracle checks valid real values and preserved
  source/measurement contracts, rather than forcing a reference score.
- [Matrix](screenshots/apple-design/after-checks.json),
  [final focused390](screenshots/apple-design/focused-390-checks.json),
  [functional report](screenshots/apple-design/functional-checks.json),
  [SHA-256 preservation proof](screenshots/apple-design/preserved-contracts.json).
  Engine/scoring/pose renderer, Worker/runtime/sampling, coaching, onboarding and
  history modules listed there are byte-identical to baseline.

No physical iPhone/Android was available. Actual iOS file/camera sheets, Dynamic
Island, browser chrome and VoiceOver/TalkBack still need device validation. The
known Linux WebKit `GLctx.activeTexture` inference failure was not repeatedly
retried; this iteration is Chromium-tested, not a successful Safari inference
certification. No merge, production, Vercel configuration, SSO or Coach change.
