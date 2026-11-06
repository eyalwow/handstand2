"""Approved analysis flow: real browser UI, optional real CPU inference, no seeded scores/poses/history."""
import argparse
import functools
import hashlib
import json
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT.parent / 'movalyt-test-cache'
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--url')
p.add_argument('--access-file', type=Path)
p.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
p.add_argument('--base', type=Path, default=Path('/tmp/movalyt-analysis-base'))
p.add_argument('--out', type=Path, default=ROOT / 'docs/screenshots/complete-analysis/local')
p.add_argument('--inference', action='store_true')
p.add_argument('--offline-model', action='store_true', help='Native web package: abort external HTTPS, require bundled local model/WASM.')
p.add_argument('--clip', type=Path, default=CACHE / 'complete-candidate-4-2.mp4')
args = p.parse_args()
args.out.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *values):
        pass


servers = []


def serve(directory):
    # Loopback and app directory only; never expose repository metadata or other files.
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(directory)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    servers.append(server)
    return f'http://127.0.0.1:{server.server_port}/'


url = args.url or serve(ROOT / 'vercel-app')
base_url = serve(args.base / 'vercel-app') if not args.url else None
report = {'url': url, 'browser': args.browser, 'viewports': [], 'inference': [], 'catalogComparison': {}, 'noSeededAnalysisData': True}
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox']) if args.browser == 'chromium' else pw.webkit.launch()

    def wait(page, expression, timeout=60000):
        until = time.monotonic() + timeout / 1000
        while time.monotonic() < until:
            if page.evaluate('()=>(' + expression + ')'):
                return
            page.wait_for_timeout(100)
        raise AssertionError('Timed out: ' + expression)

    def navigate(page, name):
        page.evaluate('(name)=>location.hash=name', name)
        expect(page.locator('body')).to_have_attribute('data-screen', name)

    def start(width, target=url, inference=False):
        context = browser.new_context(viewport={'width': width, 'height': 844 if width < 900 else 1000}, device_scale_factor=2 if width < 900 else 1, reduced_motion='reduce', locale='he-IL', is_mobile=width < 900, has_touch=width < 900)
        if args.access_file:
            context.route('https://vercel.live/**', lambda route: route.abort())
        if args.offline_model:
            context.route('https://**', lambda route: route.abort())
        if inference and not args.offline_model:
            assert hashlib.sha256((CACHE / 'vendor/model/package/pose_landmarker_lite.task').read_bytes()).hexdigest() == '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'

            def deps(route):
                u = route.request.url
                path = CACHE / 'vendor/vision/package' / u.split('@0.10.14/', 1)[1] if '@0.10.14/' in u else CACHE / 'vendor/model/package/pose_landmarker_lite.task'
                route.fulfill(path=path, content_type='application/wasm' if path.suffix == '.wasm' else 'text/javascript' if path.suffix in ['.js', '.mjs'] else 'application/octet-stream', headers={'Access-Control-Allow-Origin': '*'})

            context.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**', deps)
            context.route('https://storage.googleapis.com/mediapipe-models/**', deps)
        page = context.new_page()
        errors, bad, posts = [], [], []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('response', lambda r: bad.append({'status': r.status, 'url': r.url.split('?')[0]}) if r.status >= 400 else None)
        page.on('request', lambda r: posts.append(r.url.split('?')[0]) if r.method == 'POST' else None)
        page.add_init_script('window.qaTimings=[];window.qaDiagnostics=[];addEventListener("movalyt:analysis-timing",e=>qaTimings.push(e.detail));addEventListener("movalyt:analysis-diagnostic",e=>qaDiagnostics.push(e.detail));')
        if args.access_file:
            page.goto(args.access_file.read_text().strip(), wait_until='domcontentloaded')
        page.goto(target, wait_until='domcontentloaded')
        page.locator('#welcomeSkip').click()
        return context, page, errors, bad, posts

    def screenshot(page, name, width, top=True):
        page.evaluate('document.fonts.ready')
        # Stable handles tolerate the real processing transition from illustration to video.
        # Eager decoding also checks below-fold approved images without moving a live timeline.
        for img in page.locator('img:visible').element_handles():
            img.evaluate('(img)=>{img.loading="eager";return img.decode()}')
        if top:
            page.evaluate('scrollTo(0,0)')
        assert page.locator('html').get_attribute('dir') == 'rtl'
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), name
        targets=page.locator('button:visible,a:visible,summary:visible,input:visible,select:visible').evaluate_all('''nodes=>nodes.map(node=>{
          const target=node.matches('input[type="checkbox"],input[type="radio"],input[type="file"]')?node.closest('label')||node:node;
          const box=target.getBoundingClientRect();return {id:node.id||node.textContent.trim().slice(0,40),width:box.width,height:box.height};
        })''')
        assert all(target['width']>=44 and target['height']>=44 for target in targets), (name,targets)
        page.screenshot(path=str(args.out / f'{name}-{width}.png'))

    for width in [390, 320, 1440]:
        context, page, errors, bad, posts = start(width)
        screenshot(page, 'home', width)
        page.locator('#aboutButton').click()
        screenshot(page, 'settings', width)
        page.keyboard.press('Escape')
        page.locator('.home-primary').click()
        screenshot(page, 'catalog-preserved', width)
        for family, choice in [('front-lever', 'front-lever-full'), ('planche', 'planche-lean')]:
            navigate(page, 'catalog')
            page.locator(f'#catalogGrid [data-exercise="{family}"]').click()
            page.locator(f'#variationGrid [data-exercise="{choice}"]').click()
            expect(page.locator(f'#variationGrid [data-exercise="{choice}"]')).to_have_attribute('aria-pressed', 'true')
            screenshot(page, family + '-family', width)
            page.locator('#assistanceOptions [data-assistance="band"]').click()
            assert page.locator('#variationGrid [data-exercise$="full-band"]').count() == 1
            page.locator('#assistanceOptions [data-assistance="none"]').click()
            page.locator(f'#variationGrid [data-exercise="{choice}"]').click()
            page.locator('#variationContinue').click()
            for checkbox in page.locator('#guideChecklist input').all():
                checkbox.check()
            assert page.locator('#guideChecklist input:checked').count() == 4
            screenshot(page, family + '-guide', width)
            if family == 'planche':
                assert page.locator('#guideAnalyze').is_disabled()
            else:
                page.locator('#guideAnalyze').click()
                screenshot(page, 'front-lever-upload', width)
                assert page.locator('#frontLeverConsent').is_visible()
        navigate(page, 'catalog')
        page.locator('#catalogGrid [data-exercise="handstand"]').click()
        screenshot(page, 'handstand-guide', width)
        page.locator('#guideAnalyze').click()
        screenshot(page, 'handstand-upload', width)
        page.locator('#file').set_input_files({'name': 'broken.mp4', 'mimeType': 'video/mp4', 'buffer': b'not a video'})
        wait(page, 'document.getElementById("uploadReviewStatus").textContent.includes("לא ניתן")')
        assert page.locator('#startReviewedAnalysis').is_disabled()
        screenshot(page, 'invalid-video', width)
        page.locator('#discardUpload').click()
        assert page.locator('#uploadReview').is_hidden()
        navigate(page, 'history')
        screenshot(page, 'history-empty', width)
        assert page.locator('#historyChart h2').inner_text() == 'הניסיון הראשון מתחיל כאן'
        page.locator('#historyListTab').click()
        assert page.locator('#historyChart').is_hidden()
        page.locator('#historyGraphTab').click()
        assert page.locator('#historyChart').is_visible()
        if base_url:
            base_context, base_page, *_ = start(width, base_url)
            navigate(base_page, 'catalog')
            base_page.evaluate('document.fonts.ready')
            for img in base_page.locator('#catalogGrid img').all():
                img.scroll_into_view_if_needed()
                img.evaluate('(img)=>img.decode()')
            base_page.evaluate('scrollTo(0,0)')
            baseline = args.out / f'catalog-base-{width}.png'
            base_page.screenshot(path=str(baseline))
            diff = ImageChops.difference(Image.open(baseline).convert('RGB'), Image.open(args.out / f'catalog-preserved-{width}.png').convert('RGB'))
            assert diff.getbbox() is None, f'Catalog changed at {width}'
            report['catalogComparison'][str(width)] = 'pixel-identical to PR #41'
            base_context.close()
        assert not errors, errors
        assert not bad, bad
        assert not posts, posts
        report['viewports'].append({'width': width, 'selectionAndBands': True, 'checklist': True, 'unavailableBlocked': True, 'uploadDecodeAndCancel': True, 'emptyHistoryTabs': True, 'rtl': True, 'noOverflow': True, 'targets44px': True, 'pageErrors': errors, 'httpErrors': bad, 'posts': posts})
        context.close()
        print(f'{args.browser} {width}px UI passed', flush=True)

    if args.inference:
        context, page, errors, bad, posts = start(390, inference=True)
        page.locator('.home-primary').click()
        page.locator('#catalogGrid [data-exercise="handstand"]').click()
        page.locator('#guideAnalyze').click()
        page.locator('#file').set_input_files(str(args.clip))
        wait(page, '!document.getElementById("startReviewedAnalysis").disabled')
        assert page.evaluate('qaTimings.length') == 0
        assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")') is None
        screenshot(page, 'real-video-review', 390)
        page.locator('#startReviewedAnalysis').click()
        wait(page, 'document.body.dataset.screen==="processing"')
        assert page.locator('.pick').is_hidden()
        screenshot(page, 'processing-start', 390)
        page.locator('#cancelAnalysis').click()
        wait(page, 'qaTimings.length===1')
        assert page.evaluate('qaTimings[0].outcome') == 'cancelled'
        assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")') is None
        page.locator('#file').set_input_files(str(args.clip))
        wait(page, '!document.getElementById("startReviewedAnalysis").disabled')
        page.locator('#startReviewedAnalysis').click()
        wait(page, '(document.body.dataset.screen==="processing"&&document.getElementById("analysisStage").dataset.frame==="actual"&&document.querySelector("[data-stage=scan]").dataset.state==="active")||qaTimings.length>1')
        if page.evaluate('document.body.dataset.screen==="processing"'):
            for width in [390, 320, 1440]:
                if page.evaluate('document.body.dataset.screen') != 'processing':
                    break
                page.set_viewport_size({'width': width, 'height': 844 if width < 900 else 1000})
                screenshot(page, 'real-processing', width)
        wait(page, 'qaTimings.length>1', 240000)
        timing = page.evaluate('qaTimings.at(-1)')
        diagnostics = page.evaluate('qaDiagnostics.at(-1)')
        assert timing['outcome'] == 'scored', timing
        assert timing['poseFrames'] > 0 and diagnostics['score'] is not None
        assert page.locator('#ringScore').inner_text() == str(round(diagnostics['score']))
        assert page.locator('#replaySec').is_hidden()
        raw = page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")')
        assert raw and len(json.loads(raw)) == 1
        assert round(json.loads(raw)[0]['score']) == round(diagnostics['score'])
        for width in [390, 320, 1440]:
            page.set_viewport_size({'width': width, 'height': 844 if width < 900 else 1000})
            screenshot(page, 'real-results', width)
            # Digits must stay on one line, even at the narrowest viewport.
            score = page.locator('#ringScore').bounding_box()
            assert score['height'] < 60
        page.locator('#advancedReport summary').click()
        assert page.locator('#scoreBreakdown').is_visible()
        page.locator('#advancedReport summary').click()
        page.locator('#watchSkeleton').click()
        expect(page.locator('body')).to_have_attribute('data-screen', 'replay')
        assert page.locator('#cv').is_visible()
        for width in [390, 320, 1440]:
            page.set_viewport_size({'width': width, 'height': 844 if width < 900 else 1000})
            screenshot(page, 'real-player', width)
        page.locator('#play').click()
        wait(page, '!document.getElementById("v").paused')
        page.wait_for_timeout(250)
        page.locator('#play').click()
        before = page.evaluate('document.getElementById("v").currentTime')
        page.locator('#next').click()
        assert page.evaluate('document.getElementById("v").currentTime') >= before
        page.locator('#prev').click()
        page.locator('#spd').click()
        page.locator('#showSkeleton').uncheck()
        page.locator('#showSkeleton').check()
        page.locator('#showAngles').check()
        assert page.locator('#jointMetrics').is_visible()
        page.locator('#showAngles').uncheck()
        page.locator('.overlay-options summary').click()
        page.locator('#advancedOverlay').check()
        page.locator('#advancedOverlay').uncheck()
        page.locator('.overlay-options summary').click()
        page.locator('#reportLink').click()
        expect(page.locator('body')).to_have_attribute('data-screen', 'results')
        navigate(page, 'history')
        for width in [390, 320, 1440]:
            page.set_viewport_size({'width': width, 'height': 844 if width < 900 else 1000})
            screenshot(page, 'real-history', width)
        page.locator('#history-list [data-history-index]').first.click()
        assert page.locator('#historyReportDialog').is_visible()
        assert 'אינם זמינים לשחזור' in page.locator('#historyReportBody').inner_text()
        screenshot(page, 'real-saved-summary', 1440)
        page.locator('#closeHistoryReport').click()
        assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")') == raw
        page.reload(wait_until='domcontentloaded')
        expect(page.locator('body')).to_have_attribute('data-screen', 'history')
        assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")') == raw
        navigate(page, 'catalog')
        page.locator('#catalogGrid [data-exercise="handstand"]').click()
        page.locator('#guideAnalyze').click()
        page.locator('#file').set_input_files(str(CACHE / 'no-pose.mp4'))
        wait(page, '!document.getElementById("startReviewedAnalysis").disabled')
        count = page.evaluate('qaTimings.length')
        page.locator('#startReviewedAnalysis').click()
        wait(page, f'qaTimings.length>{count}', 180000)
        assert page.evaluate('qaTimings.at(-1).outcome') == 'no-pose'
        assert page.locator('#holdSec').is_hidden()
        assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")') == raw
        screenshot(page, 'no-pose-error', 1440)
        report['inference'].append({'clip': args.clip.name, 'clipSha256': hashlib.sha256(args.clip.read_bytes()).hexdigest(), 'timing': timing, 'diagnostics': diagnostics, 'cancellationWithoutHistory': True, 'noPoseWithoutGradeOrHistory': True, 'playerControls': True, 'historyReloadAndReadOnlySummary': True})
        assert not errors, errors
        assert not bad, bad
        assert not posts, posts
        context.close()
        print('Real inference → results → player → history passed', flush=True)
    browser.close()
for server in servers:
    server.shutdown()
(args.out / 'checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'viewports': len(report['viewports']), 'inference': len(report['inference']), 'catalogComparison': report['catalogComparison']}), flush=True)
