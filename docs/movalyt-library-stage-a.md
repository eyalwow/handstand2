# MOVALYT exercise library — Stage A

## Base and scope

Checked open Draft PRs #29–#34 and remote branches before implementation. This separate branch is stacked directly on #34 (`a9023c13f6a499b8cd0396cd2338d33d3a4c0051`, `fix/handstand-reliable-measurement`). All earlier Drafts remain unmerged. The existing working checkout was clean and contained only main; no existing work was overwritten.

The four user-supplied images guide the charcoal/lime palette, rounded cards, Hebrew RTL, family -> variation -> explanation hierarchy and anatomical review requirements. They are references, not licensed application assets or validated biomechanics. In particular, the distinction between the pictured advanced tuck positions and the shown band anchors must not be accepted without independent review. No reference character, artwork or branding was copied.

## Working application

- `#catalog`: **בחר תרגיל לניתוח**, search by Hebrew/English/category/equipment, central skills / complete library / supported or experimental / original training catalog filters, real availability and measurement labels.
- `#variations`: six Planche and six Front Lever progressions; an assistance switch inside each family presents their six band-assisted counterparts. Three L-Sit progressions. One column at 320px, two at 390px, three on desktop; no crowded carousel or hidden selection.
- `#guide`: selected pose definition, filming, intended criteria, actual analysis capability, separate history context and guarded Continue. Handstand and other exercises without meaningful registered variants skip the variation screen.
- Existing upload, local analysis, report, synchronized video/skeleton and history remain connected. The Analysis tab resumes available results; the home primary action opens the library.
- Choice is saved under a new versioned key, including future/band variants. Refresh restores it; an available analysis selection also restores the upload adapter. Front Lever side-view acknowledgment always resets. Corrupt/future data are preserved with a notice; quota failures permit in-memory use. Original training records, Handstand history and experimental history keep their original storage keys and formats.
- Experimental history restores the last library-selected Front Lever variation. Each variant keeps its independent `historyId`; future engines will use that identity. No fake entries are saved for unavailable engines.

## Catalog preservation

**158 total entries = 20 original analysis exercises + 27 variation entries + 111 original training exercises.** There are 131 selectable root entries and 27 variation entries. The previous 32 analysis IDs are all present unchanged, including their original history IDs. Training has name-based legacy identity; additive deterministic IDs derive from the complete name without changing original exercise objects, workout prescriptions or stored name references. Some training names describe the same movement as a central skill: these are retained intentionally for source compatibility rather than silently deduplicated.

| Family | Unassisted | With band | Engine |
| --- | --- | --- | --- |
| Planche | Tuck, Advanced Tuck, Super Advanced Tuck, One-Leg, Straddle, Full | Same six, distinct IDs within Planche | Unavailable |
| Front Lever | Same six | Same six, distinct IDs within Front Lever | Existing five unassisted variants only, experimental/no score |
| L-Sit | Tuck, One-Leg, Full | None registered | Unavailable |
| Handstand | Standard, no additional choice screen | No added mode | PR #34 unchanged |
| Other central skills + original training | Original entries | Existing assisted training names retained | Unavailable |

“Super Advanced Tuck” is an informal progression label, not a universal anatomical standard. Its criteria explicitly require review of the hip/knee configuration, and its Front Lever engine is **disabled**. Band stiffness and mechanical assistance are not estimated. No band-assisted analysis is enabled. Difficulty is general guidance, never an athlete readiness assessment.

## Media and approval list — Stage B is pending

**Zero new anatomy illustrations integrated; 158 asset slots await review.** Existing older campaign/training assets remain in their existing contexts; they are not approved as the new anatomy set. The new library and guide use neutral, explicitly labeled placeholders. The full machine-readable approval list contains each ID, name, pose, camera instructions, criteria, assistance and review requirements in [movalyt-anatomy-asset-review.json](movalyt-anatomy-asset-review.json).

Preferred authoring pipeline: one owned/licensed high-quality athlete mesh, fixed proportions, hair/shorts/materials, one rig and fixed charcoal studio lights/cameras; named pose files for every variant; render grayscale WebP/AVIF derivatives from that same scene. No muscle colors. Keep mesh/rig/source license and the exact pose approval with the asset. A generative candidate is not a substitute for reviewing limb geometry, grip, support and character consistency.

Start with seven review stills: standard Handstand; Tuck, Advanced Tuck, Super Advanced Tuck and Straddle Planche; Full Front Lever; Full L-Sit. These cover the most important visible distinctions in the new selection flow. They complement the historical seven-exercise animation pilot; nothing previously rejected is restored. Approve this first small set before producing all 158 slots. The complete inventory is a backlog, not a request to bulk generate now.

Mandatory review per relevant asset:

- Same athlete, realistic grayscale body, shorts/hair/proportions, restrained light, charcoal backdrop, no muscle colors, neon anatomy or cartoon styling.
- Planche: extended elbows, forward shoulder lean, feet clear of the floor, distinct hip/knee configuration for each tuck, visible abduction for Straddle; use an oblique illustration when needed to show the split. A side-view analysis limitation remains separately stated.
- Front Lever: natural pronated grip with fingers wrapped on the correct side, body below the bar, straight elbows, horizontal trunk/appropriate extended legs; distinguish knee/hip configurations. Confirm contact and support from the source scene.
- Bands: show a physically load-bearing overhead anchor and a continuous tensioned band supporting the pelvis at the intended contact. Review force direction, attachment clearance and all contact geometry. Never use an unexplained floating band or unsupported anchor.
- Record creator/method/date, license, source scene/rig, pose reviewer, exact filenames/dimensions/bytes and product approval. Card/detail must depict the same approved pose.

The runtime accepts only approved local `./assets/anatomy/` stills after all six fixed checklist approvals (athlete/anatomy/support/camera/grayscale/rights). An optional **2–4 second** local muted inline video needs its own approval and an already-approved still. Controls, no autoplay, lazy/no-preload behavior, a static fallback and Reduced Motion support are implemented. No animation or low-quality 3D was generated. Motion quality and physical-device performance are Stage D gates.

## Analysis truth and Stage C

The existing shared acquisition boundary remains `analysis-pipeline.js`, `pose-runtime.js` and source-frame sampling. Registry lookup gates every analyzer; unsupported items cannot fall back to Handstand. No new numerical formula, threshold or analyzer is introduced in Stage A.

- Handstand is operational using #34's reliable interval and **experimental, uncalibrated projected technique index**. Duration remains separate and contributes zero technique points. A working engine is not a coach-calibration claim.
- Five existing Front Lever variants allow only explicitly acknowledged experimental observations, no score and no automatic validation of variation/support/grip. A real positive Front Lever validation has **not** been performed here. Super Advanced Tuck and all bands remain unavailable.
- Planche, Back Lever, L-Sit, pull-ups, dips, push-ups and all other future engines remain unavailable. Measurement types describe intended output, not a result or an active analyzer.

Next analyzer work needs original positive and negative clips, reviewed phase bounds and joints, camera requirements and agreed tolerances per family/variant. Keep personal clips and raw traces outside Git; no uploads to a repository. Validate occlusion, incorrect view, supported impostor poses, weak tracking, short/gapped footage and partial repetitions before activation. Do not tune arbitrary thresholds to a desired example score.

## Validation

- 133/133 Node regressions, including six new catalog/preservation, progression/band dispatch, selection/failure, media approval and PR #34 SHA-256 source guards. Existing numeric regression cases pass.
- Local Capacitor **web bundle only**, pinned model SHA-256 verified, 37 recursively packaged athlete modules; 4/4 native-package tests pass. No iOS/Android build, sync, signing, IPA or native workflow requested.
- Live Chromium library checks at 320/390/1440 on website and packaged web assets: Hebrew RTL, search/filters, direct vs variant routes, selected keyboard focus, band switch and variant retention, filming, disabled engines, side-view consent reset, refresh, experimental history filter/empty state and corrupt selection preservation. No horizontal overflow, uncaught errors, failed requests or outbound POSTs. Screenshots in [screenshots/library](screenshots/library).
- Actual public `v_HandstandWalking_g01_c01` original checksum was verified against the existing corpus; converted to H.264 without resizing. PR #34 baseline, new website and native web package all perform real CPU Worker inference, 42 samples, **no established hold and no grade**, synchronized playback and empty-history refresh. Zero page errors or outbound POSTs; native package makes zero external asset requests. A second public clip (`g04_c01`, 480px derivative) yields a short 0.72s interval and abstains. The expected happy-grade assertion was corrected to reflect the observed abstention; no engine threshold changed. No successful freshly graded report/history write is claimed from these clips. Existing result/history regressions pass, but a suitable real graded clip still needs acceptance. Aggregate evidence: [real-inference-checks.json](screenshots/library/real-inference-checks.json).
- The browser harness initially used a string predicate incompatible with the native CSP. Replacing the test predicate with a function allowed native verification; application CSP was preserved.
- WebKit executable is absent in this environment, so WebKit was attempted but did not run. Physical WKWebView/iPhone and Android WebView, native picker/HEVC/rotation/safe areas, approved-image performance and animation acceptance remain unverified.

No merge, Production, SSO/protection change, paid service, personal media commit, IPA or Handstand Coach change.

## Remote Draft and Preview verification

Draft [PR #35](https://github.com/eyalwow/handstand2/pull/35), target `fix/handstand-reliable-measurement`. Application source `d3c7018ebf9f6a31b3cccfe78e9843cde820afb7`: [GitHub validation passed](https://github.com/eyalwow/handstand2/actions/runs/41336418925). No native workflow ran. This follow-up changes documentation only and uses `[skip ci]`.

Athlete Preview **READY**, target `null` (Preview), deployment `dpl_Cy9most3h4ZV4g17Ug5B8h1jfv6p`, project `handstand-lab-coach`, team `eyalwen-6443`:

https://handstand-lab-coach-qlz63nqtr-eyalwen-6443.vercel.app/vercel-app/#catalog

Authenticated HTTP fetch returns 200 for the page and `analysis-library-ui.js`, `analysis-catalog.js`, `analysis-media.js`; all three modules are byte-identical to the locally tested source. Live browser flows were verified locally, **not on this protected Preview**. Existing SSO is retained. The Vercel connector creates/reuses a temporary deployment-scoped share link for its authenticated HTTP fetch; no project/global protection setting was disabled.

The separately linked `handstand-coach-demo` deployment still has its pre-existing failure. It is not the athlete Preview and no Coach/configuration change was made to address it.
