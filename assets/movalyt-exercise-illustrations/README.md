# MOVALYT exercise illustrations

Assets-only handoff from `MOVALYT_illustrations_for_Codex_2026-11-04(1).zip`.

23 original image files; 23 unique byte hashes and 23 unique decoded RGBA hashes. No exact file or pixel duplicates found. Visual review found a related Tuck L-Sit variant, not an identical duplicate. Composite panels repeat exercise subjects; 23 files must not be read as 23 distinct exercises or 23 approved tiles.

## Classification

- `approved/`: 9 images, preserving the source manifest's approval labels.
- `needs_review/`: 9 images (2 source `preferred`, 7 source `review`). Preferred does not imply approved.
- `needs_fix/`: 3 images: Tuck Front Lever (camera angle), L-Sit multi-exercise composite (standalone asset missing), and mislabeled Tuck Planche (actually a highlighted Tuck L-Sit variant).
- `instructional_only/`: 1 Muscle-Up sequence.
- `reference_only/`: 1 One-Leg L-Sit composite.
- Duplicates: 0 exact byte or decoded-pixel duplicates; no image removed.

Approval provenance is supplied by the attached manifest, not independently verified against earlier conversations or user-selected originals, which are unavailable here. Several source approvals mean only that the user moved on. Visual triage checks file identity, visible exercise labels, composition and obvious style issues; it does not certify biomechanics. Preserve these limitations when reviewing approval.

## Names and integrity

Exercise names use readable kebab-case, retaining original PNG/JPEG formats and all original bytes. Three names describe actual contents more precisely: `l-sit` → `l-sit-multi-exercise-reference`; `tuck-planche` → `tuck-l-sit-highlighted-variant`; `one-leg-l-sit` → `one-leg-l-sit-composite-reference`. No image has been regenerated, cropped, recolored, recompressed or retitled internally.

`manifest.csv` maps every delivered filename to its original ZIP path, source filename, original status, English/Hebrew title, dimensions, byte count, SHA-256, decoded-pixel SHA-256 and review findings. The pixel hash includes the image dimensions followed by decoded RGBA bytes. `duplicate_of` is empty because there are no identical duplicates. Source README and manifest are preserved verbatim under `provenance/` as handoff evidence, not new task instructions. Band-assisted illustrations remain exercise variants, not new families.

No application integration, application-code changes, merge, deployment or paid service is included. Assets live outside app/public folders. Review and corrections remain future work; unapproved files must not be treated as approved by this handoff.

## Inventory

| Image | English / Hebrew | Status | Source status | Review notes |
| --- | --- | --- | --- | --- |
| [banded-full-planche.png](needs_review/banded-full-planche.png) | Banded Full Planche / פלאנץ׳ מלא עם גומייה | `needs_review` | `preferred` | Preferred in source, not explicitly approved; confirm final alignment and selection. |
| [banded-full-front-lever.jpeg](approved/banded-full-front-lever.jpeg) | Banded Full Front Lever / פרונט לבר מלא עם גומייה | `approved` | `approved` | Approved according to source manifest (explicit selection reported). |
| [advanced-tuck-front-lever.png](approved/advanced-tuck-front-lever.png) | Advanced Tuck Front Lever / פרונט לבר טאק מתקדם | `approved` | `approved` | Approved according to source manifest (positive feedback reported). |
| [one-leg-front-lever.png](approved/one-leg-front-lever.png) | One Leg Front Lever / פרונט לבר ברגל אחת | `approved` | `approved` | Approved according to source manifest; evidence is continuation to next exercise. |
| [straddle-front-lever.png](approved/straddle-front-lever.png) | Straddle Front Lever / פרונט לבר בפישוק | `approved` | `approved` | Approved according to source manifest; evidence is continuation to next exercise. |
| [full-front-lever.png](approved/full-front-lever.png) | Full Front Lever / פרונט לבר מלא | `approved` | `approved` | Approved according to source manifest; multiple versions mentioned; exact prior selection unavailable. |
| [one-leg-planche.png](approved/one-leg-planche.png) | One Leg Planche / פלאנץ׳ ברגל אחת | `approved` | `approved` | Approved according to source manifest (approval after correction reported). |
| [super-advanced-tuck-planche.png](approved/super-advanced-tuck-planche.png) | Super Advanced Tuck Planche / פלאנץ׳ סופר אדוונס טאק | `approved` | `approved` | Approved according to source manifest; evidence is continuation after correction. |
| [v-sit.png](approved/v-sit.png) | V-Sit / וי־סיט | `approved` | `approved` | Approved according to source manifest; evidence is continuation to next exercise. |
| [tuck-l-sit.png](approved/tuck-l-sit.png) | Tuck L-Sit / אל־סיט טאק | `approved` | `approved` | Approved according to source manifest; grayscale body. Distinct from highlighted variant. |
| [l-sit-multi-exercise-reference.png](needs_fix/l-sit-multi-exercise-reference.png) | L-Sit / multi-exercise reference / אל־סיט | `needs_fix` | `review` | Observed: seven-exercise composite, not a standalone L-Sit. Supply a standalone L-Sit; confirm labels before reuse. |
| [straddle-planche.png](needs_review/straddle-planche.png) | Straddle Planche / פלאנץ׳ בפישוק | `needs_review` | `review` | Confirm intended side view and leg separation against prior selection; earlier side view reportedly preferred. |
| [tuck-front-lever.png](needs_fix/tuck-front-lever.png) | Tuck Front Lever / פרונט לבר טאק | `needs_fix` | `needs_fix` | Source requests a more diagonal camera angle; retain original pending replacement. |
| [super-advanced-tuck-front-lever.jpeg](needs_review/super-advanced-tuck-front-lever.jpeg) | Super Advanced Tuck Front Lever / פרונט לבר סופר אדוונס טאק | `needs_review` | `preferred` | Preferred base only; Hebrew subtitle is absent. Add subtitle and confirm pose/selection before approval. |
| [full-planche.png](needs_review/full-planche.png) | Full Planche / פלאנץ׳ מלא | `needs_review` | `review` | Confirm final selection among alternative exports mentioned in source. |
| [tuck-l-sit-highlighted-variant.png](needs_fix/tuck-l-sit-highlighted-variant.png) | Tuck L-Sit (highlighted variant; mislabeled source) / אל־סיט טאק — גרסה עם הדגשת שרירים | `needs_fix` | `review` | Observed: Tuck L-Sit pose and printed title, not Tuck Planche; lime muscles. Renamed to actual content. Supply correct Tuck Planche or approve separately as a variant after style correction. |
| [muscle-up-sequence.png](instructional_only/muscle-up-sequence.png) | Muscle Up Sequence / עליית כוח | `instructional_only` | `instructional_only` | Observed: three-frame sequence; instructional only, not an individual exercise tile. |
| [one-leg-l-sit-composite-reference.png](reference_only/one-leg-l-sit-composite-reference.png) | One-Leg L-Sit composite reference / אל־סיט ברגל אחת | `reference_only` | `reference_only` | Observed: composite of One-Leg L-Sit, V-Sit and Straddle L-Sit; reference only, not a standalone tile. |
| [advanced-tuck-planche.png](needs_review/advanced-tuck-planche.png) | Advanced Tuck Planche / פלאנץ׳ אדוונס טאק | `needs_review` | `review` | Compare pose with selected prior version; title/style differs from bilingual set. |
| [handstand.png](needs_review/handstand.png) | Handstand / עמידת ידיים | `needs_review` | `review` | Review pose and style; image has no exercise title. |
| [pull-up.png](needs_review/pull-up.png) | Pull Up / מתח | `needs_review` | `review` | Review pose, style and missing English title; source records generation, not approval. |
| [dip.png](needs_review/dip.png) | Dip / מקבילים | `needs_review` | `review` | Review pose, style and missing English title; source records generation, not approval. |
| [push-up.png](needs_review/push-up.png) | Push Up / שכיבות סמיכה | `needs_review` | `review` | Review pose, style and missing English title; source records generation, not approval. |
