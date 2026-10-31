# Design review: MOVALYT mobile web

## Summary

Before: **Critical issues** in small essential text. The upload → analysis → results → skeleton player flow is
functional, but 9–12px utility/body text, weak control grouping and LTR back-button
placement undermine phone usability. Design thesis: a calm, precise training
instrument whose signature is the athlete's real video and lime pose trace.

The user supplied `apple-design` in an archive. Its SKILL.md and twelve selected
references were read locally; no reference refresh/install script was run. Applies
foundations/principles to HTML/CSS/ARIA, not native UIKit components or an iOS skin.
Same Draft PR #30. Numeric analysis and coaching are outside the design scope.

## Critical

- **Small essential text.** `app.css`: capture hints 9px, player clock 9px, speed
  10px, coach findings 12px. `accessibility.md › Vision`: “Support larger text
  sizes.” `typography.md › Supporting Dynamic Type`: “Make sure your app’s layout
  adapts to all font sizes.” Fix: rem-based 17px body, 15px supporting text, 13px
  metadata, with 200% font-size/reflow checks. This web implementation uses browser
  font settings/zoom rather than claiming native Dynamic Type integration.

## Improvements

- **High — task hierarchy.** Upload shows three overlapping selection actions;
  results give a 200px ring more space than the explanation. `layout.md › Visual
  hierarchy`: “Order content by relative importance.” Keep one native video picker,
  one camera alternative, and expandable tips; pair a compact real score with the
  measured duration and preserve the prominent skeleton-video CTA.
- **High — player controls.** Tiny timeline labels and scattered frame/options
  controls obscure the central task. `playing-video.md › Best practices`: “Always
  display video content at its original aspect ratio.” Also: custom players should
  reference the system player's behavior. Retain the shared video/pose canvas and
  clock; use a full-width seek lane, a grouped prev/play/next row, a labeled speed
  action and separate display settings. 44px minimum targets per `buttons.md ›
  Best practices`: “Make buttons easy for people to use.”
- **High — RTL navigation.** Back affordances belong to the leading/right edge;
  media timelines remain LTR by product judgment. `right-to-left.md › Interface icons`
  and `Controls` inform directional navigation. Mirror back navigation and linear analysis progress;
  preserve photos/logo/video. Retaining LTR media time/transport is a product
  judgment for the existing player, distinct from list-navigation order. Use logical CSS properties.
- **Medium — density.** `layout.md › Visual hierarchy`: “Use progressive disclosure
  to make layouts cleaner and easier to interact with.” Keep detailed metrics
  collapsed, make disclosure affordances clearer, and group strength/focus/evidence
  without repeating data or adding fictional scores.

## Compact token plan — before layout changes

User instruction preserves dark identity; light counterparts are planning values,
not a shipped theme or a new appearance switch.

| Role | Dark | Light counterpart | Dark contrast |
| --- | --- | --- | --- |
| Canvas | #050908 | #F5F7F2 | — |
| Surface | #101713 | #FFFFFF | — |
| Primary content | #F5F7F2 | #101713 | 16.87:1 on surface |
| Supporting content | #A9B5AA | #48594D | 8.56:1 on surface |
| Primary action / pose | #C4FF64 | #426B0E | dark text on lime 15.46:1 |
| Control boundary | #53695B | #617768 | 3.07:1 on surface |

Existing raised #18221B and passive border #2C3A31 stay supporting surface tokens.
Use Rubik's existing local 400/600/800 files; no new font download. Type scale:
13 / 15 / 17 / 20 / 24 / 32px as rem, tabular utility numerals. Spacing scale
4 / 8 / 12 / 16 / 24 / 32px. Controls ≥44px, primary actions ≥56px.

Compact layout: one readable column, media first, supporting details disclosed.

```text
UPLOAD                    RESULTS                 PLAYER
[RTL back | title]        [RTL back | title]       [RTL back | title | expand]
[brief instruction]       [score | duration]       [original video + pose]
[approved example photo]  [WATCH SKELETON]          [seek / timestamp / speed]
[PICK VIDEO] [camera]     [strength / focus]       [prev | PLAY | next]
[privacy] [photo tips ▾]  [evidence / 2 drills]     [display controls ▾]
[home | analyze | history][advanced metrics ▾]     [back to report]
```

Regular width: keep the same functions and centered reading width; grow content
naturally rather than introducing a desktop phone collage. Signature: measured
motion, with lime reserved for the real pose, primary actions and active state.
Motion: retain the real-progress/ring transitions, with Reduced Motion support;
no new decorative entrance choreography.

## Craft notes / plan critique

A black/lime palette alone is a template. What makes this plan specific is keeping
original body framing and measurement overlays authoritative, separating playback
from a concise training report, and giving the actual skeleton replay a reliable
primary route. Remove the duplicate gallery action and unnecessary blurred media
backdrop. Keep the approved campaign photography and geometric MOVALYT mark.

## What works

Real local progress, actual score/hold evidence, optional advanced metrics, native
file input, original-aspect-ratio canvas, explicit skeleton toggle and existing
safe-area/reduced-motion hooks. Preserve these functions and all analysis data.

## Platform notes

`tab-bars.md › Best practices`: “Use a tab bar to support navigation, not to
provide actions.” Keep three destinations and put playback actions in the player.
`color.md › Best practices`: “Avoid using the same color to mean different things.”
Text becomes neutral; lime keeps action/measurement meaning. The supplied
`cross-platform.md › Vocabulary` maps system colors to CSS properties and Dynamic
Type to zoom/font-size settings. The code-audit searches found no Apple Pay/native
checkout or native Apple glass to implement. Dark-only brand is the user's explicit
tradeoff; add stronger contrast/forced-color and reduced-transparency fallbacks.
No claim of native iOS conformance or physical-device validation.

## Implemented review — after

**Good for the reviewed mobile web flow; real-device validation pending.** The
critical small-text finding is addressed with rem typography and reflow. The
upload screen has one clear picker plus a camera alternative, tips are disclosed,
and the result pairs the actual score and measured interval above the skeleton
CTA. Report copy is 17px (was 13px); the player clock is 15px (was 9px). Playback
has a full-width seek lane, grouped frame/play controls, and unobstructed display
switches. Back navigation is RTL; the Analysis tab resumes the live session.

The photograph stays the approved existing asset, with no new image/model/font
service. A large-font test exposed a clipped photo caption; a content-sized grid
replaced the fixed/absolute copy layout. The default pose remains 12 real joints;
the renderer and engine are byte-identical to the baseline.

[Before/after overview](screenshots/apple-design/comparison.jpg) ·
[Implementation, verification and limits](apple-design-implementation.md).
Remaining: physical Safari/Android validation, native-wrapper behavior, and
assistive-technology testing with a real screen reader. No claim of a complete
native HIG/accessibility certification.
