# MOVALYT premium brand hero — design decisions

Visual reference: user-approved MOVALYT concept board from 28 October 2026. Recreated as semantic HTML/CSS and an original two-tone geometric M mark, **not** copied as a screenshot, and without the concept image's garbled text.

## Photo provenance
Home hero image: Ardit Mbrati, [Man Practicing Handstand](https://www.pexels.com/photo/man-practicing-handstand-16779467/) on Pexels, free-use license reviewed 2026-10-28 at https://www.pexels.com/license/. It is loaded at runtime from the Pexels CDN `https://images.pexels.com/photos/16779467/pexels-photo-16779467.jpeg` with image resizing parameters, and styled to be dark and low-saturation. **It is not hosted in the repository and therefore requires a network connection.** If the source cannot load, the previously licensed local Isabella Mendes photo is displayed as a fallback. Neither athlete is a user, a technique authority, or an endorsement. Credits are visible in the Home disclosure.

## Design
- Large authentic handstand photo, with the athlete occupying a meaningful area of the screen.
- High-contrast editorial headline, one lime analysis CTA, short privacy notice, and three *actual product* steps, not promotional fake KPIs.
- On mobile the image is above the title, with dark overlay for readability; responsive from 320px.
- Full UI language retained in Hebrew RTL; no changes to scoring, pose sampling, model, Worker, Gemini or data storage.
- Capture screen has a unified video-file picker instead of redundant separate 'camera' and 'upload' buttons. The existing `cameraFile` node is kept hidden for compatibility with the current analysis module. The OS decides whether a video-file input can invoke the camera. Do not claim physical iOS testing without testing.
- SVG logo is original artwork based on the user's approved conceptual brand direction; icon variants need visual QA on devices.
- Style 4 exercise anatomy assets are **not** generated or approved by this change.
- Scoring reproducibility with repeated identical videos is still an open, separate blocker. This branding PR does not change numeric thresholds.

## Quality gates
Run automated tests and verify rendered desktop/mobile views at 1440, 390 and 320, including image loading and fallback. Real human-video repeated scoring and physical device camera remain unverified until executed.
