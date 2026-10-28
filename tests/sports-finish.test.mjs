import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../vercel-app/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../vercel-app/sports-finish.css", import.meta.url), "utf8");

test("sports home has a real analysis CTA, full-photo stage and correct source attribution", () => {
 assert.match(html, /id="homeView"/);
 assert.match(html, /class="analysis-workspace"/);
 assert.match(html, /class="studio-photo"/);
 assert.match(html, /class="movement-flow"/);
 assert.match(html, /class="flow-steps"/);
 assert.match(html, /class="feature-action" href="#analyze"/);
 assert.match(html, /handstand-isabella-mendes\.jpg/);
 assert.match(html, /Isabella Mendes \/ Pexels/);
 assert.match(html, /צילום הדגמה בלבד/);
 assert.match(html, /ללא קשר לנתוני משתמש/);
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
 assert.match(html, /sports-finish\.css/);
 assert.match(css, /studio-photo>img\s*\{width:100%;height:auto;min-height:0;/);
 assert.match(css, /aspect-ratio:1400\s*\/\s*2114/);
 assert.match(css, /@media\(max-width:380px\)/);
 assert.match(css, /@media\(max-width:740px\)/);
 assert.doesNotMatch(css, /\.studio-photo\s*\{[^}]*max-width:\s*235px/);
});
