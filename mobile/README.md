# MOVALYT athlete — Capacitor preparation

Native wrapper of `../vercel-app/index.html`. The website keeps its own deployment;
this directory is never Vercel's web root. No Coach API, training/workout pages,
server functions or credentials are copied into the native package.

- Capacitor **8.6.0**, Node **22+**, Android JDK21 / SDK36 (minimum API24).
- iOS minimum15; macOS + **Xcode26+** needed to compile (local or cloud).
- Development ID **app.movalyt.athlete.dev** is a placeholder, not a registered ID.
- Local origins stay `capacitor://localhost` on iOS and `https://localhost` on Android.
  Do not change the origins after testing: WebView history/preferences are origin-scoped.
- Never set `server.url` to the deployed website, relax cleartext/allowNavigation,
  enable cloud Gemini, or place Apple credentials in this repository/Actions.

```powershell
# Run from repo root (PowerShell, Node22+)
cd mobile
npm ci --ignore-scripts --no-fund --no-audit
npm run build
npm test
npm run sync:android
npm run open:android
```

`npm run build` copies the static athlete dependency graph into ignored `www/`,
plus pinned MediaPipe0.10.14 JS/WASM and the SHA-256-verified Lite model. The first
build downloads only that model from Google; later builds use `.vendor-cache`.
For a verified offline cache:

```powershell
$env:MOVALYT_MODEL_FILE = 'C:\path\pose_landmarker_lite.task'
npm run build
Remove-Item Env:MOVALYT_MODEL_FILE
```

Only three asset-URL defaults in the packaged `pose-worker.js` / `pose-main.js`
change. Source files, CPU delegate, fallback logic, gates and numeric measurements
are preserved. The MediaPipe `.mjs` file is copied byte-for-byte as `.js` to avoid
relying on custom-scheme MIME lookup. `native-build.json` records source/output
hashes. A native-only CSP restricts network access to the local origin. Its real
WKWebView behavior still needs device testing; this is preparation, not certification.

## Android on Windows

1. Install Node22+ and Android Studio2025.2.1+ from the official websites. In SDK
   Manager install Android SDK Platform36, Platform Tools and appropriate Build
   Tools; accept SDK licenses yourself. Use Studio's JDK21 (or an installed JDK21).
2. Run the commands above. Open `mobile/android` in Android Studio, let Gradle
   synchronize, then run an API24+ emulator or a USB-connected Android device.
   Keep Android System WebView/Chrome updated: API24 alone does not guarantee
   current Worker/WASM support.
3. To build without the Studio UI, from `mobile/android`:

   ```powershell
   # Adjust to your installation; do not overwrite an unrelated Java setup.
   $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   .\gradlew.bat assembleDebug --no-daemon
   & "$env:ANDROID_HOME\platform-tools\adb.exe" devices
   & "$env:ANDROID_HOME\platform-tools\adb.exe" install -r app\build\outputs\apk\debug\app-debug.apk
   ```

   Enable developer options/USB debugging and approve the phone's prompt yourself.
   A debug APK is auto-signed for testing, needs no Play account, and is not a
   store/release build. Do not create or upload a production signing key.
4. Select a short real motion clip via **בחירת סרטון**. Also test **צילום וידאו חדש**,
   cancel/deny the system picker, run analysis, cancel/retry, open **צפה בסרטון עם שלד**,
   play/pause, .5×, frame steps, skeleton/angles and Advanced Overlay. Background/
   foreground the app, rotate the input video, refresh/restart and check history.
5. In desktop Chrome use `chrome://inspect/#devices` for a debug WebView. Check
   worker startup, local WASM/model requests, errors and memory on a long clip.

Android uses the system file picker and external ACTION_VIDEO_CAPTURE camera
activity, so it requests no broad storage/camera/microphone permission. A package
visibility query permits discovering the video-capture activity on Android11+.
The camera app owns its permissions; a missing camera falls back to the picker.
Gallery URIs become File/Blob data in the WebView, not direct filesystem paths.
Verify OEM behavior on real devices. `allowBackup=false` avoids silently exporting
local summaries to Android backup.

## iOS without a Mac — current boundary

See [the investigated free path and evidence](../docs/native-preparation/ios-windows.md).
A **device arm64 build**, not an iOS Simulator build, is required for an iPhone.
Our public-repo CI compiles without signing and constructs `Payload/App.app` in an
unsigned IPA. It does not install it, supply provisioning or use Apple credentials.
A macOS build is still required even though day-to-day development is on Windows.

No cloud account was registered. The standard public GitHub runner is free compute;
artifact storage is separately quota-limited. CI deliberately retains **logs only**,
not downloadable artifacts/caches. Exporting/retaining the IPA needs the owner's
storage/quota approval; do not assume unlimited free artifact storage. A user with
a Mac can run the same xcodebuild/ditto steps in `.github/workflows/native-preparation.yml`.
The `workflow_dispatch` action becomes generally discoverable after the workflow
exists on the default branch; while this stacked PR is open its PR trigger runs it.

## Scope still open

No physical iPhone/Android or emulator runtime certification. Native camera sheets,
custom-scheme Worker startup/main-thread fallback, WKWebView WASM, HEVC/HDR/rotation,
keyboard/safe areas, Android hardware Back and memory are explicit device checks.
Only native template app icons remain placeholders; the in-app MOVALYT branding
is preserved. No app-store packaging, distribution, signing keys, paid membership,
TestFlight, native camera plugin or filesystem migration was added.
