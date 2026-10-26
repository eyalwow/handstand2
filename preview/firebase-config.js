// Handstand Lab — public Firebase WEB configuration.
// This file contains only public Firebase project identifiers and a public reCAPTCHA site key.
// NEVER put a Gemini API key, service account key, or App Check secret in this file.
//
// Get firebaseConfig from Firebase Console > Project settings > Your apps > Web app.
// Get recaptchaEnterpriseSiteKey from Firebase Console > Security > App Check > Web app.
// Register eyalwow.github.io with your reCAPTCHA Enterprise / App Check provider.
// For no-cost operation: use Firebase Spark and Gemini Developer API free tier.
// Do NOT connect a billing account unless you deliberately want paid quotas.
//
// Until these fields are configured, the website uses its measurements-only coach.
export const firebaseConfig = null;
// Example valid config object once you register the web app:
// export const firebaseConfig = {
//   apiKey: "...", // Firebase WEB API key: a public app identifier, NOT the Gemini API secret.
//   authDomain: "your-project.firebaseapp.com",
//   projectId: "your-project",
//   appId: "1:...:web:...",
// };
// Note: Firebase Web API key is not a Gemini API key; do not allowlist Generative Language API.
export const recaptchaEnterpriseSiteKey = null;
