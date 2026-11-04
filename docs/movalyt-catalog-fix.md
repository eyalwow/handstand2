# Catalog follow-up to Draft #38

Base: `feat/movalyt-approved-illustrations` at `6ebcd4d798678b020cb87f55b30ab9bd6f165cff`.

## Changes

- Planche and Front Lever family cards reuse the approved Full Planche and Full Front Lever stills already shipped by #38, before any variation is selected. Existing media decoding, layout and error fallback apply.
- Banded Full Planche and Banded Full Front Lever remain variations in their original families. All original 158 exercise/history/legacy-name identities retain their snapshot. No standalone band family or category is added.
- Added `planche-lean` (הטיית פלאנץ׳ / Planche Lean) to Planche's unassisted variations and search, with its own guide, grounded-feet criteria and persistent library selection. No analysis engine is enabled.
- Added `plancheLean` to the training library and a guide link to the workout exercise picker. Before starting, users can choose a single exercise or retain the complete existing plan. Single-exercise workouts use the existing sets, reload, completion and history paths. An active saved workout takes priority over a newly requested exercise; history is never migrated or overwritten.

## Final supplied artwork

Both originals from the user-provided `MOVALYT_PR39_missing_artwork.zip` are integrated:

- `handstand-corrected.png` → `handstand-corrected.webp`: rear view, straight freestanding Handstand, replacing the old catalog/guide illustration. The old `handstand.webp` is removed.
- `planche-lean.png` → `planche-lean.webp`: Planche Lean's variation card and filming guide. The Planche family cover remains Full Planche.

Both 1254×1254 PNGs were resized proportionally to 720×720 using Lanczos, with no cropping, and encoded as WebP (quality 85, method 6). Outputs total 38,712 bytes (15,110 and 23,602), compared with 1,614,511 bytes for the originals. Source/output SHA-256 hashes and conversion settings are in [the provenance record](movalyt-final-artwork.json). The exact supplied artwork was used; no image was generated or substituted.

## Validation

- 140/140 Node tests, including the original engine byte hashes, original identity snapshot, family artwork, assisted variants, Lean selection and completed Lean workout history without duplication.
- All existing workflow JavaScript syntax and Python harness compilation checks pass.
- Chromium at 320, 390 and 1440 CSS pixels: family covers decode before selection; 25 variation/guide/reload scenarios per width; band assistance stays in-family; Lean guide and workout selection; workout set reload; active-workout protection; completion and reload produce one history entry. Visible images decode; no horizontal overflow, page errors, HTTP errors or POST requests. See [checks](screenshots/catalog-fix/checks.json) and screenshots in the same directory.
- The corrected Handstand illustration decodes on its main card and guide. Planche Lean decodes on its variation card and guide. Every illustrated Planche/Front Lever variant is checked against its media mapping. Handstand still navigates to its analyzer.

Browser checks use the locally served website. No physical-device or new video inference validation. No merge, production deployment, new integration or paid service activation.

## Hosted Preview

[READY Preview](https://handstand-lab-coach-1k3y7645c-eyalwen-6443.vercel.app/) for application commit `faf56cf082899735a5bd0acd6690c84b14cf431b`, project `handstand-lab-coach`, target Preview (`target: null`). Existing Vercel Authentication redirects unauthenticated requests to SSO; hosted application flows were not browser-tested. Deployment protection was not changed.

GitHub Actions [Validate handstand coach](https://github.com/eyalwow/handstand2/actions/runs/41914462209) passed on application commit `faf56cf`. The separate `handstand-coach-demo` Vercel integration has an existing configuration failure: its Root Directory `coach-app` is absent. The intended `handstand-lab-coach` Preview succeeded. No project configuration was changed.
