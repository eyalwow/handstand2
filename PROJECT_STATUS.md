# Handstand Lab — project status

Last updated: 2026-10-27. Work is intentionally paused at the owner's request.

## Source and release
- Repository: https://github.com/eyalwow/handstand2
- Working branch: `feat/handstand-product-experience`; PR https://github.com/eyalwow/handstand2/pull/7 targets `main`.
- This file is saved in the latest work-in-progress commit on that branch. Its parent includes commit `094547e62094105832ffe4c334a6b53548ac58bc`. Inspect branch HEAD for the exact current commit; do not infer it from the local checkout's commit hash.
- **Do not merge or publish yet**: latest mobile, library and exercise details changes are incomplete and have not received full verification. An earlier preview exists but does not contain the latest work. The production site was not replaced.
- Previous production deployment: `dpl_EA8gn95o5K5i7oXGzTjYwwb2YXhq`; it was reported as a rollback candidate. Recheck before any release.

## Implemented and verified earlier
- Handstand analysis: one overall score; measurement-based concise feedback and exercises; local MediaPipe processing, optional Gemini after explicit consent, local fallback, skeleton playback. Unreliable footage and clear leg splits are not scored. Video length limited to two minutes.
- A real standard wall handstand video produced score 88, feedback and skeleton playback. A real split-leg video returned an uncertainty message without a score; short and blank test videos and successive uploads were also tested. A MediaPipe timestamp issue across uploads was fixed and retested. Scores remain uncalibrated against a representative labeled set.
- Training plans for levels and goals, completion logging, local history and comparable analysis results. Saving and reload were checked in a browser, including mobile viewport.
- Gemini: actual server call in protected Preview with synthetic motion data returned HTTP 200 and valid feedback. `GEMINI_API_KEY` exists in Preview and Production; do not reveal it. The owner confirmed the Google project has billing disabled. Only allowlisted derived data is sent; Google free-tier privacy terms require informed consent.
- Vercel Firewall rate limit is active for POST `/api/coach`, 10 per minute per IP and region. Invalid-request testing confirmed Vercel blocking with `x-vercel-mitigated: deny`; distributed abuse is not prevented and this is not a global quota. Temporary diagnostic endpoints were blocked by a scoped firewall rule.
- Before the latest work, 20 automated tests passed; CI also passed for the earlier PR head `094547e62094105832ffe4c334a6b53548ac58bc`. The newer changes need fresh CI and browser verification.

## Work in progress — not fully verified
- Mobile-first home screen, bottom navigation, RTL, manifest and install icons. Installation on actual iOS/Android devices has not been tested. Manifest alone does not establish reliable offline or native behavior; no finished service worker is present.
- Exercise library: 110 named exercises with search and category/level filters, short guidance and equipment; 26 matched illustrations from Workout Guide/Everkinetic. Attribution and CC BY-SA 4.0 license are in `vercel-app/assets/exercises/`; inspect artwork mapping and attribution before release. The expanded exercise detail view and latest UI changes were being edited when work stopped: recheck functionality and accuracy. Most exercises do not yet have all requested detailed steps, muscles, common mistakes, progressions, prescriptions, safety notes or matching illustrations. Never fabricate these.
- The requested active workout flow (start, set completion, rest timer, next exercise, resumable session and summary) is not finished; `workout.html` is not present. Training UI may contain an unfinished link: inspect before using or release.
- Splash screen, reliable offline behavior, profile/settings, personal next-workout summary, progress charts, and broad exercise content review remain to be completed. Retain existing local user data when modifying storage.

## Architecture and next actions
- `vercel-app/index.html`: home/analyzer and local MediaPipe model; `ai-feedback.js` and `server-gemini.js`: feedback and consent; `api/coach.js`: Vercel server function; `training-core.js`, `training-ui.js`, `training.html`, `training.css`: plans and progress; `exercise-library.js`, `exercise-media.js`: exercise catalog and artwork mapping. Tests live in `tests/`.
- Resume by reading latest user requirements in the conversation and inspecting this branch and working tree. First remove or complete broken links, finish and test the workout flow, exercise detail content and PWA behavior. Check licensing, keyboard and mobile accessibility, video, real API errors, storage and reload, service worker updates, browser console and server errors.
- Run all tests including `node --test tests/*.test.*`; verify latest GitHub CI and perform real browser tests. Check preview against the exact source and environment, verify Production Gemini and rollback capability before publishing. Only merge/deploy when the owner's conditions are met. No paid services or deletion of user data are authorized.
- The GitHub connector was used because local Git credential manager push failed; remote commits may have different hashes from local commits despite matching source content.
