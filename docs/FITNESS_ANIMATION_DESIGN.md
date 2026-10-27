# Fitness animation design

Status: product design decision; no production animation assets have been approved or created.

## Product direction: Style 4 — Premium Fitness Anatomy

Exercise media should use an athletic, semi-anatomical human figure with accurate proportions. The visual system uses grayscale and off-white surfaces, dark contours, and restrained lime-green muscle emphasis. It should feel clean and premium against the existing dark Handstand Lab interface.

Do not use stick figures, abstract bodies, neon treatments, childish illustration, excessive color, or decorative effects that obscure anatomy. Lime emphasis is illustrative and must not be presented as a validated muscle-activation or medical map.

The existing fitness artwork history in `vercel-app/assets/fitness/README.md` remains useful source and licensing documentation. Its prior screening established the preferred palette and composition, but it does not authorize restoring an asset to the product. The current clean, illustration-free UI remains the baseline until the pilot below is approved.

## Media behavior by context

- Dynamic exercises use a smooth 2–4 second loop that shows the full intended range of motion, including credible joint paths, support points, and start/end transitions.
- Static exercises use one anatomically accurate illustration or only subtle motion that does not imply repetitions or a range the exercise does not contain.
- Library cards use a static **Card Illustration**. They must never autoplay motion.
- Exercise details may use a **Detail Illustration** or an approved animation.
- Active workouts may use a **Workout Illustration** or an approved animation.
- Approved animation autoplays muted and inline by default, with a visible pause/resume control. When `prefers-reduced-motion: reduce` is active, it remains paused and presents its static poster or illustration instead.
- Mobile delivery must use lightweight, consistently framed assets. Every shipped asset needs recorded provenance, licensing, file variants, and review status.

Card, detail, and workout variants must depict the same exercise, technique, orientation, equipment, and visual identity. A convenient asset must not be reused for a different exercise variant.

## Pilot scope

The first approval set is limited to:

1. Push-up
2. Pull-up
3. Squat
4. Hollow Body Hold
5. Handstand Wall Hold
6. Dip
7. L-Sit

Dynamic pilot movements should demonstrate the complete loop. Hollow Body Hold, Handstand Wall Hold, and L-Sit may remain static when a precise still communicates the exercise better. The wall-handstand orientation must be explicit; an ambiguous chest-to-wall versus back-to-wall image fails review.

Each pilot item is reviewed independently. Approval of one exercise does not approve the other six, a visual variant, or a library-wide rollout.

## Acceptance criteria

### Anatomical and movement quality

- Human proportions, limb continuity, joint placement, hands/feet, and equipment contact are credible in every frame.
- Start, midpoint, and end positions agree with the named exercise and its intended variant.
- Dynamic movement shows a complete and plausible range, stable support points, coherent joint trajectories, and no warping, sliding, clipping, impossible balance, or frame-to-frame anatomy changes.
- Static holds show the intended support, orientation, limb position, and body line without suggesting unsupported precision.
- A qualified coach or designated product reviewer must approve technique and anatomy before the asset is marked approved. Muscle emphasis remains illustrative rather than a claim about activation.

### Visual consistency

- The pilot uses one coherent athlete treatment, anatomy detail level, charcoal/off-white/grayscale palette, restrained lime emphasis, lighting, line weight, crop, and background treatment.
- Card, detail, and workout versions remain recognizably the same approved asset family.
- The subject remains readable on the dark interface at narrow mobile sizes without excessive texture, labels baked into the image, or color-dependent meaning.
- Loops have no visible jump, pose discontinuity, camera drift, or inconsistent equipment.

### Performance

- Animation is delivered in mobile-friendly muted inline formats with a static poster/fallback; static card derivatives remain lightweight and appropriately sized for their rendered context.
- Duration, pixel dimensions, encoded byte size, format, and fallback are recorded for every pilot asset.
- Loading is lazy outside the active workout where practical, does not block exercise text or controls, and causes no material layout shift or horizontal overflow.
- The pilot must be checked at narrow mobile widths and on a representative physical or mid-range mobile device for load time, smooth playback, memory use, and repeated-loop stability.
- A maximum per-asset byte budget is set from measured pilot results before mass production. Assets that require an unreviewed quality or performance compromise are rejected.

### Accessibility

- Animation has an obvious keyboard-operable pause/resume control with an accessible name and visible focus state.
- `prefers-reduced-motion: reduce` prevents autoplay and presents a useful static frame. The experience remains complete when animation is unavailable or paused.
- Alternative text or adjacent exercise text identifies the movement and variant; decorative muscle highlighting is not the only carrier of information.
- Motion contains no flashing treatment and does not obscure instructions, set controls, rest controls, or progress state.

### Licensing and provenance

- Record the creator/source, creation method, creation date, original and derivative filenames, license or ownership basis, allowed modification/distribution scope, and required attribution.
- Do not ship an asset with unclear commercial, derivative, model, trademark, or redistribution rights.
- Third-party references may guide technique review only when their artwork is not copied. Preserve required attribution with the shipped asset.
- Generated assets need the same provenance and quality review as commissioned or licensed assets; generation does not establish anatomical accuracy or ownership clearance by itself.

## Approval and rollout gate

Professional animations have not yet been created. Previous attempts were rejected for insufficient quality: the OpenGym3D result did not meet the premium anatomical direction, and the generated wall-handstand candidate had ambiguous orientation. A connected free Runway workspace did not provide a video-capable model, so no motion sample was produced there.

Do not restore rejected or otherwise unapproved illustrations. Retained files are archive/reference material unless their exact exercise and variant pass the criteria above and receive explicit approval for integration. Do not simulate motion by crossfading or translating still images.

Do not begin mass production, broad catalogue mapping, or animation-player implementation before the seven-exercise pilot is reviewed and approved. Pilot approval must identify the exact accepted files and variants, record any rejected items, establish the mobile byte budget, and define the next bounded batch.

The animation initiative is waiting. The current product priority is completing Handstand Coach v2 Preview and real-browser validation; this document records decisions only and does not authorize implementation, deployment, or production changes.
