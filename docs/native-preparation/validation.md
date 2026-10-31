# Native preparation validation

## Local code and HTTP checks

- `npm ci`/build, `cap add` + `cap sync` for both platforms and **4 native-package
  checks pass**. They check source/packaged module equality, classic Worker parsing,
  local model paths, strict local origins and native privacy/RTL configuration.
- **89 existing repository Node tests pass**, JS/Python syntax/whitespace checks pass.
- [189 website/Coach source files verified unchanged](preserved-web.json) against
  PR30 HEAD408c392. [Packaged source hashes](packaged-source-hashes.json) distinguish
  the2 asset-default adapters from the22 identical athlete modules.
- [Actual HTTP Chromium390px results](browser/checks.json): native file-picker
  action → real Worker/MediaPipe → results → skeleton CTA → original video playback,
  frame step/toggle and history after reload. Website71 / native web package71,
  42 samples each. No uncaught errors; **zero external package requests**, with
  external HTTPS explicitly blocked. These are browser results, not native-device
  results. [Packaged player](browser/packaged-player.png).
- This test found an adapter error: `import.meta` cannot parse inside the existing
  classic Worker. The packaged defaults now resolve against `self.location.href`
  in both paths; a classic-script parser regression check guards this. No analysis
  runtime/source change. The harness also uses function predicates so testing does
  not require weakening the package's CSP with unsafe-eval.

## Cloud compilation

[Initial public-runner build](https://github.com/eyalwow/handstand2/actions/runs/41223041538)
passed all3 jobs: package/repository tests, Android Debug APK and iOS device build/
unsigned IPA packaging. It verified Mach-O arm64, bundle ID and bundled Lite model.
The initial macos15 runner selected Xcode16.4, below Capacitor8's documented26+
requirement even though compilation succeeded. The final workflow therefore uses
**macos26 and explicitly requires Xcode26+**; see the PR checks for the final run.
Do not treat the initial run alone as supported-toolchain validation.

**Final source run at780c922: all3 jobs passed**
([run41223418905](https://github.com/eyalwow/handstand2/actions/runs/41223418905)).
macOS26 selected **Xcode26.6** and produced a device Mach-O arm64 app/unsigned IPA.
The Android Debug APK also compiled successfully. Package/repository tests passed.
Ephemeral output SHA256 values from the actual logs:

- IPA: `e061b0997313a7ae57f1f4ee4c01d2fd0cc48ed74155b6d7c9a85bdfbc6efd3a`
- APK: `527c4f09e7015f5bf0f658b821dcecc0fc4e6f7ef54d147ead5784ced6cd571e`

The existing unrelated `handstand-coach-demo` Vercel deployment check remains
failed; `handstand-lab-coach` Preview passed. Neither project/settings was changed.

Those earlier Debug runs uploaded **no artifact or cache**; their output was ephemeral.
The following Release run supersedes that export limitation.

## Release download — 2026-10-31

[Download the one-day artifact](https://github.com/eyalwow/handstand2/actions/runs/41224570201/artifacts/13051066783) (GitHub login required).
Expires **2026-11-01 17:29 UTC / 19:29 Israel time**; save the inner IPA locally.
[Single build run](https://github.com/eyalwow/handstand2/actions/runs/41224570201)
at `64d553960655169b63e6ba2e8c06017866a42bf8` succeeded using Xcode 26.6.
Four package checks, Release compilation, Mach-O/dependency/asset/ZIP checks and
artifact upload passed. Android and broad repository tests were skipped.
Inspected: App, Capacitor.framework/Capacitor and Cordova.framework/Cordova.

IPA size: **13,350,123 bytes** (outer artifact ZIP: 13,350,277 bytes).
IPA SHA-256: `3cb688b26eb3b390899e4e24be053f3c6fa2d7e93b69610c43484cffdbb7a9c6`.
One upload succeeded under the owner's reported $0/Usage blocked budgets.
No rerun was requested. **Local signing, installation, launch and analysis on
iPhone 17 / iOS 27.0.1 remain unverified.**

See [Windows installation and refresh instructions](ios-windows.md).

## Not performed

Physical iPhone/Android, Windows Android Studio execution, emulator runtime,
WKWebView/Android WebView inference, free-account signing, IPA sideloading,
Developer Mode/device pairing and7-day refresh. In particular, custom-scheme Worker
behavior is an open compatibility gate. HTTP tests/unsigned compilation are not
substitutes. No third-party account login, paid service, merge/production or
Vercel/SSO change was made. Native launcher icons remain template placeholders.
