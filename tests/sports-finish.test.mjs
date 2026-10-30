import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../vercel-app/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../vercel-app/app.css", import.meta.url), "utf8");

test("sports home has a real analysis CTA, full-photo stage and correct source attribution", () => {
 assert.match(html, /id="homeView"/);
 assert.match(html, /class="home-page"/);
 assert.match(html, /class="home-hero"/);
 assert.match(html, /class="onboard-step"/);
 assert.match(html, /class="explain-steps"/);
 assert.match(html, /class="[^"]*home-primary[^"]*"[^>]*href="#analyze"/);
 assert.match(html, /movalyt-handstand-ai\.webp/);
 assert.match(html, /נכס AI מקורי/);
 assert.match(html, /צילום הדגמה בלבד/);
 assert.match(html, /ללא קשר לנתוני\s+משתמש/);
});
test("no fake analysis in demo, no training navigation, privacy boundary stays in place", () => {
 assert.doesNotMatch(html, /id="aiConsent"/);
 assert.doesNotMatch(html, /href="\.\/training\.html"/);
 assert.match(html, /id="cloudRequest"/);
 assert.match(html, /id="revokeCloudConsent"/);
 assert.match(html, /id="cameraFile"[^>]*capture="environment"/);
 assert.match(html, /id="home-analysis-history"/);
 assert.match(html, /הווידאו נשאר במכשיר/);
});
test("photo uses full width with native ratio and breakpoints cover small phones", () => {
 assert.match(html, /app\.css/);
 assert.match(css, /object-fit:\s*cover/);
 assert.match(css, /@media\s*\(max-width:\s*350px\)/);
 assert.match(css, /max-width:\s*600px/);
 assert.match(css, /prefers-reduced-motion/);
});
