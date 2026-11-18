/* Local UI regression, no private clips or score injection.
 * Requires Playwright, Chromium and an axe-core script file supplied via --axe.
 * Outputs only screenshots of fresh local test profiles. See docs/FITNESS_UPGRADE.md.
 */
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = resolve(__dirname, '..');
const out = resolve(option('--out', resolve(root, '.artifacts/fitness-ui')));
const axePath = option('--axe');
const port = Number(option('--port', '8794'));
if (!axePath || !fs.existsSync(axePath)) throw Error('Supply --axe /path/to/axe.min.js');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', root], { stdio: 'ignore' });
  let browser;
  const report = { records: [], errors: [], posts: [] };
  try {
    browser = await chromium.launch({ executablePath: option('--chromium', '/usr/bin/chromium'), args: ['--no-sandbox'] });
    const base = `http://localhost:${port}/vercel-app/`;
    // Wait for the local process instead of guessing a startup delay.
    for (let attempt = 0; ; attempt++) {
      try { const response = await fetch(base); if (response.ok) break; }
      catch (error) { if (attempt >= 50) throw error; }
      if (attempt >= 50) throw Error('Local HTTP server did not become ready');
      await new Promise(done => setTimeout(done, 100));
    }
    for (const width of [320, 360, 390, 430, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', hasTouch: width < 500 });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('request', request => { if (request.method() === 'POST') report.posts.push(request.url()); });
      await page.goto(base);
      await page.locator('#welcomeSkip').click();
      for (const scale of [1, 2]) {
        for (const route of ['home', 'catalog', 'analyze', 'history', 'training', 'workout']) {
          const path = route === 'training' ? 'training.html' : route === 'workout' ? 'workout.html' : '#' + route;
          await page.goto(base + path);
          if (route === 'workout' && await page.locator('#begin').isVisible()) await page.locator('#begin').click();
          await page.evaluate(value => { document.documentElement.style.fontSize = value + '%'; }, scale * 100);
          await page.waitForTimeout(150);
          await page.addScriptTag({ path: resolve(axePath) });
          const result = await page.evaluate(async () => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            violations: (await axe.run()).violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })),
          }));
          report.records.push({ width, scale, route, ...result });
          if (width === 390 || width === 320) await page.screenshot({ path: resolve(out, `${route}-${width}-${scale}x.png`), fullPage: true });
        }
      }
      await page.goto(base + '#catalog');
      await page.evaluate(() => { document.documentElement.style.fontSize = '100%'; });
      await page.locator('#catalogOptions summary').click();
      await page.locator('#libraryFilter').selectOption('supported');
      assert.equal(await page.locator('#catalogGrid button').count(), 2);
      await page.locator('#librarySearch').fill('zzzzzz');
      assert(await page.locator('#catalogEmpty').isVisible());
      await page.locator('#librarySearch').fill('');
      await page.locator('#catalogGrid [data-exercise="front-lever"]').click();
      await page.locator('#variationGrid [data-exercise="front-lever-tuck"]').click();
      await page.locator('#variationContinue').click();
      await page.locator('#guideAnalyze').click();
      await page.locator('#frontLeverConsent').waitFor({ state: 'visible' });
      await page.goto(base + 'training.html');
      await page.locator('#library-search').fill('פלאנץ');
      await page.locator('.library-detail-button').first().click();
      assert(await page.locator('#exercise-dialog').isVisible());
      await page.keyboard.press('Escape');
      assert(!await page.locator('#exercise-dialog').isVisible());
      await page.locator('#start-workout').click();
      if (await page.locator('#begin').isVisible()) await page.locator('#begin').click();
      await page.locator('#set-list input').first().check();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).exercises[0].completed[0]);
      await page.locator('#start-rest').click();
      await page.waitForFunction(() => document.querySelector('#rest-time').textContent !== '00:00');
      await page.locator('#skip-rest').click();
      await page.reload();
      assert(await page.locator('#set-list input').first().isChecked());
      await page.locator('#finish').click();
      await page.locator('#continue-workout').click();
      assert(!await page.locator('#finish-dialog').isVisible());
      await page.locator('#finish').click();
      await page.locator('#confirm-finish').click();
      await page.locator('#summary').waitFor({ state: 'visible' });
      await page.screenshot({ path: resolve(out, `summary-${width}.png`), fullPage: true });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.posts, []);
    assert(!report.records.some(item => item.overflow), 'Horizontal overflow');
    assert(!report.records.some(item => item.violations.some(violation => ['serious', 'critical'].includes(violation.impact))), 'Serious/critical axe violation');
    console.log('PASS: 60 layout/accessibility combinations and five viewport interaction flows');
  } finally {
    fs.writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
