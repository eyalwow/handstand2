# MOVALYT exercise catalog — design QA

Final result: passed against the user-authorized screenshot fallback. Figma pixel identity is not claimed.

## Source and boundary

- Approved visual reference: the full-height catalog screenshot attached to the implementation request. Black background, left-aligned MOVALYT wordmark, right-aligned Hebrew heading, search/filter row, two-column RTL cards, lime active Handstand, amber experimental Front Lever, gray unavailable exercises, flat fixed navigation.
- Figma `3Nv4MBzpX3MIauKLuZBH9j`, nodes `4:187` (390px) and `9:80` (320px): both design-context requests and the screenshot request were rejected by the Starter MCP rate limit. The user explicitly authorized using the attached screenshot in this case. No plan upgrade or invented Figma dimensions/assets.
- The attachment is visible inline; no downloadable source bitmap was supplied for automated image-diff metrics. Visual comparison uses that visible reference and real browser captures below. The 320px layout adapts the same visible design; the inaccessible 320px frame was not inspected.
- Scope: catalog only, stacked on PR #40 commit `ec9af227d9e0e50148f7b1a9cfa49c2e14c11fec`.

## Evidence and comparison

Actual Chromium screenshots, CSS viewports at DPR 2 on mobile, DPR 1 on desktop:

| Viewport | Screenshot | Review |
| --- | --- | --- |
| 390 × 844 | [Catalog](docs/screenshots/figma-catalog/acceptance/catalog-390.png) | Matches the reference hierarchy, RTL six-family order, two columns, prominent Hebrew labels and status colors. |
| 320 × 844 | [Catalog](docs/screenshots/figma-catalog/acceptance/catalog-320.png) | Two columns preserved; narrower typography fits without truncated labels or horizontal scrolling. |
| 1440 × 1000 | [Catalog](docs/screenshots/figma-catalog/acceptance/catalog-1440.png) | Centered 900px library, two columns and larger contained illustrations. |

Illustrations were inspected against all nine original approved source images and their title-free crops: full anatomy and existing equipment remain visible. Native proportions are retained with `object-fit: contain`; original files are unchanged. A first screenshot pass exposed excessive heading/card spacing; reducing the header gap and standardizing 118px mobile image wells keeps the first six cards readable. Active lime was reduced to a single fine border. The rest of the existing catalog remains below those six cards; unlike the six-card reference, the existing 20 main families are not removed.

Reference limits: supplied approved Pull-up, Muscle-up and Dip artwork differs in viewpoint/equipment from the screenshot. Those sources were preserved rather than inventing replacement anatomy or equipment. Exact Figma font metrics, texture and exports could not be obtained. Self-hosted Rubik and the existing approved MOVALYT mark are retained. No screenshot is used as an application background.

## Functional and scope checks

[Acceptance results](docs/screenshots/figma-catalog/acceptance/checks.json) verify Hebrew/English search, no-result state, filtering, alphabetical sorting, family → variation → guide selection, nine decoded approved images, 20 main families, truthful engine-derived statuses, uniform first-six card dimensions, RTL, no overflow, and the final card fully clear of fixed navigation at all three widths. Other unapproved images retain the explicit existing placeholder.

Home, variations, guide, upload, history and settings at 390px are pixel-identical to PR #40 in the isolated local Chromium comparison; paired captures are in the same evidence directory. No other screen layout, engine, catalog identity or user-data schema is changed.

## Preview and existing regressions

Tested athlete Preview: https://handstand-lab-coach-lzj47t3v5-eyalwen-6443.vercel.app/vercel-app/ — **READY**, Preview environment, application commit `dc39a56e8e0554ae17e5fbd17494d289a0405ef5`, existing static HTML/CSS/ES-module app. Use `/vercel-app/`; the deployment root serves the older site. Vercel sign-in may be required. First-time users can skip the existing welcome screen and open Analysis.

Actual hosted WebKit captures: [390px](docs/screenshots/figma-catalog/preview/catalog-390.png), [320px](docs/screenshots/figma-catalog/preview/catalog-320.png), [1440px](docs/screenshots/figma-catalog/preview/catalog-1440.png). [Hosted acceptance results](docs/screenshots/figma-catalog/preview/checks.json) exercise the same catalog checks. Comparing hosted captures exposed content showing through the translucent navigation in WebKit; the catalog navigation is now opaque black and was recaptured. Only Vercel's injected preview toolbar is suppressed during hosted QA; deployment protection and browser TLS trust are unchanged. No API/database is introduced: search/filter/sort read the existing local catalog and registry; selection follows the existing local-storage flow into variations and guides.

- Existing Node suite: **140/140** pass, including original identities, artwork approvals and engine-hash guards.
- Native package: **41 modules** build with existing local MediaPipe model/WASM and unchanged CSP; **4/4** tests pass.
- [Full existing Chromium UI regression](docs/screenshots/figma-catalog/full-regression.json): **75** variation → guide → reload cases at 320/390/1440; all visible images decode, RTL, no overflow, no application page/HTTP errors or POSTs, main targets ≥44px.
- [Hosted WebKit focused regression](docs/screenshots/figma-catalog/preview/regression.json): **12** Lean / Full / Banded Full → guide → reload cases, upload errors, empty history, search/filter/sort at the same three widths; no application page/HTTP errors or POSTs.
- [GitHub Validate handstand coach](https://github.com/eyalwow/handstand2/actions/runs/42202493117): **success** on `dc39a56`.
- The separate `Vercel – handstand-coach-demo` integration still fails with the confirmed build message `The specified Root Directory "coach-app" does not exist.` The intended athlete project is READY. That pre-existing project configuration was not changed.

Linux browser emulation is not physical iPhone/Android verification. Video inference is outside this catalog-only change and was not rerun; the engine/hash guards pass and engine files are unchanged. Evidence-only follow-up commits do not change the tested application.

## Reproduce

```sh
git worktree add --detach /tmp/movalyt-catalog-base ec9af227d9e0e50148f7b1a9cfa49c2e14c11fec
node --test tests/*.test.*
python scripts/verify-figma-catalog.py
python scripts/verify-premium-analysis.py --widths 390 320 1440
npm --prefix mobile run build
npm --prefix mobile test
```

Python browser checks require Playwright, Chromium and Pillow. Native packaging accepts `MOVALYT_MODEL_FILE` pointing to the existing checksum-verified model cache. Hosted checks use `--browser webkit --url <preview>/vercel-app/ --access-file <private temporary auth URL file>`; never commit that access file. No merge, Production or paid-service activation was performed; no additional screen redesign is included.
