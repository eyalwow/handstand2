# Hero composition fix (PR25 follow-up)
Based on eb8a693. One full-width layered photo canvas replaces the separated columns. Soft horizontal and vertical masks blend photographic edges into charcoal; title and CTA overlap this scene. Mobile uses a complete vertical athlete, title over its lower shadow and three process icons directly below the action.

Reference: user attached two images on 29 October 2026. Reference2 is a visual guide only, never shipped as an asset. Comparison targets: integrated scene, athlete visibility, relaxed headline, lime CTA and three process steps. This implementation uses a different real athlete/photo, so lighting and pose are not an exact copy.

The previous Ardit Mbrati photo already cropped feet in its source. Replaced with the previously licensed complete Isabella Mendes photograph: https://www.pexels.com/photo/woman-doing-exercise-at-gym-348489/ . Pexels license permits app use/modification; existing assets/photography/README.md retained. Local image avoids external image-CDN dependency. CSS grayscale/darkening/masks only, no stretched or generated anatomy; no reference mockup used as product image.

Scope: Home markup, composition stylesheet and design contract test only. MediaPipe, scoring, Gemini, history, user data and Coach unchanged. Repeated-identical-video score discrepancy remains open and was not investigated or fixed here. Physical iPhone testing not performed; responsive browser widths are emulation only.
