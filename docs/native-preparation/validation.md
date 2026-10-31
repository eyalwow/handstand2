# Native preparation validation

Results will be recorded after the PR's actual public-runner builds complete.

- Local: npm install/build, cap add/sync iOS+Android and4 native-package Node checks
  pass.89 existing repository Node tests pass. The website and Coach source tree
  is unchanged from408c392.
- Browser: focused moving-video HTTP smoke under Chromium390px is in progress.
- Android native build: pending public GitHub standard Linux runner.
- iOS unsigned arm64 build/IPA packaging: pending public GitHub standard macOS runner.
- Physical iPhone/Android, free-account signing and installation: **not performed**.

No third-party login/signing tool or paid service is used. Build jobs intentionally
omit artifact retention/caches so no pooled-storage charges are introduced.
