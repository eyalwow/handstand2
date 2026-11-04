# Catalog follow-up to Draft #38

Base: `feat/movalyt-approved-illustrations` at `6ebcd4d798678b020cb87f55b30ab9bd6f165cff`.

## Changes

- Planche and Front Lever family cards reuse the approved Full Planche and Full Front Lever stills already shipped by #38, before any variation is selected. Existing media decoding, layout and error fallback apply.
- Banded Full Planche and Banded Full Front Lever remain variations in their original families. All original 158 exercise/history/legacy-name identities retain their snapshot. No standalone band family or category is added.
- Added `planche-lean` (הטיית פלאנץ׳ / Planche Lean) to Planche's unassisted variations and search, with its own guide, grounded-feet criteria and persistent library selection. No analysis engine is enabled.
- Added `plancheLean` to the training library and a guide link to the workout exercise picker. Before starting, users can choose a single exercise or retain the complete existing plan. Single-exercise workouts use the existing sets, reload, completion and history paths. An active saved workout takes priority over a newly requested exercise; history is never migrated or overwritten.

## Missing required artwork — incomplete items

The user supplied both illustrations visually in the chat. Their original PNG bytes were not exposed as downloadable file references or workspace files. Neither named file was found in the accessible workspace, PR #38 tree, or pinned #37 asset tree:

- `הטיית_פלאנץ_כוח_ושליטה.png`
- `עמידת_ידיים_מושלמת.png`

Planche Lean uses the existing pending-artwork marker, with no substitute illustration or broken image URL. Handstand keeps its existing #38 image. The requested new Lean illustration and corrected rear-view Handstand replacement remain blocked until the exact originals are supplied. No new image was generated or substituted. A downloadable PNG/ZIP attachment is needed to integrate the exact supplied artwork.

## Validation

- 140/140 Node tests, including the original engine byte hashes, original identity snapshot, family artwork, assisted variants, Lean selection and completed Lean workout history without duplication.
- All existing workflow JavaScript syntax and Python harness compilation checks pass.
- Chromium at 320, 390 and 1440 CSS pixels: family covers decode before selection; 25 variation/guide/reload scenarios per width; band assistance stays in-family; Lean guide and workout selection; workout set reload; active-workout protection; completion and reload produce one history entry. Visible images decode; no horizontal overflow, page errors, HTTP errors or POST requests. See [checks](screenshots/catalog-fix/checks.json) and screenshots in the same directory.
- Handstand guide still uses the existing artwork and navigates to its analyzer. Corrected artwork cannot be validated because its source is missing.

Browser checks use the locally served website. No physical-device or new video inference validation. No merge, production deployment, new integration or paid service activation.

## Hosted Preview

[READY Preview](https://handstand-lab-coach-bzpir15ig-eyalwen-6443.vercel.app/) for application commit `5a255ab7b36d3519cc87b43f5e16c03dc3506779`, project `handstand-lab-coach`, target Preview (`target: null`). Existing Vercel Authentication redirects unauthenticated requests to SSO; hosted application flows were not browser-tested. Deployment protection was not changed.

GitHub Actions [Validate handstand coach](https://github.com/eyalwow/handstand2/actions/runs/41913065459) succeeded on the application commit. The separate `handstand-coach-demo` Vercel integration fails before build because its configured Root Directory `coach-app` is absent (`NOW_SANDBOX_WORKER_ROOTDIR_NOT_EXIST`). The intended `handstand-lab-coach` Preview succeeded. No project configuration was changed.
