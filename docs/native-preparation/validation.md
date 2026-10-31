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

The workflow logs SHA256/architecture but uploads **no artifact or cache**.
The generated IPA/APK disappears with the runner. No billing/storage allowance or
Apple account provisioning is assumed. See [Windows signing path and next owner
actions](ios-windows.md) before any installable binary is promised.

## Not performed

Physical iPhone/Android, Windows Android Studio execution, emulator runtime,
WKWebView/Android WebView inference, free-account signing, IPA sideloading,
Developer Mode/device pairing and7-day refresh. In particular, custom-scheme Worker
behavior is an open compatibility gate. HTTP tests/unsigned compilation are not
substitutes. No third-party account login, paid service, merge/production or
Vercel/SSO change was made. Native launcher icons remain template placeholders.
