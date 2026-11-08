"""Real browser acceptance, screenshots and rAF/Long Task observations. No seeded reports."""
import argparse
import functools
import hashlib
import json
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading
import time
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=ROOT / 'vercel-app')
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--url')
parser.add_argument('--cache', type=Path, default=ROOT.parent / 'movalyt-test-cache')
parser.add_argument('--ui-only', action='store_true')
parser.add_argument('--offline', action='store_true')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(args.source)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = args.url or f'http://127.0.0.1:{server.server_port}/'
report = {'browser': args.browser, 'url': url, 'baseline': args.baseline, 'viewports': [],
          'method': 'rAF callback cadence during Playwright wheel scrolling; not physical display FPS or iPhone certification',
          'seededAnalysisData': False}

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox']) if args.browser == 'chromium' else pw.webkit.launch()
    for width in [320, 390]:
        ctx = browser.new_context(viewport={'width': width, 'height': 844}, device_scale_factor=1,
                                  is_mobile=True, has_touch=True, locale='he-IL', timezone_id='Asia/Jerusalem')
        def dependency(route):
            u = route.request.url
            file = args.cache / 'vendor/vision/package' / u.split('@0.10.14/', 1)[1] if '@0.10.14/' in u else args.cache / 'vendor/model/package/pose_landmarker_lite.task'
            route.fulfill(path=file, content_type='application/wasm' if file.suffix == '.wasm' else 'text/javascript' if file.suffix in ['.mjs', '.js'] else 'application/octet-stream', headers={'Access-Control-Allow-Origin': '*'})
        if args.offline:
            ctx.route('https://**', lambda route: route.abort())
        else:
            ctx.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**', dependency)
            ctx.route('https://storage.googleapis.com/mediapipe-models/**', dependency)
        page = ctx.new_page()
        errors, posts = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda r: posts.append(r.url.split('?')[0]) if r.method == 'POST' else None)
        page.add_init_script('''window.qaTimings=[];window.qaDiagnostics=[];window.qaLongTasks=[];
          addEventListener('movalyt:analysis-timing',e=>qaTimings.push(e.detail));
          addEventListener('movalyt:analysis-diagnostic',e=>qaDiagnostics.push(e.detail));
          if(PerformanceObserver.supportedEntryTypes?.includes('longtask'))new PerformanceObserver(list=>{
            qaLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})));}).observe({type:'longtask'});''')
        page.goto(url, wait_until='domcontentloaded')
        item = {'width': width, 'screens': [], 'scroll': [], 'errors': errors, 'posts': posts}

        def nav(screen):
            page.evaluate('(s)=>location.hash=s', screen)
            expect(page.locator('body')).to_have_attribute('data-screen', screen)

        def wait_for(expression, timeout=180000):
            # Poll through the browser protocol without eval(), including native CSP.
            until=time.monotonic()+timeout/1000
            while time.monotonic()<until:
                if page.evaluate(expression): return
                page.wait_for_timeout(50)
            raise AssertionError('Timed out: '+expression)

        def ready():
            page.evaluate('document.fonts.ready')
            for img in page.locator('img:visible').element_handles():
                img.evaluate('(i)=>{i.loading="eager";return i.decode().catch(()=>{})}')
            page.wait_for_timeout(220)

        def capture(name, top=True):
            ready()
            if top:
                page.evaluate('scrollTo(0,0)');page.wait_for_timeout(100);page.evaluate('scrollTo(0,0)')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (name, page.evaluate('Array.from(document.querySelectorAll("body *")).map(e=>({tag:e.tagName,id:e.id,cls:e.className?.baseVal??e.className,x:e.getBoundingClientRect().x,r:e.getBoundingClientRect().right,w:e.getBoundingClientRect().width})).filter(e=>e.w>0&&(e.x< -1||e.r>innerWidth+1)).slice(0,20)'))
            assert page.locator('html').get_attribute('dir') == 'rtl'
            page.screenshot(path=str(args.out / f'{name}-{width}.png'))
            item['screens'].append(name)

        def scrolling(name):
            ready(); page.evaluate('scrollTo(0,0)')
            page.evaluate('''()=>{window.qaScroll={frames:[],start:performance.now(),stop:false};
              const sample=t=>{qaScroll.frames.push(t);if(!qaScroll.stop)requestAnimationFrame(sample)};requestAnimationFrame(sample)}''')
            for direction in [1, -1]:
                for _ in range(6):
                    if args.browser=='webkit': page.evaluate('(d)=>scrollBy(0,d)',direction*180)
                    else: page.mouse.wheel(0, direction * 180)
                    page.wait_for_timeout(100)
            result = page.evaluate('''()=>{qaScroll.stop=true;const f=qaScroll.frames,d=f.slice(1).map((t,i)=>t-f[i]).sort((a,b)=>a-b);
              const tasks=qaLongTasks.filter(t=>t.start>=qaScroll.start);return {samples:d.length,
              callbackFps:d.length>0?1000*d.length/(f.at(-1)-f[0]):null,
              medianFrameMs:d[Math.floor(d.length*.5)]??null,p95FrameMs:d[Math.floor(d.length*.95)]??null,
              longTasksSupported:PerformanceObserver.supportedEntryTypes?.includes('longtask'),longTasks:tasks,
              overflow:document.documentElement.scrollWidth>innerWidth}}''')
            result['screen'] = name;item['scroll'].append(result)
            result['input']='programmatic scrollBy (mobile WebKit wheel unavailable)' if args.browser=='webkit' else 'Playwright wheel'
            assert not result['overflow'];page.evaluate('scrollTo(0,0)')

        capture('welcome');page.locator('#welcomeSkip').click()
        capture('home');scrolling('home')
        page.locator('#aboutButton').click();capture('settings');page.keyboard.press('Escape')
        page.locator('.home-primary').click();capture('catalog');scrolling('catalog')
        page.locator('#librarySearch').fill('zzzz');capture('search-empty');page.locator('#librarySearch').fill('')
        page.locator('#catalogGrid [data-exercise="front-lever"]').click()
        page.locator('#variationGrid [data-exercise="front-lever-tuck"]').click();capture('variations');scrolling('variations')
        if not args.baseline: assert 'tuck-front-lever' in page.locator('#familyHero img').get_attribute('src')
        page.locator('#assistanceOptions [data-assistance="band"]').click();capture('assistance')
        page.locator('#assistanceOptions [data-assistance="none"]').click()
        page.locator('#variationContinue').click();capture('experimental-guide')
        page.locator('#guideAnalyze').click();capture('experimental-upload')
        nav('catalog');page.locator('#catalogGrid [data-exercise="planche"]').click();page.locator('#variationContinue').click();capture('unavailable');assert page.locator('#guideAnalyze').is_disabled()
        nav('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();capture('guide')
        for cb in page.locator('#guideChecklist input').all(): cb.check()
        page.locator('#guideAnalyze').click();capture('upload')
        page.locator('#file').set_input_files({'name':'broken.mp4','mimeType':'video/mp4','buffer':b'not a video'})
        expect(page.locator('#uploadReviewStatus')).to_contain_text('לא ניתן');capture('error')
        assert page.locator('#startReviewedAnalysis').is_disabled()
        if not args.baseline: expect(page.locator('#replaceUpload')).to_be_visible()
        page.locator('#discardUpload').click();nav('history');capture('history-empty')
        if not args.ui_only:
            clip=args.cache/'complete-candidate-4-2.mp4'
            assert hashlib.sha256(clip.read_bytes()).hexdigest() == '761591879097e96d3cbc52384d81f214a4ab8c3b1d08e173821e26d6d030acc4'
            nav('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();page.locator('#guideAnalyze').click()
            page.locator('#file').set_input_files(str(clip));expect(page.locator('#startReviewedAnalysis')).to_be_enabled()
            page.locator('#uploadPreview').evaluate('(v)=>v.play()');page.wait_for_timeout(150);page.locator('#uploadPreview').evaluate('(v)=>v.pause()');capture('video-review')
            page.locator('#startReviewedAnalysis').click();expect(page.locator('body')).to_have_attribute('data-screen','processing')
            page.locator('#cancelAnalysis').click();wait_for('qaTimings.length>0',timeout=60000)
            assert page.evaluate('qaTimings.at(-1).outcome')=='cancelled'
            assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")') is None
            capture('cancelled');page.evaluate('qaTimings=[]')
            page.locator('#file').set_input_files(str(clip));expect(page.locator('#startReviewedAnalysis')).to_be_enabled()
            page.locator('#startReviewedAnalysis').click();expect(page.locator('body')).to_have_attribute('data-screen','processing');capture('processing')
            wait_for('qaTimings.length>0',timeout=180000)
            outcome=page.evaluate('qaTimings.at(-1).outcome');item['outcome']=outcome
            if args.browser=='webkit' and outcome!='scored':
                capture('webkit-inference-limit');item['inferenceLimit']=page.locator('#status').inner_text() or page.locator('#uploadReviewStatus').inner_text()
            else:
                assert outcome=='scored',page.evaluate('qaTimings.at(-1)')
                capture('results');scrolling('results')
                if not args.baseline:
                    page.evaluate('document.documentElement.style.fontSize="200%"');capture('results-text-200')
                    page.evaluate('document.documentElement.style.fontSize=""')
                item['score']=page.locator('#ringScore').inner_text();item['timing']=page.evaluate('qaTimings.at(-1)')
                assert item['score']=='58'
                page.locator('#watchSkeleton').click();capture('player');scrolling('player')
                if not args.baseline:
                    page.evaluate('document.documentElement.style.fontSize="200%"');capture('player-text-200')
                    page.evaluate('document.documentElement.style.fontSize=""')
                page.locator('#play').click();scrolling('player-playing');page.locator('#play').click()
                page.locator('#next').click();page.locator('#prev').click();page.locator('#spd').click()
                page.locator('#showAngles').check();capture('player-angles')
                def media_size():
                    return page.locator('#cv').evaluate('''c=>{const b=c.getBoundingClientRect(),r=c.width/c.height;
                      return {width:Math.min(b.width,b.height*r),height:Math.min(b.height,b.width/r)}}''')
                normal=media_size();page.locator('#expandPlayer').click();capture('player-expanded');expanded=media_size()
                item['playerSize']={'normal':normal,'expanded':expanded}
                if not args.baseline: assert expanded['width']>=normal['width'],item['playerSize']
                page.keyboard.press('Escape');expect(page.locator('#expandPlayer')).to_have_attribute('aria-expanded','false')
                nav('history');capture('history');scrolling('history')
                page.locator('#history-list [data-history-index]').first.click();capture('saved-summary')
                assert 'אינם זמינים לשחזור' in page.locator('#historyReportBody').inner_text()
                page.locator('#closeHistoryReport').click()
                raw=page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")');assert len(json.loads(raw))==1
                page.reload();expect(page.locator('body')).to_have_attribute('data-screen','history')
                assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")')==raw
                nav('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();page.locator('#guideAnalyze').click()
                page.locator('#file').set_input_files(str(args.cache/'no-pose.mp4'));expect(page.locator('#startReviewedAnalysis')).to_be_enabled();page.locator('#startReviewedAnalysis').click()
                wait_for('qaTimings.length>0',timeout=120000);assert page.evaluate('qaTimings.at(-1).outcome')=='no-pose';capture('no-pose')
                assert page.evaluate('localStorage.getItem("handstand-lab-analyses-v1")')==raw
                if not args.baseline: expect(page.locator('#replaceUpload')).to_be_visible()
        if not args.baseline:
            nav('home');page.evaluate('document.documentElement.style.fontSize="200%"');capture('text-200')
            nav('catalog');capture('catalog-text-200')
            assert page.locator('#librarySearch').evaluate('n=>parseFloat(getComputedStyle(n).fontSize)')>=32
            page.evaluate('document.documentElement.style.fontSize=""')
            page.emulate_media(reduced_motion='reduce');nav('home');capture('reduced-motion')
            assert page.locator('#homeView').evaluate('n=>getComputedStyle(n).animationName')=='none'
        assert not errors,errors
        assert not posts,posts
        report['viewports'].append(item);ctx.close();print(f'{args.browser} {width}: captured and verified',flush=True)
    browser.close()
server.shutdown()
(args.out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
