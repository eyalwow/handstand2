# Handstand Lab: Vercel edition

The video and pose analysis run in the browser. The optional Gemini coach sends a small
allowlisted set of derived scores and exercise identifiers to the server after the
person opts in; the server sends those fields to Google's Gemini API. Video, image
data, raw landmark arrays, identifiers and other request fields are not forwarded.
Google's free tier may use inputs and outputs to improve its products. When consent
is absent or the service fails, the local feedback stays available.

## Server configuration

Set `GEMINI_API_KEY` in Vercel as a server-only secret for Production and Preview.
Never put a real key in this repository, client code, logs or chat. Changes to
environment variables require a new deployment. The default model is
`gemini-3.5-flash-lite`; check model access, free-tier quotas and whether the
Google project has billing disabled before sending live test requests.
A successful `GET /api/coach` confirms only that a key exists, not that it works.

## Limits

- IP throttling is best-effort, held in one server instance's memory. It is not a
  globally shared limiter, bot protection, a hard usage cap or a cost guarantee.
  Use an independently verified shared limiter/firewall before a broader rollout.
- Keep Google API billing disabled and monitor quotas. Gemini requests may fail or
  be throttled; the application must always retain local fallback.
- Pose estimates are approximate and depend on the camera view. They are not
  clinical measurements or a replacement for coaching.
