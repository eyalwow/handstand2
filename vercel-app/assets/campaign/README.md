# MOVALYT campaign assets

Original AI marketing photography; never a user recording or analysis result.

- `capture-handstand.webp`: one color/light edit of the approved Stage A capture
  photograph, using Front Lever as the palette reference. Neutral/cool industrial
  background, darker ambient light, natural skin; original athlete, pose and full
  body framing retained. Corrected PNG source:
  `exec-0f8cf617-21f9-4284-9797-e7a6d33467f6.png` in the session generated-images folder.
  WebP quality 89, 1024×1536. No repeated generation of alternative athletes.
- `front-lever.webp` and `planche.webp`: byte-identical copies of the approved
  Stage A originals; see [original provenance](../../design-review/README.md).
- Home retains the approved `../photography/movalyt-handstand-ai.webp` composition.
  The exact athlete photograph from the original reference sketch is unavailable.
- `onboarding-pose.json`: genuine MediaPipe 0.10.14 lite CPU IMAGE inference on
  the corrected capture WebP. Stores image/model SHA-256 and 33 normalized points.
  Used only in the explicitly labeled onboarding example, with no score. Not
  imported into actual analysis, playback, results or history.

Only Handstand has an analysis engine. Front Lever, Planche and all other catalog
movements are marked Coming Soon. Exercises without matching artwork use neutral
icons rather than photographs of a different movement. No CaliPro assets or
WhatsApp frames are bundled. No paid external service was configured.
