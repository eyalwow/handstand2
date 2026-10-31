import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { mobileRoot, sourceRoot, localizePoseAssets } from '../scripts/build-web.mjs';
const text = path => readFile(resolve(mobileRoot, path), 'utf8');

test('native package preserves athlete engine, measurement and coaching code', async () => {
  const manifest = JSON.parse(await text('www/native-build.json'));
  assert.equal(manifest.app, 'athlete');
  assert.equal(manifest.mediaPipe, '0.10.14');
  for (const module of manifest.modules) {
    const source = await readFile(resolve(sourceRoot, module.file), 'utf8');
    assert.equal(await text('www/' + module.file), module.adapter === 'identical' ? source : localizePoseAssets(source), module.file);
  }
  for (const required of ['handstand-engine.js', 'pose-runtime.js', 'handstand-coaching.js', 'pose-overlay.js', 'video-sampling.js']) {
    assert.ok(manifest.modules.some(m => m.file === required && m.adapter === 'identical'));
  }
  const files = await readdir(resolve(mobileRoot, 'www'));
  assert.ok(!files.some(f => /^(api|training|workout|vercel|design-review)/.test(f)));
  assert.ok(!files.includes('coach.js'));
});

test('packaged worker and compatibility runtime use local module/model/WASM defaults', async () => {
  for (const file of ['pose-worker.js', 'pose-main.js']) {
    const built = await text('www/' + file);
    assert.doesNotMatch(built, /https:\/\/(cdn\.jsdelivr\.net|storage\.googleapis\.com)/);
    assert.match(built, /new URL\("\.\/vendor\/vision\/vision_bundle\.js",self\.location\.href\)\.href/);
    assert.match(built, /\.\/vendor\/vision\/wasm/);
    assert.match(built, /\.\/vendor\/model\/pose_landmarker_lite\.task/);
  }
  const wasm = resolve(mobileRoot, 'www/vendor/vision/wasm');
  assert.ok((await stat(resolve(wasm, 'vision_wasm_internal.wasm'))).size > 1000000);
  assert.ok((await stat(resolve(wasm, 'vision_wasm_nosimd_internal.wasm'))).size > 1000000);
  // Changed upstream defaults must stop the adapter rather than leave a CDN URL.
  assert.throws(() => localizePoseAssets('changed defaults'), /review adapter/);
  // Runtime intentionally creates a classic Worker, not a module Worker.
  // import.meta would parse in the compatibility module but break that Worker.
  const classicWorker = await text('www/pose-worker.js');
  assert.doesNotThrow(() => new Script(classicWorker), 'classic worker must parse');
});

test('wrapper uses local origins without live server, mixed content or broad navigation', async () => {
  const config = JSON.parse(await text('capacitor.config.json'));
  assert.equal(config.appId, 'app.movalyt.athlete.dev');
  assert.equal(config.webDir, 'www');
  assert.equal(config.server.iosScheme, 'capacitor');
  assert.equal(config.server.androidScheme, 'https');
  assert.equal(config.server.url, undefined);
  assert.equal(config.server.allowNavigation, undefined);
  assert.equal(config.server.cleartext, false);
  assert.equal(config.android.allowMixedContent, false);
  assert.match(await text('www/server-gemini.js'), /enabled:false/);
  assert.match(await text('www/index.html'), /connect-src 'self' blob:/);
});

test('native privacy configuration scopes video selection and preserves RTL/safe areas', async () => {
  const html = await text('www/index.html');
  assert.match(html, /lang="he" dir="rtl"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /id="file" type="file" accept="video\/\*"/);
  assert.match(html, /capture="environment"/);
  const android = await text('android/app/src/main/AndroidManifest.xml');
  assert.match(android, /android:supportsRtl="true"/);
  assert.match(android, /android:allowBackup="false"/);
  assert.match(android, /android:screenOrientation="portrait"/);
  assert.match(android, /android.media.action.VIDEO_CAPTURE/);
  assert.doesNotMatch(android, /READ_EXTERNAL_STORAGE|READ_MEDIA_VIDEO|MANAGE_EXTERNAL_STORAGE/);
  const ios = await text('ios/App/App/Info.plist');
  for (const key of ['NSCameraUsageDescription','NSMicrophoneUsageDescription','NSPhotoLibraryUsageDescription']) assert.ok(ios.includes(key));
});
