# Handstand Lab — project status

Last updated: 2026-10-27. Resumed from branch head `019e8d83a3b261489b1bc961cb592b5ff3538197` to complete active workouts. No merge or production release.

## Approved fitness illustration direction — first screened rollout (2026-10-27)
- User approved the premium grayscale human / charcoal / subtle green art direction. Replaced artwork for SIX exact movements only: overhand pull-up, standard push-up, bodyweight squat, parallel-bar dip, straight-leg L-sit and hollow hold. Remaining catalogue movements retain their existing content; there is no blanket mapping or claim of complete coverage.
- Generated seven original candidates with OpenAI image generation. Withheld the wall-handstand candidate because chest-versus-back-to-wall orientation was ambiguous. Its files are not shipped and it is not mapped to the chest-to-wall exercise.
- Separate JPEG files per movement, normalized 4:3 frames at 512×384, dedicated 320×240 card derivatives. Card downsampling softens fine muscle texture rather than pretending to be a new anatomical drawing. Sixteen image files together are under 190 KB. Static holds use one frame; four dynamic movements show distinct labeled start/end frames.
- Added fitness-art.js shared renderer for card, detail and active-workout contexts, exact name/ID mappings only. Training-plan images for these same movements use the matching original card art. Added the exact straight-leg L-sit catalogue entry instead of attaching it to the existing bent-knee variant. Training prescriptions and storage behavior were not changed.
- Sources, creation method, file variants, visual pose checklist, technique-reference links and remaining QA gates: vercel-app/assets/fitness/README.md. Reference text was consulted; third-party artwork was not copied. Existing Workout Guide attribution remains unchanged for its separate assets.
- Technical screening covered support/contact points, elbow/leg position, trunk alignment, equipment and distinct motion phases. This is visual/source-based screening, NOT independent professional anatomy certification; muscle colors are illustrative emphasis, not a validated activation map. Coach review remains pending before production-wide adoption.
- Real browser checks: local cards/detail at 390px, static L-sit single image, squat workout frames at 320px without horizontal overflow. On deployed Preview, six sample cards are listed, both push-up detail frames load, the 320px detail dialog scrolls, and browser error logs are empty on tested routes.
- All 36 local regression/integration tests passed, including new exact-match/variant/aspect-ratio checks. GitHub Actions succeeded for source 19d2aed991452320d8c79112f86ebcfbd2353859.
- READY Preview source: 19d2aed991452320d8c79112f86ebcfbd2353859; deployment dpl_FWmj2qDgpgTR4iHSsKTswy1Xr2de. Sample gallery: https://handstand-lab-coach-6b4pjcu52-eyalwen-6443.vercel.app/training.html?artwork=1#library
- Next small group: correct and re-review the wall hold, then produce genuinely distinct incline/knee push-up variants; repeat reference/equipment/pose checks and phone QA per group. Do not use the standard push-up artwork as a substitute for these variants. Full-library rollout and physical-device/independent coach review remain unfinished.
- No merge or production deployment. This follow-up changes status documentation only; deployed application code remains at the source SHA above.

## Source and release
- Repository: https://github.com/eyalwow/handstand2
- Working branch: `feat/handstand-product-experience`; PR https://github.com/eyalwow/handstand2/pull/7 targets `main`.
- Inspect remote branch HEAD for the exact current commit. Local Git was reconstructed from the GitHub snapshot because the shell cannot resolve github.com; the connector commit preserves the existing branch ancestry.
- **Do not merge or publish yet**: active workouts pass local automated checks, but real browser/mobile visual verification is still required. Earlier unfinished library content and mobile/PWA work remain outside this task. Production was not replaced.
- Previous production deployment: `dpl_EA8gn95o5K5i7oXGzTjYwwb2YXhq`; it was reported as a rollback candidate. Recheck before any release.

## Implemented and verified earlier
- Handstand analysis: one overall score; measurement-based concise feedback and exercises; local MediaPipe processing, optional Gemini after explicit consent, local fallback, skeleton playback. Unreliable footage and clear leg splits are not scored. Video length limited to two minutes.
- A real standard wall handstand video produced score 88, feedback and skeleton playback. A real split-leg video returned an uncertainty message without a score; short and blank test videos and successive uploads were also tested. A MediaPipe timestamp issue across uploads was fixed and retested. Scores remain uncalibrated against a representative labeled set.
- Training plans for levels and goals, completion logging, local history and comparable analysis results. Saving and reload were checked in a browser, including mobile viewport.
- Gemini: actual server call in protected Preview with synthetic motion data returned HTTP 200 and valid feedback. `GEMINI_API_KEY` exists in Preview and Production; do not reveal it. The owner confirmed the Google project has billing disabled. Only allowlisted derived data is sent; Google free-tier privacy terms require informed consent.
- Vercel Firewall rate limit is active for POST `/api/coach`, 10 per minute per IP and region. Invalid-request testing confirmed Vercel blocking with `x-vercel-mitigated: deny`; distributed abuse is not prevented and this is not a global quota. Temporary diagnostic endpoints were blocked by a scoped firewall rule.
- Before the latest work, 20 automated tests passed; CI also passed for the earlier PR head `094547e62094105832ffe4c334a6b53548ac58bc`. The newer changes need fresh CI and browser verification.

## Completed in this continuation — active workouts
- Added `vercel-app/workout.html`, `workout-ui.js`, `workout-core.js`, `workout-media.js` and `workout.css`, retaining the existing dark/lime styles and RTL layout. Start from the existing training plan; an active session resumes instead of being replaced by another requested plan.
- Users see each exercise, prescription, guidance and illustration, mark/undo individual sets, navigate directly or previous/next, start/restart/skip rest, and finish with a confirmation and per-exercise summary. Partial workouts record only marked sets. Empty workouts cannot be logged as completed.
- Each change saves to `handstand-lab-active-workout-v1` before the screen accepts it. Current exercise, individual sets, start time and absolute rest deadline survive reload, navigation and background time. Elapsed time explicitly includes time away from the workout screen.
- Completed sessions append compatibly to the existing `handstand-lab-training-ui-v1` history, with an ID, set counts, targets and duration. Existing records, preferences, additional fields, analyses and the older training-core storage key are preserved. History saves deduplicate by ID; a failed history write retains the finished workout and exposes a retry. Failed active writes restore the last saved screen state. Corrupt data is reported and left untouched.
- Training links show resume while a session is active, exercise details link back to the saved session, and history displays completed set counts. Shared writes use Web Locks where available; stale workout screens reload instead of overwriting newer progress.
- Reused 11 matched artwork mappings with existing attribution, including the explicitly labeled low-bar option for rows. Other training movements use accessible, clearly labeled schematic pose SVGs rather than incorrectly matched artwork. These are static illustrations, not full movement demonstrations or newly verified coaching content.
- Removed broken references to absent `pwa.js` from home/training; no service worker or offline feature was added.

## Verification for this continuation
- **35 local automated tests pass**: 20 existing regression tests plus 15 focused workout tests. Coverage includes all 27 goal/level/day choices, complete/partial workouts, mark/undo, reload/return, exercise details, rest expiry/restart, duplicate finish protection, legacy data, corrupt data, quota failures/retry, stale tabs, training/history integration and illustration/resource references.
- Controller integration tests execute the actual workout/training UI modules against a small DOM/event harness with real state/storage functions. They do not replace a real browser rendering or device test.
- All module syntax checks pass, and the new workout modules were added to GitHub CI syntax checks. Local HTTP checks returned 200 with appropriate MIME types for home, training, workout, scripts, CSS and sampled illustration/license resources.
- **Still required before merge:** real browser and narrow mobile viewport checks, keyboard/focus/scroll review and visual review of schematic poses. Browser verification was attempted but unavailable: the in-app tab could not be attached, and native browser control stopped because it could not determine the current URL confidently. No successful visual/device check is claimed.
- Inspect GitHub Actions for the exact new remote commit after upload; earlier green checks do not cover this continuation.

## Real browser verification and mobile fixes — 2026-10-27
- Continued from fb0a907. Authenticated in-app browser now accesses Preview successfully; the earlier browser/auth blocker is resolved.
- Tested real browser viewports 390×844 and 320×640: home, all four bottom navigation destinations, exercise library search, exercise detail dialog/scrolling, three loaded push-up illustrations, active workout schematic and matched artwork, individual sets, running rest timer across refresh, previous/next/direct exercise selection, exercise-details return, partial finish confirmation/cancel, summary persistence across refresh, and a single saved history entry. No horizontal overflow at either tested width. No browser console errors observed on tested routes.
- Found low contrast in active-workout artwork: white SVGs appeared on a pale background. Changed only the workout image background to existing dark green #253329; visually rechecked loaded artwork at 320px on the corrected deployment.
- Changed rest output from implicit live status to role=timer with aria-live=off, keeping the separate rest-end announcement. Confirmed timer semantics in the real browser accessibility tree.
- Application fix commit: ef21aecebe71c483ac95c82bb501ae77689e680c. 15 focused workout tests passed and GitHub Actions succeeded for that commit. Existing unrelated tests were not manually rerun.
- Corrected Preview is READY: https://handstand-lab-coach-hbd1ixfv3-eyalwen-6443.vercel.app/training.html
- Deployment: dpl_DdsDDNufC3L6CtQBUiCczfz9dVxi, source ef21aecebe71c483ac95c82bb501ae77689e680c, existing project handstand-lab-coach, root vercel-app. This status-only follow-up does not change deployed application code.
- These are real desktop-browser responsive viewport checks, not physical iOS/Android device tests or a complete review of all 110 exercise entries. Broader exercise content/PWA limitations remain. Owner should now check this exact Preview on their phone before any release.
- No merge, production promotion, redesign or unrelated feature work.

## Preview verification follow-up — 2026-10-27
- Created READY Preview `dpl_Bu3GHN6kQyj1uN4nBRXELtfsZhMH` in existing project `handstand-lab-coach`, explicitly from source commit `cb847e6ce5dab934429ec88251218ca491a02339`, branch `feat/handstand-product-experience`, root `vercel-app`. No production promotion, merge or project protection changes.
- Preview: https://handstand-lab-coach-bx7a3fdo9-eyalwen-6443.vercel.app/training.html
- Workout: https://handstand-lab-coach-bx7a3fdo9-eyalwen-6443.vercel.app/workout.html
- Reran focused workout/training tests: 19 passed. Protected HTTP fetch of deployed workout.html returned 200 and the expected workout markup. No application defect was demonstrated and no application code was changed in this follow-up.
- Browser attachment now succeeds, but the deployment redirects the browser to Vercel Login. The authenticated fetch helper succeeds but does not expose its temporary share URL. Creating a deployment-scoped 23-hour share link returned 409 protection_bypass_conflict (link already exists); querying the deployment hostname through the alias API returned 404. Stopped rather than repeatedly attempting access. No credentials requested or protection disabled.
- Mobile visual/interactive checks remain unverified: navigation, illustration rendering, set controls, rest timer, scrolling, refresh persistence and finish/summary. Automated controller coverage is not a mobile browser check.
- Owner can open the Preview on their phone and sign into the Vercel account owning this project if prompted. Suggested check: start from training, mark a set, start rest, change exercise, refresh, verify retained state/deadline, open exercise details and return, then finish and verify one history entry.
- This follow-up commit changes documentation only; Preview source remains the exact application code at cb847e6.

## Work in progress — not fully verified
- Mobile-first home screen, bottom navigation, RTL, manifest and install icons. Installation on actual iOS/Android devices has not been tested. Manifest alone does not establish reliable offline or native behavior; no finished service worker is present.
- Exercise library: 110 named exercises with search and category/level filters, short guidance and equipment; 26 matched illustrations from Workout Guide/Everkinetic. Attribution and CC BY-SA 4.0 license are in `vercel-app/assets/exercises/`; inspect artwork mapping and attribution before release. The expanded exercise detail view and latest UI changes were being edited when work stopped: recheck functionality and accuracy. Most exercises do not yet have all requested detailed steps, muscles, common mistakes, progressions, prescriptions, safety notes or matching illustrations. Never fabricate these.
- The active workout flow is implemented and covered by the automated tests above; real browser/mobile verification remains pending before release.
- Splash screen, reliable offline behavior, profile/settings, personal next-workout summary, progress charts, and broad exercise content review remain to be completed. Retain existing local user data when modifying storage.

## Architecture and next actions
- `vercel-app/index.html`: home/analyzer and local MediaPipe model; `ai-feedback.js` and `server-gemini.js`: feedback and consent; `api/coach.js`: Vercel server function; `training-core.js`, `training-ui.js`, `training.html`, `training.css`: plans and progress; `exercise-library.js`, `exercise-media.js`: exercise catalog and artwork mapping. Tests live in `tests/`.
- Next for active workouts: perform pending real browser/mobile checks above and inspect CI for the exact new head. Do not redesign existing screens or start unrelated features without a new task. Broader exercise details, native/offline/PWA behavior and analyzer release checks remain separate follow-up work.
- Run all tests including `node --test tests/*.test.*`; verify latest GitHub CI and perform real browser tests. Check preview against the exact source and environment, verify Production Gemini and rollback capability before publishing. Only merge/deploy when the owner's conditions are met. No paid services or deletion of user data are authorized.
- The GitHub connector was used because local Git credential manager push failed; remote commits may have different hashes from local commits despite matching source content.
