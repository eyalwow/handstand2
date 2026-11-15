# MOVALYT fitness design system

The product is a Hebrew/RTL training space: observe a movement, understand the limits of the observation and return to practice. Preserve black/charcoal and lime. This implementation builds on #49 and the approved #43 lineage; the separate #48 design is excluded.

## Tokens and hierarchy

| Token | Value | Purpose |
| --- | --- | --- |
| Background | `#090c0b` | Quiet charcoal canvas |
| Panel | `#141917` | Work area / report / exercise grouping |
| Raised | `#1c2320` | Secondary interactive surface |
| Border | `#37423c` | Distinguish controls and cards without shadow effects |
| Text | `#f4f6f3` | Main copy |
| Secondary text | `#b1bdb6` | Supporting explanation |
| Lime | `#c6f76a` | Primary action, selected state and observed timing |
| Amber | `#efca80` | Experimental/uncertain observation |

Rubik Hebrew is hosted locally with swap; system fonts cover fallback/Latin. Use rem for text, generous line-height and tabular numerals for timers. Main mobile type is 16px with secondary 13–15px; text is tested at root 200%. Containers grow; text is never truncated to rescue a layout. Cards generally use 18–24px corners, controls 12–16px, spacing 8/12/16/20/24px.

## Layout and interaction rules

- RTL reading order, logical insets and natural text flow. Video transport and timestamps may be LTR.
- Home has one analysis action, then useful routes to the existing training plan and catalog. No fabricated streaks, goals or recent records.
- The illustration supports the message rather than occupying an entire screen. Guidance-only catalog entries without approved art use compact text cards instead of fake images or unfinished-art placeholders.
- Report time and technique are separate. Observed time is visually primary; the 0–100 index is explicitly experimental, in neutral ink. Keep observed endpoint uncertainty and measurement limitations visible.
- Saved scores are discrete historical observations. Existing records lack capture setup, so do not draw a continuous progress area or calculate improvement labels from them.
- Shared bottom navigation uses solid charcoal, safe-area offsets and no blur. ResizeObserver updates content clearance from actual navigation height; keyboard focus scrolls above it.
- Most touch actions are at least 48px tall; effort-time controls are 54–66px. Native checkboxes/ranges/selects keep standard interaction and keyboard semantics.
- Motion is brief feedback on interaction. Preserve reduced-motion behavior; no new animation libraries, looping decoration or compositor-heavy filters.
- Training uses the same mark, typography, panels and controls as analysis. Active workout emphasizes exercise name, set state, rest time and next action. Summary states actual completed sets/exercises rather than celebrating an uncompleted workout.
- Native package remains athlete-only. Strip explicitly marked web-only training links at build time rather than expose unavailable routes. Do not change native origins or consent.

## Source ownership

`vercel-app/fitness.css` is the shared presentation layer loaded after incumbent styles. `fitness-ui.js` handles navigation clearance/focus only; no measurement, storage or inference hooks. Keep model, formulas, thresholds, core workout/storage and coaching untouched for design work. Packaging only copies the new shared assets and omits web-only links.

See docs/FITNESS_UPGRADE.md for audit evidence, skill sources and actual test scope. A coherent interface does not validate pose accuracy or establish commercial demand.
