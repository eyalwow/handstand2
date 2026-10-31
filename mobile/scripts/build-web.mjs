// Deployment adapter only: the website and analysis source are never modified.
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { get } from 'node:https';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
import { HttpsProxyAgent } from 'https-proxy-agent';

export const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const sourceRoot = resolve(mobileRoot, '../vercel-app');
export const model = Object.freeze({
  url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  sha256: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
});
const visionCDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const digest = data => createHash('sha256').update(data).digest('hex');

export function localizePoseAssets(source) {
  // Exact three defaults only. Visibility, delegate, fallback and measurements
  // stay untouched. Absolute URLs also work inside classic/dynamic workers.
  const replacements = [
    // .js avoids relying on WKURLSchemeHandler's optional .mjs MIME lookup.
    [visionCDN + '/vision_bundle.mjs', './vendor/vision/vision_bundle.js'],
    [visionCDN + '/wasm', './vendor/vision/wasm'],
    [model.url, './vendor/model/pose_landmarker_lite.task'],
  ];
  for (const [remote, local] of replacements) {
    const literal = JSON.stringify(remote);
    if (source.split(literal).length !== 2) throw new Error('Pose asset default changed: review adapter');
    source = source.replace(literal, `new URL(${JSON.stringify(local)},self.location.href).href`);
  }
  return source;
}

function downloadModel() {
  return new Promise((accept, reject) => {
    const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
    const request = get(model.url, { agent: proxy ? new HttpsProxyAgent(proxy) : undefined }, res => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`Model download HTTP ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', part => chunks.push(part));
      res.on('end', () => accept(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    request.setTimeout(60000, () => request.destroy(new Error('Model download timed out')));
    request.on('error', reject);
  });
}

async function modelBytes() {
  const cache = resolve(mobileRoot, '.vendor-cache/pose_landmarker_lite.task');
  let data;
  if (process.env.MOVALYT_MODEL_FILE) data = await readFile(process.env.MOVALYT_MODEL_FILE);
  else {
    try { data = await readFile(cache); }
    catch (error) { if (error.code !== 'ENOENT') throw error; data = await downloadModel(); }
  }
  if (digest(data) !== model.sha256) throw new Error('Model SHA-256 mismatch; refusing to package');
  await mkdir(dirname(cache), { recursive: true });
  await writeFile(cache, data);
  return data;
}

export async function buildWeb() {
  const output = resolve(mobileRoot, 'www');
  const data = await modelBytes(); // Validate before replacing an existing build.
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  const copied = new Set();
  async function copyModule(name) {
    if (copied.has(name)) return;
    if (!/^[a-z0-9-]+\.js$/.test(name) || /^(training|workout)-/.test(name)) throw new Error(`Non-athlete module: ${name}`);
    copied.add(name);
    const bytes = await readFile(resolve(sourceRoot, name));
    const source = bytes.toString();
    const built = ['pose-main.js', 'pose-worker.js'].includes(name) ? localizePoseAssets(source) : bytes;
    await writeFile(resolve(output, name), built);
    for (const match of source.matchAll(/["']\.\/([a-z0-9-]+\.js)["']/g)) await copyModule(match[1]);
  }
  let html = await readFile(resolve(sourceRoot, 'index.html'), 'utf8');
  for (const match of html.matchAll(/<script[^>]+src="\.\/([a-z0-9-]+\.js)"/g)) await copyModule(match[1]);
  // Native-only bridge/lifecycle behavior is separate from the web engine/UI.
  // Package has no reason to contact the website, Gemini or any model CDN.
  // wasm-unsafe-eval permits local WASM compilation without general JS eval.
  const csp = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; media-src 'self' blob:; connect-src 'self' blob:; object-src 'none'; base-uri 'self'";
  html = html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" /><meta http-equiv="Content-Security-Policy" content="${csp}" />`);
  html = html.replace('</head>', '<script type="module" src="./native-shell.js"></script></head>');
  await writeFile(resolve(output, 'index.html'), html);
  await cp(resolve(mobileRoot, 'native-shell.js'), resolve(output, 'native-shell.js'));
  for (const name of ['app.css', 'mobile-flow.css', 'app.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'assets']) {
    await cp(resolve(sourceRoot, name), resolve(output, name), { recursive: true });
  }
  const vision = resolve(mobileRoot, 'node_modules/@mediapipe/tasks-vision');
  const version = JSON.parse(await readFile(resolve(vision, 'package.json'), 'utf8')).version;
  if (version !== '0.10.14') throw new Error('Unexpected MediaPipe version');
  await mkdir(resolve(output, 'vendor/vision'), { recursive: true });
  await cp(resolve(vision, 'vision_bundle.mjs'), resolve(output, 'vendor/vision/vision_bundle.js'));
  await cp(resolve(vision, 'wasm'), resolve(output, 'vendor/vision/wasm'), { recursive: true });
  await mkdir(resolve(output, 'vendor/model'), { recursive: true });
  await writeFile(resolve(output, 'vendor/model/pose_landmarker_lite.task'), data);
  // Include redistributable dependency notices in the app, not just the repo.
  await cp(resolve(mobileRoot, 'THIRD_PARTY_NOTICES.md'), resolve(output, 'THIRD_PARTY_NOTICES.md'));
  await cp(resolve(mobileRoot, 'licenses'), resolve(output, 'licenses'), { recursive: true });
  const files = [];
  for (const name of [...copied].sort()) {
    files.push({ file: name, sourceSha256: digest(await readFile(resolve(sourceRoot, name))),
      packagedSha256: digest(await readFile(resolve(output, name))),
      adapter: ['pose-main.js', 'pose-worker.js'].includes(name) ? 'asset URLs only' : 'identical' });
  }
  await writeFile(resolve(output, 'native-build.json'), JSON.stringify({ app: 'athlete', mediaPipe: version, modelSha256: model.sha256, modules: files }, null, 2) + '\n');
  console.log(`Packaged ${copied.size} athlete modules and local MediaPipe assets → ${relative(mobileRoot, output)}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildWeb();
