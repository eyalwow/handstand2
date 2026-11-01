# MOVALYT — one-character Blender pilot

**Character, rig and two poses awaiting owner approval.** This is an actual editable 3D asset, rendered with Blender, not separate AI images. No artwork is integrated into MOVALYT and no exercise engine is changed.

Based exactly on [PR #35](https://github.com/eyalwow/handstand2/pull/35), commit `8999e967cf5633098f0fe6edb92452862aa34597`. Stage A was approved by the owner after Work's live Preview review. This separate Draft covers only the Stage B Blender pilot.

## Review the actual files

- [Editable Blender source](source/MOVALYT-Athlete-v001.blend): open in Blender 4.3.2; frame **1 = standing**, frame **40 = full L-Sit**. Select `ARM-MOVALYT-Athlete`, enter Pose Mode and rotate a bone to inspect the same weighted body. The two keys use constant interpolation; they are review poses, not a validated exercise animation.
- [Portable skinned GLB](MOVALYT-Athlete-v001.glb): one skin, 65 joints, grayscale materials and the two keyed poses. Character only; the editable Blender scene also contains parallettes, studio lights and cameras.
- Renders: [standing](renders/standing.png), [full L-Sit](renders/l-sit-full.png).
- Actual Blender interface: [standing with armature](renders/blender-ui-standing.png), [L-Sit with armature](renders/blender-ui-l-sit.png). These are unmodified X11 captures of the running Blender GUI, not composed interface mockups. [Capture record](gui-proof.json).
- [Machine-readable validation](validation.json) and [source/skill provenance](reference-manifest.json).

## Character and license

The free **Quaternius Universal Base Characters — Standard / Superhero Male** is an artist-made muscular humanoid with an existing weighted 65-bone skeleton. It provides continuous anatomical geometry rather than an arrangement of primitive shapes. Source: [official pack](https://quaternius.com/packs/universalbasecharacters.html), [official free download](https://quaternius.itch.io/universal-base-characters). The original premium Blender source pack was **not purchased or used**.

The included [input GLB](source/quaternius-superhero-male.glb) is a public repackaging of that CC0 character, retrieved at the pinned mirror commit in the manifest; the [original CC0 notice](source/QUATERNIUS-LICENSE.txt) is preserved. No code from that mirror was executed. Its source hash is pinned for reproduction.

MOVALYT changes: one-time modest pec/abdominal/quadriceps shaping, welded import seams and smoothing, matte gray skin, black fitted shorts with clipped hems and transferred weights, short sculpted black hair, simplified eyes/face, articulated finger poses, two static poses, matching parallettes and a dark studio. Body, shorts, hair, eyes and eyebrows all deform through the **same armature**. There are no image textures, image planes, per-pose mesh swaps or per-pose body edits.

This is a **first character/rig prototype**, not a claim that its anatomy, silhouette or hand contact has been professionally approved. In particular review muscular definition, face/hair, hip-fold deformation in L-Sit, shoulder position and finger/handle contact before investing in further exercises. The FK skeleton is reusable and supports fingers; an animator-facing IK/control rig and additional deformation corrections remain possible follow-up work. The current hand/cylinder geometry test permits up to 3 mm contact intersection, so it is a bounded proxy, not a grasp/physics certification.

The `.blend` is the rendering source of truth. It uses Blender's preserve-volume skin deformation; portable glTF viewers use their own skinning and may deform the hip differently. GLB structural/re-import validation does not establish matching appearance in every external renderer.

## Cloud capability and skills evaluated

Blender **4.3.2** is already installed at `/usr/bin/blender` in this Codex Cloud environment. Its bundled Python API (`bpy`) runs in background mode. EEVEE renders succeed using free Mesa software rendering; no GPU service or paid API was used. A temporary authenticated Xvfb display runs the real Blender interface for proof screenshots. Xvfb was extracted from a free Debian package into `/tmp`; nothing was installed system-wide. Cycles CPU also runs, but this build lacks OpenImageDenoise; the delivered renders use EEVEE.

Both requested skills were read and evaluated at pinned commits:

- [create-3d-model-skill](https://github.com/CheshireJCat/create-3d-model-skill), including its Codex integration and Blender modeling/material/lighting/render/export guidance. Applied its source-first, visual-review and real-artifact workflow.
- [cc-blender-skill](https://github.com/RobLe3/cc-blender-skill), including humanoid rigging guidance. A native Blender MCP connector was unavailable. The current MCP route's Blender-version requirements were not assumed to work on 4.3.2; **direct reviewed `bpy` scripts** are the tested integration. No unverified MCP installation is claimed.

The skills supply workflows, not an anatomical character generator. The reusable CC0 artist mesh plus Blender rigging is what makes consistent poses possible here. No AI image generator was used in this pilot.

## Reproduce

Run from the repository root with **Blender 4.3.2** (other versions are unverified). Blender bundles its own Python; no pip dependencies or downloaded executable Python are needed.

```sh
blender --background --factory-startup --python-exit-code 1 --python artwork/blender-pilot/scripts/build_character.py -- --stage build
blender --background --python-exit-code 1 --python artwork/blender-pilot/scripts/build_character.py -- --stage render
blender --background --python-exit-code 1 --python artwork/blender-pilot/scripts/build_character.py -- --stage export
blender --background --python-exit-code 1 --python artwork/blender-pilot/scripts/validate_character.py
```

The build stage replaces only this pilot's generated source; it refuses to operate on a non-default scene. Later stages load the saved pilot. `--stage preview` produces half-resolution previews; `all` builds, renders and exports. Render files are 1536×1200 PNGs. For Linux software EEVEE, use an X display (including Xvfb) and `LIBGL_ALWAYS_SOFTWARE=1`; cloud runs additionally used a writable `MESA_SHADER_CACHE_DIR` under `/tmp`.

To reproduce genuine interface screenshots on Linux, open the generated `.blend` in the Blender **GUI** with `--python artwork/blender-pilot/scripts/capture_blender_ui.py`. This helper requires a working X11 display and ImageMagick's `import`; it captures the display directly. It saves the file with the L-Sit pose selected. Screenshots can also be taken manually on Windows.

## Windows 11, if continuing locally

Cloud creation already works; a Windows migration is optional. Install free official [Blender](https://www.blender.org/download/) **4.3.2** from the [official archive](https://download.blender.org/release/Blender4.3/) (portable ZIP is sufficient), Git and Codex. Clone this branch and open the `.blend`; no paid add-on, external Python or AI API is required. With the portable executable path, PowerShell commands are:

```powershell
& 'C:\Tools\blender-4.3.2-windows-x64\blender.exe' --background --factory-startup --python-exit-code 1 --python artwork/blender-pilot/scripts/build_character.py -- --stage all
& 'C:\Tools\blender-4.3.2-windows-x64\blender.exe' --background --python-exit-code 1 --python artwork/blender-pilot/scripts/validate_character.py
```

Use a working Windows graphics driver for EEVEE. Newer Blender APIs/MCP versions are separate compatibility checks; direct CLI/Python needs no MCP server. The optional Linux screenshot helper is not a Windows requirement.

## Validation and next gate

The Blender check verifies one armature / 65 bones, all five character meshes bound to it, normalized body skin weights, identical rest-mesh hashes across both poses, unchanged bone lengths/scales, straight elbows and knees and horizontal L-Sit thighs, bounded handle contact, clean clothing boundary loops, a valid GLB and successful re-import of that GLB with the same rig. These checks establish file consistency, not professional visual approval. The unchanged application regressions also pass: **136/136** Node tests and **4/4** Capacitor web-package tests; no native build or device test was performed.

Approve or revise this character, the rig and both poses first. Only after that gate should the same source be posed for the other initial exercises, then assisted variations. No 158-image production, app integration, finalized animation, Production deployment or merge is part of this pilot.
