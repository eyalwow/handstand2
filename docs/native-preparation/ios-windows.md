# iOS build and installation from Windows — evidence and limits

Research checked **2026-10-31** against the sources below, not third-party claims
about an already working MOVALYT install. No Apple login, device pairing, signing
or third-party sideloading executable was used. No external account was created.

## What can be free

| Route | What it establishes | Limits / actual status |
| --- | --- | --- |
| GitHub Actions standard macOS runner in this PUBLIC repository | Xcode compiles a real arm64 device `.app`; wrap it as unsigned IPA without Apple account | Prepared and exercised through this PR's native CI; see validation report for actual result. Compute free for public standard runners; no larger runner/private fallback. Artifact storage is separately quota-limited, so uploads/caches are off. |
| Sideloadly on Windows + free Apple Account | Vendor documents loading an IPA and signing/installing on a paired device, free7-day refresh | Plausible practical route, **MOVALYT installation unverified**. Requires local tool installation, Apple credentials/2FA and device trust; stop for owner action. No credentials in CI/chat. |
| AltStore Classic + AltServer Windows | Official Windows guide documents Apple-account login, pairing/trust, install and Developer Mode; custom IPA sideloading is documented separately | Alternative, not AltStore PAL/store distribution. AltStore uses one of the limited app slots; MOVALYT resign/install is unverified. |
| Apple Personal Team with Xcode on a borrowed Mac | Apple's directly documented free on-device path | Requires access to a Mac and account sign-in there; not available to this developer now. |
| TestFlight / App Store / Xcode Cloud | Apple distribution/cloud services | Not this free-account route; Developer Program/App Store Connect membership required. Not enabled. |
| Paid cloud builders, hosted Mac rental or unofficial macOS VM on Windows | No necessary advantage over existing public Actions for this task | Not activated or recommended as a free verified solution. |

## Signing boundary

**Unsigned IPA ≠ installable IPA.** A successful `xcodebuild` and ZIP structure
prove compilation/packaging only. iOS needs a valid signing identity, device-bound
provisioning and compatible entitlements. Do not try to install a simulator `.app`
or rename an Android APK into an IPA. Do not use `-exportArchive` expecting free
Apple development provisioning to appear in CI automatically.

Apple documents Personal Team limits: up to10 App IDs,3 registered devices,
3 apps/device, and provisioning expiry7 days after issuance. App IDs/devices also
expire after7 days. Exact sideloading success still depends on account eligibility,
Apple's current provisioning behavior, device/iOS version and the sideload tool.
Our bundle has no paid-only capabilities/app extensions to remove, but that alone
is not proof that a specific account can sign it.

## Owner's next steps — do not automate account access

1. Review this Draft PR and CI's actual unsigned-device/Android results. Confirm
   iPhone model/iOS version and Windows version. Do not send Apple credentials.
2. Approve a way to retrieve the unsigned IPA: inspect the existing GitHub artifact
   storage allowance and authorize a short-retention artifact for one build, or
   arrange a borrowed Mac to execute the checked-in build recipe. Current CI
   deletes the IPA with its ephemeral runner; logs alone cannot be installed.
3. Choose whether to trust Sideloadly (simpler single-IPA route) or AltStore Classic.
   On Windows the vendors require Apple-distributed iTunes/iCloud, not their
   Microsoft Store variants. Their current installers/requirements must be checked
   on the actual Windows machine; no installer was run here.
4. Pair over USB, unlock iPhone, trust the Windows computer. Load the unsigned IPA
   locally into the chosen tool and enter a free Apple Account/2FA only there.
   This is the first account/credential boundary and needs the owner's action.
   Tools process sensitive Apple login/provisioning data; review their trust model.
5. If prompted, trust the development profile under Settings → General → VPN &
   Device Management. Enable Developer Mode under Privacy & Security when the
   current iOS requires it; expect a restart and device confirmation.
6. Launch MOVALYT. First confirm page/Worker/model startup; then run the full
   upload → inference → results → synchronized skeleton flow with a short clip.
   Try camera cancellation/permission denial, playback speed/frame steps, portrait/
   landscape/rotated input, safe areas, backgrounding and history after restart.
   Keep camera permissions denied until deliberately testing capture.
7. Refresh/re-sign before the7-day expiry. Preserve bundle ID/origin if expecting
   summaries to survive updates. Reinstall/uninstall, origin or bundle-ID changes
   can remove/strand local data. Export/migration is not implemented.

Until step6 succeeds, **there is no verified installable MOVALYT IPA and no
verified native iPhone analysis**. A failed signing/device test must be diagnosed
rather than described as a successful free path.

## Primary sources

- [Capacitor8 environment](https://capacitorjs.com/docs/getting-started/environment-setup):
  Node22+, macOS for iOS builds, Xcode26+, Android Studio2025.2.1+.
- [Apple account overview / Personal Team](https://developer.apple.com/support/compare-memberships/):
  “Provisioning profiles … will expire7 days from issuance” and Personal Team limits.
  This official URL currently redirects to Account Help.
- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions):
  standard runners free in public repositories; artifact storage shares a limited pool.
- [GitHub hosted runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners):
  standard macOS labels and public-repository free compute. Larger runners are distinct.
- [Sideloadly official site / FAQ](https://sideloadly.io/): “works with free Apple IDs”,
  “valid for7 days”; Windows iTunes/iCloud requirements. Vendor evidence, not Apple
  endorsement or a MOVALYT installation test.
- [AltStore Classic Windows guide](https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows):
  Apple-distributed iTunes/iCloud, USB trust, Apple Account and Developer Mode steps.
