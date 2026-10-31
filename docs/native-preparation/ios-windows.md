# MOVALYT: Windows 11 → iPhone 17 (iOS 27.0.1)

Checked 2026-10-31. This route uses Sideloadly and a free Apple Account.
**A successful unsigned build is not proof of signing, installation, launch or native video analysis.**
None of those device steps has been verified with MOVALYT.

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

## Cost and download boundary

The owner reports that both Actions and Packages budgets are $0 with Usage blocked.
Do not change those settings. Only standard public-repository runners are allowed.
The PR #31 workflow attempts one IPA upload, limited to 100 MiB, retained for
**one day**, only for this PR/head branch on its first run attempt. It refuses
another upload while an unexpired artifact with the same name exists. No cache,
APK, Release publication, Apple login or signing secret is uploaded. If quota
blocks upload, stop; do not retry or enable billing.

The workflow's artifact is named `MOVALYT-ios-release-unsigned`. After a successful
run, open the run linked from PR #31, find **Artifacts**, and download that item
while signed into GitHub. Extract the outer ZIP in Windows: the file to select in
Sideloadly is **MOVALYT-unsigned.ipa**, not the outer artifact ZIP. Keep the IPA
locally for future refreshes after the one-day artifact expires. Compare its hash
with the IPA SHA-256 in the job summary, optionally in PowerShell:

```powershell
Get-FileHash .\MOVALYT-unsigned.ipa -Algorithm SHA256
```

## Packaging and evidence

The previous Debug output used an Xcode debug-launcher / App.debug.dylib layout.
That is not evidence of an actual failure in Sideloadly, but it adds an unnecessary
nested signing dependency. The workflow now builds **Release**, explicitly disables
ENABLE_DEBUG_DYLIB, and targets the physical iPhoneOS arm64 platform.

Before upload it checks the compiled Info.plist, executable, minimum OS, local
MediaPipe model/JS/WASM, all bundled Mach-O architectures and encryption flags,
and resolves bundled non-system dynamic-library dependencies. It rejects debug
dylibs, simulator platform binaries, provisioning profiles and app extensions,
checks ZIP integrity and Payload/App.app structure, limits size and logs SHA-256.
This establishes structural suitability as input to a re-signing tool; Sideloadly
still has to create the account/device-specific certificate, profile and signatures.
An App Store receipt, pre-existing Apple signature or CI provisioning profile is
not needed for this source-built, unencrypted IPA. No paid capabilities are added.

The vendor currently advertises iOS 27+ support (site version 0.71.0 when checked).
It does **not** establish a MOVALYT/iPhone 17/iOS 27.0.1 test. No special 27.0.1-only
procedure was found in the vendor FAQ/changelog. Do not lower the minimum OS,
inject tweaks, enable JIT, or jailbreak to make this app install.

## Install locally — owner performs all Apple steps

1. Download the current Windows installer only from [sideloadly.io](https://sideloadly.io/).
   Use the matching Windows architecture. Follow its Windows prerequisites:
   Apple-distributed desktop iTunes and iCloud, using the vendor's official links;
   Microsoft Store variants are not the documented standard setup. Restart if required.
   No Mac or paid Apple Developer membership is needed for this proposed route.
2. Connect the iPhone 17 with a USB data cable. Unlock it, choose **Trust This
   Computer**, and enter the phone passcode on the phone. Confirm iTunes can see it.
3. Open Sideloadly, choose the connected iPhone, and drag **MOVALYT-unsigned.ipa**
   into the IPA area. Use **Apple ID sideload** (not normal install or ad-hoc sign).
   Keep the default app settings; do not inject dylibs or add entitlements.
   Use the free local/iTunes anisette path; do not subscribe to paid remote options.
4. Enter your Apple Account and any password/2FA prompt **locally in Sideloadly**.
   Press **Start** and wait for signing and installation to finish. Never put these
   credentials in GitHub, CI, this document or chat. Do not send unredacted logs.
5. If iOS reports an untrusted developer, open **Settings → General → VPN & Device
   Management → Developer App → your Apple Account → Trust**, and confirm.
6. Enable **Settings → Privacy & Security → Developer Mode**, restart when asked,
   then confirm **Turn On** and the passcode on the phone. If the setting is absent,
   complete the initial pairing/install attempt and recheck. Do not disable device
   security or install unrelated configuration profiles.
7. Launch MOVALYT. First check that the UI loads; then select a short local video,
   run analysis and check results plus synchronized skeleton playback. Check
   cancelled picker, denied camera permission, background/resume and history after
   reopening. WKWebView model/Worker/WASM behavior remains a separate device test.

## Refresh before seven days

Free-account apps expire after seven days; the vendor documents a limit of three
active sideloaded apps. Reconnect and sideload the same IPA with the **same Apple
Account and same effective bundle ID**, preferably on day six. Do not uninstall
first: uninstalling can remove MOVALYT's local summaries. No migration/export is
implemented. Keep a note of any bundle ID Sideloadly assigns.

Optional automatic refresh needs the Sideloadly daemon running and the phone
reachable by USB, or Wi-Fi sync configured initially through iTunes. It is not
an on-phone-only renewal service. Manual USB refresh is the baseline.

## Troubleshooting

| Symptom | Next action |
| --- | --- |
| No device | Unlock phone, verify Trust and iTunes detection, try another data cable/USB port; repair the vendor's documented Apple drivers and restart. |
| Quota/storage upload failure | Stop. Keep $0 budgets and Usage blocked; no paid fallback. No downloadable IPA exists unless upload actually succeeded. |
| IPA rejected immediately | Extract the outer artifact ZIP, select the inner .ipa and compare SHA-256. Keep the original package. |
| Authentication/anisette failure | Update from the official vendor site, check local iTunes/iCloud setup and local anisette; follow the current FAQ. Do not purchase remote anisette or share credentials. |
| Three-app/App-ID limit | Review existing free-account sideloaded apps/weekly App-ID limit; avoid repeatedly changing identifiers. |
| Untrusted Developer / Developer Mode required | Follow steps 5–6 on the phone; reconnect and retry only the local install after resolving the prompt. |
| Expired app | Re-sign locally using the same account/ID and saved IPA. Avoid uninstalling. |
| Invalid signature, missing library, crash at launch | Record the exact error and redacted log. Report signing/install as failed; do not equate CI success with device success. |
| UI opens but analysis fails | Report as native runtime failure and capture a redacted error. Do not alter scoring or weaken CSP as a workaround. |

## Primary references

- [Sideloadly site](https://sideloadly.io/): Windows download and free-account install route.
- [Sideloadly FAQ](https://sideloadly.io/faq): iOS 27+, USB/Wi-Fi, Trust, Developer Mode,
  seven-day refresh and three-app limit.
- [Sideloadly changelog](https://sideloadly.io/changelog): current signing-engine fixes.
- [Apple Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device).
- [Apple membership comparison](https://developer.apple.com/support/compare-memberships/).
- [GitHub billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
  public standard compute and pooled artifact allowance.
- [Artifact action](https://github.com/actions/upload-artifact): retention and download URL.
- [AltStore Classic Windows alternative](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows):
  requires AltServer and also uses an app slot; not AltStore PAL. Not tested with MOVALYT.
