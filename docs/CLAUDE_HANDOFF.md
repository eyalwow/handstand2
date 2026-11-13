# Opening message for Claude Code

```text
You are continuing MOVALYT in eyalwow/handstand2. Start from the cleanup handoff branch/PR, stacked on fix/movalyt-feedback-evidence (#47), which includes the approved #43 black/lime UX and reliability work #44–#47. Do not start from main or merge the divergent #48 redesign.

Read CLAUDE.md, README.md, docs/ARCHITECTURE.md, docs/CURRENT_STATUS.md, docs/ANALYSIS_ENGINE.md and docs/PROJECT_CLEANUP.md before editing. Verify the current branch, clean/dirty worktree and live remote PR heads. Explain the three product entrypoints (Lab, Coach, MOVALYT) and the separate native athlete package back to me briefly.

First priority is Handstand timing/abstention and evidence reliability, then complete backward-compatible report persistence, then new features. Begin with a frozen-engine validation plan on about 30 authorized private clips and blinded manual labels. Do not silently change detection thresholds, score formulas, models, capture gates or stored data. Do not publish private clips, landmarks, identifying filenames or per-video reports.

Use a new task branch; preserve existing edits, old storage keys, exercise IDs, tests and evidence. No main merge, Production deployment, Vercel changes, paid services, cloud-feedback activation or video retention without explicit authorization. Ask before risky deletions.

Run root Node tests and relevant syntax checks. For native graph changes build mobile/www before npm test. Read browser harness assumptions before running. Report actual before/after outcomes and blocked checks; synthetic/browser packaging tests are not real-device or accuracy certification. Propose the smallest next change after understanding the baseline.
```
