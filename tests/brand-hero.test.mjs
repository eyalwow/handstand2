import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const html=read("../vercel-app/index.html");
const css=read("../vercel-app/brand-hero.css");
const manifest=JSON.parse(read("../vercel-app/app.webmanifest"));

test("brand hero follows the approved athlete-first direction without fabricated video results",()=>{
 assert.match(html,/brand-hero\.css/);
 assert.match(html,/movalyt-mark\.svg/);
 assert.match(html,/class="premium-hero"/);
 assert.match(html,/class="studio-photo"/);
 assert.match(html,/handstand-isabella-mendes/);
 assert.match(html,/Isabella Mendes \/ Pexels/);
 assert.match(html,/צילום הדגמה בלבד/);
 assert.match(html,/ללא קשר לנתוני משתמש/);
 assert.doesNotMatch(html,/href="\.\/training\.html"/);
});
test("analysis and saved data DOM contracts remain intact",()=>{
 for(const id of ["homeView","analyzerView","historyView","home-analysis-history","history-list",
 "file","cameraFile","status","prog","cancelAnalysis","out","replaySec","coachPanel","cloudRequest"]){
  assert.ok(html.includes('id="'+id+'"'),"missing analysis element "+id);
 }
 assert.match(html,/id="cameraFile"[^>]*capture="environment"/);
 assert.match(html,/id="file"[^>]*accept="video\/\*"/);
 assert.match(html,/href="#analyze"/);
 assert.doesNotMatch(html,/id="aiConsent"/);
});
test("responsive design and new icon variants are bundled with the athlete app",()=>{
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css,/prefers-reduced-motion/);
 for(const name of ["icon-180.png","icon-192.png","icon-512.png"]){
  assert.ok(existsSync(new URL("../vercel-app/"+name,import.meta.url)));
 }
 assert.equal(manifest.icons[0].type,"image/svg+xml");
 assert.equal(manifest.short_name,"MOVALYT");
 assert.ok(existsSync(new URL("../vercel-app/assets/brand/movalyt-mark.svg",import.meta.url)));
 assert.ok(existsSync(new URL("../vercel-app/assets/brand/movalyt-icon.svg",import.meta.url)));
});
