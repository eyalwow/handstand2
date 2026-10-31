#!/usr/bin/env python3
"""Verify the unmodified website and native web package via HTTP Chromium.
This is NOT a WKWebView, Android WebView or physical device certification.
No pose/score/history injection; native package must work without model CDNs.
"""
import argparse, functools, json, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--video', type=Path, required=True)
parser.add_argument('--out', type=Path, default=ROOT/'docs/native-preparation/browser')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
cache = ROOT.parent/'movalyt-test-cache'

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Existing website retains its original CDN URLs. Route them to the
        # unchanged pinned cache only for baseline HTTP browser verification.
        if self.path.startswith('/qa-vision/'):
            target=cache/'vendor/vision/package'/self.path[len('/qa-vision/'):]
        elif self.path.startswith('/qa-model/'):
            target=cache/'vendor/model/package'/self.path[len('/qa-model/'):]
        else:
            return super().do_GET()
        data=target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type','application/wasm' if target.suffix=='.wasm' else 'text/javascript' if target.suffix in ['.js','.mjs'] else 'application/octet-stream')
        self.end_headers();self.wfile.write(data)
    def log_message(self,*args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
report={'browser':'Chromium HTTP, touch 390x844','native_device':False,'cases':[],'uncaught':[],'external_package_requests':[]}
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
        for name,path in [('website','/vercel-app/'),('packaged','/mobile/www/')]:
            ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            ctx.add_init_script("window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaResult=e.detail)")
            if name=='website':
                ctx.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**',lambda r:r.fulfill(response=ctx.request.get(origin+'/qa-vision/'+r.request.url.split('@0.10.14/')[1])))
                ctx.route('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/**',lambda r:r.fulfill(response=ctx.request.get(origin+'/qa-model/'+r.request.url.rsplit('/',1)[1])))
            else:
                def block(route):
                    if not route.request.url.startswith(origin):
                        report['external_package_requests'].append(route.request.url)
                        route.abort()
                    else: route.continue_()
                ctx.route('https://**',block)
            page=ctx.new_page();page.on('pageerror',lambda e:report['uncaught'].append(str(e)))
            page.goto(origin+path,wait_until='networkidle')
            page.locator('#welcomeSkip').click();page.locator('#navAnalyze').click()
            with page.expect_file_chooser() as chooser:page.locator('.pick').click()
            chooser.value.set_files(str(args.video))
            page.wait_for_function("() => document.body.dataset.screen==='processing'")
            page.wait_for_function("() => document.body.dataset.screen==='results'",timeout=120000)
            result=page.evaluate('qaResult');assert 0<=result['score']<=100
            page.screenshot(path=str(args.out/f'{name}-results.png'))
            page.locator('#watchSkeleton').click()
            page.wait_for_function("() => document.body.dataset.screen==='replay'")
            assert page.locator('#showSkeleton').is_checked()
            page.locator('#play').click()
            page.wait_for_timeout(700)
            time1=page.locator('#v').evaluate('e=>e.currentTime')
            page.wait_for_timeout(500)
            time2=page.locator('#v').evaluate('e=>e.currentTime');assert time2>time1
            page.locator('#play').click()
            canvas=page.locator('#cv').evaluate('e=>e.toDataURL()')
            assert len(canvas)>2000
            page.screenshot(path=str(args.out/f'{name}-player.png'))
            before=page.locator('#v').evaluate('e=>e.currentTime')
            page.locator('#next').click();page.wait_for_timeout(150)
            assert page.locator('#v').evaluate('e=>e.currentTime')>before
            page.locator('#showSkeleton').uncheck();page.locator('#showSkeleton').check()
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
            key='handstand-lab-analyses-v1'
            stored=page.evaluate('(k)=>localStorage.getItem(k)',key);assert stored
            page.reload(wait_until='networkidle')
            assert page.evaluate('(k)=>localStorage.getItem(k)',key)==stored
            report['cases'].append({'app':name,'score':result['score'],'sample_count':len(result['timestamps']),'execution':result['execution'],'moving_video':True,'history_survives_reload':True})
            ctx.close()
        browser.close()
    assert not report['uncaught'],report['uncaught']
    assert not report['external_package_requests'],report['external_package_requests']
finally:
    server.shutdown();(args.out/'checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
