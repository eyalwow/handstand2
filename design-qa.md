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

The existing Node and native-package suites and full existing UI regression are recorded in the pull request. Hosted Preview evidence will be linked here after deployment verification.
