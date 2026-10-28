# MOVALYT Free / Pro and cloud feedback policy

Reviewed 28 October 2026 against https://ai.google.dev/gemini-api/terms (effective 23 March 2026). The Age Requirements apply to API clients directed towards OR likely to be accessed by under-18s. Paying for Gemini does not create an exception. Paid service data-use provisions are distinct from audience eligibility. The unpaid service provisions also describe model improvement/human review; do not send personal pose evidence to the free tier assuming it is private.

MOVALYT is not established as an adults-only product. Therefore the athlete app's Gemini integration is **closed**, in both client and `/api/coach`. GET returns `enabled:false`; POST returns 403 before credentials, request evidence or upstream generation are used. Existing keys, client plan markers, age assertions and remembered consent cannot unlock it. No environment variable bypass was introduced. Separate `preview/` Coach files and provider/scoring models were not changed. Legacy provider implementation remains unreachable for reference; reopening requires a reviewed code change, not adding a key.

The upload step is local. A completed report offers a separate cloud availability action, which currently explains unavailability and does not ask for meaningless consent. An existing `movalyt-ai-measurements-consent-v2` choice is never reused to send anything. Users can revoke that old consent in the report; failure to edit browser storage does not enable cloud access. Analysis/workout data are not removed.

## Future capability boundary

| Capability | Free now | Pro proposal |
|---|---|---|
| Local pose analysis, skeleton and technique score | Available | Retained |
| Local measured feedback and basic date/score history | Available | Retained |
| Cloud extended feedback | Unavailable | Requires approved provider and audience |
| Advanced comparisons and richer longitudinal reports | Not advertised as available | Product/implementation proposal |

No billing, checkout, fake Pro state or paid SDK is installed. Existing localStorage history remains user data, never an entitlement. Future server capability responses should distinguish `available`, `requires_entitlement`, `requires_consent` and `provider_policy_blocked`; only available capabilities may be actionable. Do not convert the current closed policy constant into a client-controlled flag.

Before launching Pro: choose and review a provider supporting the intended audience and regions; document data categories, retention/training use and deletion; implement authenticated server-side entitlements, signed billing webhook verification, idempotency and cancellation/expiry; authorize every paid operation server-side. A browser plan label or localStorage value grants no access. Keep local Free analysis functional if identity, entitlement or provider services fail.

For each future cloud request, show a short contextual explanation after local analysis: named provider, exact measured fields, purpose, retention/training implications, cancellation limits and an explicit send action. Granting consent alone must not send; each report needs the explicit action. Version and scope consent, permit revocation, abort active requests, ignore late responses and explain that already transmitted data cannot be recalled. Keep raw video/images local unless separately and explicitly authorized under a newly reviewed feature.

Regression coverage: remembered consent plus a completed report causes zero fetches; the explicit unavailable-cloud action causes zero fetches; revocation preserves history; direct bridge calls fail; GET/POST remain closed with a configured key, forged Pro/age/consent fields, missing or malformed evidence. Existing grounded local response tests remain in the suite. Active upstream API behavior is no longer claimed or exercised because that route is intentionally unreachable.
