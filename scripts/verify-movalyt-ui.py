#!/usr/bin/env python3
"""Real Chromium UI integration using a still-image MP4 fixture and real MediaPipe.
Not a motion accuracy benchmark. Downloads verified upstream test dependencies into
an ephemeral directory and serves them locally only for this network-limited QA.
Production dependency URLs and application source are not rewritten on disk.
Requires Python playwright, Chromium, ffmpeg; npm for the upstream assets.
"""
import functools,hashlib,json,subprocess,tarfile,tempfile,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
out=ROOT/'docs/screenshots/reference-recreation';out.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='movalyt-ui-qa-') as temporary:
 vendor_root=Path(temporary)
 for package,folder in [('@mediapipe/tasks-vision@0.10.14','vision'),('ptmaker-vision-models@1.0.0','model')]:
  target=vendor_root/folder
  if not target.exists():
   r=subprocess.run(['npm','pack',package,'--pack-destination',str(vendor_root)],check=True,capture_output=True,text=True,env={**__import__('os').environ,'npm_config_cache':str(vendor_root/'npm-cache')})
   with tarfile.open(vendor_root/r.stdout.strip().splitlines()[-1]) as t:t.extractall(target,filter='data')
 model=vendor_root/'model/package/pose_landmarker_lite.task'
 assert hashlib.sha256(model.read_bytes()).hexdigest()=='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'
 print('verified vendor assets')
 
 class Handler(SimpleHTTPRequestHandler):
  def translate_path(self,path):
   if path.startswith('/vendor/vision/'):
    return str(vendor_root/'vision/package')+'/'+path[len('/vendor/vision/'):]
   if path.startswith('/vendor/model/'):
    return str(vendor_root/'model/package')+'/'+path[len('/vendor/model/'):]
   return super().translate_path(path)
  def do_GET(self):
   if self.path=='/vercel-app/pose-worker.js':
    data=(ROOT/'vercel-app/pose-worker.js').read_text().replace('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14','/vendor/vision').replace('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1','/vendor/model').encode()
    self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(data)
   else:super().do_GET()
  def log_message(self,*args):pass
 
 fixture=vendor_root/'qa-still.mp4'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-loop','1','-i',str(ROOT/'vercel-app/assets/photography/movalyt-handstand-ai.webp'),'-t','4','-vf','scale=384:576','-r','10','-c:v','libx264','-pix_fmt','yuv420p','-y',str(fixture)],check=True)
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start()
 
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  context=b.new_context(viewport={'width':390,'height':844});context.route('https://**/*',lambda route:route.abort())
  page=context.new_page();errors=[];diagnostics=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:print(m.type,m.text[:250],flush=True) if m.type=='error' else None)
  page.on('console',lambda m:print('console',m.text[:300]) if 'timing' in m.text else None)
  page.goto(f'http://127.0.0.1:{server.server_port}/vercel-app/#analyze',wait_until='networkidle')
  page.evaluate("window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaDiagnostic=e.detail)")
  page.locator('#file').set_input_files(str(fixture))
  page.wait_for_timeout(30)
  page.locator('#cancelAnalysis').click()
  page.wait_for_function("document.body.dataset.screen==='analyze'")
  assert page.locator('#retryAnalysis').is_visible()
  print('PASS cancel',page.locator('#status').inner_text())
  with page.expect_file_chooser() as chooser: page.locator('#retryAnalysis').click()
  chooser.value.set_files(str(fixture))
  page.wait_for_function("document.body.dataset.screen==='processing'")
  page.wait_for_function("Number(document.getElementById('analysisPercent').textContent.replace('%',''))>0",timeout=90000)
  page.screenshot(path=str(out/'processing-390.png'),full_page=True)
  page.wait_for_function("['results','replay','analyze'].includes(document.body.dataset.screen)",timeout=180000)
  print('FINISH',page.evaluate('document.body.dataset.screen'),page.locator('#status').inner_text());print('DIAGNOSTIC',json.dumps(page.evaluate('window.qaDiagnostic'),ensure_ascii=False));print('ERRORS',errors)
  assert page.evaluate('window.qaDiagnostic.execution')=='worker'
  assert page.evaluate('window.qaDiagnostic.score') is not None
  assert not errors,errors
  for width in [390,320,1440]:
   page.set_viewport_size({'width':width,'height':844 if width<1000 else 900})
   page.locator('#file').set_input_files(str(fixture))
   page.wait_for_function("Number(document.getElementById('analysisPercent').textContent.replace('%',''))>0&&document.body.dataset.screen==='processing'",timeout=90000)
   page.screenshot(path=str(out/f'processing-{width}.png'),full_page=True)
   page.wait_for_function("document.body.dataset.screen==='results'",timeout=120000)
   for route in ['results','replay','history']:
    page.evaluate('(r)=>location.hash=r',route);page.wait_for_timeout(400)
    page.screenshot(path=str(out/f'{route}-{width}.png'),full_page=True)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    print('SCREEN',route,width,page.evaluate('({screen:document.body.dataset.screen,overflow:document.documentElement.scrollWidth>innerWidth})'))
   if width==390:
    page.evaluate("location.hash='replay'");page.wait_for_timeout(200)
    page.locator('#showAngles').check();assert page.locator('#jointMetrics p').count()>0;page.locator('#showAngles').uncheck();page.locator('#showSkeleton').uncheck();assert not page.locator('#showSkeleton').is_checked();page.locator('#showSkeleton').check();page.locator('#play').click();page.wait_for_timeout(250);page.locator('#play').click();page.locator('#spd').click();assert '0.5' in page.locator('#spd').inner_text()
    print('PASS playback, speed and skeleton toggle')
  b.close()
 
 server.shutdown();server.server_close()
