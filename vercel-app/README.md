# Handstand Lab: Vercel edition

Standalone deployment of the handstand analyzer and Gemini AI Coach, without requiring a key from each end user.

## Architecture

- `index.html`: video processed locally with MediaPipe; only derived measurements are used for AI.
- `ai-feedback.js`: grounded recommendations with metric-specific exercises and local fallback.
- `server-gemini.js`: calls `/api/coach`; never embeds a secret.
- `api/coach.js`: Vercel serverless function uses the Gemini key securely in the server environment.
- `vercel.json`: configures API runtime.

## One required account action to turn on Gemini

1. Visit https://aistudio.google.com/apikey, create a new **free-tier Gemini Developer API key** using an unbilled Google project.
2. In https://vercel.com, open the Vercel project `handstand-lab-coach` → Settings → Environment Variables.
3. Add **GEMINI_API_KEY** as an encrypted/sensitive environment variable, target **Production**. Do not paste the key into ChatGPT or commit it to GitHub.
4. Redeploy the project with the production environment variables. Now `GET /api/coach` should report `{"enabled":true}`, and AI runs automatically after each analyzed video.

The default model is `gemini-3.5-flash-lite` (free tier, subject to quota), configurable by a server-only `GEMINI_MODEL` environment variable with an allowlist.

## Limits and safety

- This is an early public prototype: in-memory IP throttling is **per serverless instance**, not a durable shared abuse prevention system. Before broad rollout use a persistent rate limiter and bot checks.
- Keep Google AI API billing disabled and monitor quotas. Free tier can hit 429/503, and requests may be used by Google to improve its products.
- Gemini never sees the video file, only derived body landmark metrics; all exercises are from an allowed curated catalog. The result is an estimate, not clinical or coach-grade motion capture.
- The original GitHub Pages site at /handstand2/ remains unchanged; Vercel is a separate deployment, and can later be linked to GitHub after owner authorization.
