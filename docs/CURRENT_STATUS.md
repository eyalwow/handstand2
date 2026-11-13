# Current status

This document describes source at #47 (`86263e1`) and the cleanup's fresh verification, not a production-readiness certificate. Historical notes remain in PROJECT_STATUS.md and older docs; dates, screenshots and past green checks there are not current results.

## Branch decision

#43 is the approved black/lime mobile experience, stacked on #42 → #41 → earlier product work. #44 → #45 → #46 → #47 are descendants with timing/endpoint, capture-question and evidence-scope work. This handoff starts at #47 to avoid losing those changes. #48 is a separate black/orange redesign based on main, not the latest version of this stack. It is preserved and excluded. No branches/PRs are deleted, merged or rebased.

## Implemented

- Athlete onboarding, home, catalog/variants, capture guidance, reviewed upload and local processing.
- Handstand observed timing, uncertain endpoints, capture-question-gated technique index, evidence-scoped local feedback and video/skeleton replay.
- Separate web training plans, exercise details and resumable workout execution.
- Limited legacy Handstand history; Front Lever observation history.
- Capacitor athlete packaging with local runtime/model assets, no runtime cloud model dependency in native package.
- Older standalone Lab and Coach demo retained with separate integration contracts.

## Experimental / unsupported claims

- Technique index is image-plane 2D and unvalidated against coach labels.
- Capture declarations do not verify angle, full framing or lack of assistance.
- Front Lever: five unassisted variants can run experimental observations without score; selected variant is not verified. Super-advanced tuck and band-assisted analyses are unavailable.
- Most catalog exercises are guidance/training-only.
- Cloud feedback in MOVALYT is intentionally disabled. Older demo API code does not imply athlete cloud readiness.
- Desktop/web packaging is not physical iOS/Android certification. Native training/workout pages are excluded.

## Known gaps

- No independently labeled representative accuracy benchmark. Historical reports of private-video runs are not reproduced by this cleanup and are not accuracy proof.
- Timing boundaries, corrections, tracking gaps and selected-attempt association need manual reference labels.
- Legacy Handstand persistence stores score/date/model, not hold duration, metrics, recommendation or quality. Timing-only results are not equivalent to saved full reports. Storage write errors are currently swallowed in the analyzer path.
- Immediate reload after a workout checkbox can race asynchronous lock-protected persistence; the paired reload check waits for confirmed storage. Interrupted-write recovery needs a focused follow-up, not a cleanup fix.
- Several historical browser harnesses assume pre-review upload flow or older catalog layouts; retain and review before reuse.
- Many layered CSS and artwork modules have historical test/evidence dependencies. Unreferenced-from-home does not establish dead code.
- Browser codec, actual camera/picker, memory, safe areas, background/resume and native runtime need real-device acceptance.
- PR stack is long and mostly unmerged; main is not the assembled MOVALYT baseline.

## Next work, in order

1. Build an annotation protocol and run the existing frozen engine on about 30 authorized Handstand clips, with two independent raters; split detection/timing/geometry/feedback errors. Do not tune thresholds from anecdotal clips.
2. After measurement semantics are established, design versioned complete-result persistence alongside old keys; unknown values remain null. No video storage without separate explicit consent.
3. Test paired baseline/candidate flows on real mobile devices, then evaluate recommendation-to-next-attempt value and demand. Do not prioritize redesign or more exercises over correctness.

## Fresh checks

See [cleanup and verification](PROJECT_CLEANUP.md) for exact before/after counts, setup failures, browser coverage and unrun checks. No APK/IPA, physical-device, provider-request or deployment claim is made by a web build.
