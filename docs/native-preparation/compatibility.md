# Athlete WebView compatibility review

Base PR29 is OPEN/draft at d39701c; base PR30 is OPEN/draft at408c392. Neither is
merged. This independent stacked PR branches from PR30's HEAD and targets
`feat/intelligent-handstand-analysis`, so the diff contains only mobile preparation.
Main is not the application base. All `vercel-app`, `preview`, root web code and
Coach implementation remain byte-identical to408c392.

| Area | Preparation / code evidence | Still needs real native testing |
| --- | --- | --- |
| Web entry and routes | Copies index.html's athlete JS dependency graph and current styles/assets. Hash routes are relative; no remote server.url, API or Coach page. Native lifecycle adapter pauses visible video in background. | Android hardware Back/exit and interrupted/resumed analysis; no new native App plugin interception. |
| MediaPipe | Same0.10.14 bundle, same Lite float16 model/version, pinned SHA256, SIMD and non-SIMD WASM copied locally. No scoring/visibility/delegate change. | WKWebView WASM/WebGL/CPU backend and memory limits, Android OEM WebView versions. |
| Workers | Existing relative worker URL/new URL(import.meta.url) and feature-based compatibility path retained. Only packaged asset defaults change to absolute local-origin URLs. | WKWebView custom-scheme Worker construction/import behavior. Existing fallback handles worker-canvas-unavailable, NOT arbitrary Worker SecurityErrors; do not claim native compatibility just because HTTP passes. |
| File paths | Native origins are capacitor://localhost and https://localhost. No file:// paths. MediaPipe bundle renamed .js without content changes so MIME resolution doesn't depend on .mjs. WASM uses .wasm MIME handler. | Custom-scheme module/WASM/model fetch. CSP allows self/blob and WASM compilation; denies external model/API requests. |
| Video selection | Same native HTML video/* input returns File, engine uses URL.createObjectURL, revokes previous blob and awaits decoded dimensions. No video upload. | Real iOS Photos/Files picker, security-scoped resource lifetime, Android content:// providers and cancelled/denied pickers. |
| Capture | iOS privacy strings for camera, microphone, photo selection. Android external VIDEO_CAPTURE intent visibility declared; no broad media/storage permissions. | Actual camera intent/sheet, microphone prompts, iCloud-only clips and permission denial. No native Camera plugin added. |
| Video decoding/overlay | Same videoWidth/videoHeight, original aspect ratio, fixed-sequential seeking and pose renderer. No transformations to measurements. | HEVC/HDR, variable frame rates, MOV rotation metadata, mirrored captures, device memory/thermal behavior. |
| Storage | Existing localStorage key/data format, no video/poses persisted, history limited to summaries. No new Preferences/Filesystem plugin. Android backup disabled. | WebView process death/update behavior. Web and native origins do not share storage, nor do iOS/Android. Uninstall or changed ID/origin can remove history. Migration/export not implemented. |
| Security/cloud | Local CSP, no live-reload server, mixed content/cleartext disabled. Gemini policy unchanged/closed. No secrets, signing keys or new backend. | Native scheme security errors; do not disable protections to hide failed asset requests. |
| UI | Existing RTL, viewport-fit, safe-area CSS and motion preferences copied unchanged. Dark native backgrounds, phone portrait declaration. | Dynamic Island, keyboard/system sheets, accessibility tools and physical390px layout. Template native launcher icons still placeholders. |

HTTP/browser and native build results are recorded separately in validation.md.
A successful signed install is a further milestone; neither HTTP QA nor unsigned
compilation proves it. No score, movement-analysis or Coach change is authorized
or included in this preparation.
