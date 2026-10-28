# MOVALYT — Performance Editorial

Based on PR #20 head `ce402f78ff4d8aecc75d8c06053b0b2bfd732b72` (classic MediaPipe Worker bootstrap). This is a stacked UI-only draft against `fix/movalyt-responsive-analysis`.

Home now leads with the selected training plan, three exercise prescriptions, start/resume, saved session count and last valid analysis. It reads existing keys without writing or seeding them. No demo data or fixtures were replaced. Unknown selection values use the same beginner defaults as the training page without overwriting storage.

The report's document and keyboard order is replay, technique metrics, measurement caveat and coaching. Existing IDs, event handlers, consent, empty/error states and analysis scripts remain intact. Charcoal surfaces, a consistent Rubik type scale, rules instead of cards, restrained lime, logical RTL spacing, visible focus and reduced-motion support replace decorative gradients and halos on the two redesigned screens. Training and workout screens are outside this visual scope.

## Verification

- Node regression suite: 48/48 passed. Brand tests now check the training-led home while preserving analyzer IDs, privacy text, empty-score and consent assertions.
- Chrome headless, 1440×960, 390×960 and 320×960: Home, upload screen and completed report have no horizontal overflow or page errors. Fresh Home leaves storage empty; start links carry the selected goal/level/day. AI consent remains off and report stays hidden before analysis.
- Full upload → scoring → replay → local coaching UI regression uses a generated 4.2s WebM and an intercepted deterministic test Worker with synthetic landmarks. Five metrics render, replay precedes metrics, desktop metric layout is a grid and mobile layout stacks. Speed, skeleton toggle and next-frame controls respond.
- Test-only video/Worker interception is outside shipped application code. These checks do **not** establish real MediaPipe accuracy, CDN initialization, human hold duration, ascent/descent correctness, physical mobile behavior or live Gemini response. The real-human validation outstanding in PR #20 remains outstanding.
- No analyzer/Worker thresholds, server API, environment settings, dependencies or billing changes. Preview only; no merge or Production release.

Manual review: open Home with fresh storage, select a plan in Training, return, start/resume a workout, and inspect saved progression. In Analyze upload a side-view full-body clip; verify cancellation/error recovery, honest measured scope, replay controls, radar and grounded local feedback. Repeat on a physical mobile before release.
