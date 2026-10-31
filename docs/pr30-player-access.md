# PR #30 — results-to-player access

Root cause: report consolidation in `85d0b07` removed the results-to-replay link.
The original video, replay screen, synchronized overlay and controls were still
present. Only the reverse player-to-report link remained. Previous browser QA
navigated with hash assignments, so it did not exercise the missing user action.

Restored a prominent lime **צפה בסרטון עם שלד** link directly below the score and
measured interval. It uses the existing replay route and enables the skeleton if
the user previously hid it. No scoring, MediaPipe, Worker, coaching or overlay
rendering changes. Minimal 12-joint mode remains the default.

One focused Chromium touch-viewport check at **390×844** used the existing real
moving video: native file input → actual analysis → results → **click the visible
CTA** → original video/canvas with skeleton. Verified changing playback canvas,
play/pause, half speed, next/previous frames, skeleton off/on and reopening after
hiding the skeleton. CTA is above the fold and 56px high. No horizontal overflow
or uncaught errors. Score remained 71 / 42 samples. No physical iPhone available.

[Results](screenshots/player-access/results-390.png) ·
[Player](screenshots/player-access/player-390.png) ·
[Checks](screenshots/player-access/checks.json).

Reproduce the single flow:
`python3 scripts/verify-pr30-refinement.py --player-route-only --out <output>`.
No local full-suite rerun; standard PR CI remains responsible for repository checks.
