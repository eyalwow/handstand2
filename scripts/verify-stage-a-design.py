#!/usr/bin/env python3
"""Capture and verify the isolated Stage A proposal; no live analysis is exercised."""
import functools,json,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'docs/screenshots/stage-a'
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
report={'stage':'A — visual approval only','activeApplicationChanged':False,'screens':[],'checks':[]}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  context.add_init_script("Storage.prototype.setItem=function(){throw Error('Stage A must not write storage')};Storage.prototype.removeItem=function(){throw Error('Stage A must not remove storage')};Storage.prototype.clear=function(){throw Error('Stage A must not clear storage')}")
  page=context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  base=f'http://127.0.0.1:{server.server_port}/vercel-app/design-review/'
  for screen in ['welcome','home','upload','player']:
   page.goto(base+'?capture=1#'+screen,wait_until='networkidle');page.evaluate('document.fonts.ready')
   page.wait_for_function('document.documentElement.dataset.poseReady==="true"');page.wait_for_timeout(350)
   assert page.locator('[data-screen]:visible').count()==1
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.screenshot(path=str(OUT/(screen+'-390.png')));report['screens'].append({'screen':screen,'width':390,'height':844})
  assert page.locator('#poseOverlay line').count()>=10
  page.locator('#skeletonToggle').click();assert not page.locator('#poseOverlay').is_visible();page.locator('#skeletonToggle').click();assert page.locator('#poseOverlay').is_visible()
  page.locator('#anglesTab').click();assert page.locator('#sampleAngles article').count()>=2;assert page.locator('#sampleAngles').is_visible()
  page.locator('#metricsTab').click();assert page.locator('#sampleMetrics').is_visible()
  page.locator('[data-info]').last.click();assert page.locator('#reviewInfo').is_visible();page.keyboard.press('Escape');assert not page.locator('#reviewInfo').is_visible()
  for width in [320,430]:
   page.set_viewport_size({'width':width,'height':844})
   for screen in ['welcome','home','upload','player']:
    page.evaluate('(s)=>location.hash=s',screen);page.wait_for_timeout(60);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
  assert not errors,errors
  assert not any('/api/' in u or 'pose-worker.js' in u or 'pose-runtime.js' in u or '/movalyt-ui.js' in u for u in requests)
  report['checks']=['Four real DOM viewport captures at 390×844','No horizontal overflow at 320/390/430','Real MediaPipe photo-landmark overlay and visibility toggle','Angles from AI photo landmarks; sample metric cards explicitly labeled','Review dialog and keyboard dismissal','No storage writes or active engine/API imports','No uncaught JavaScript errors']
  report['unrun']=['Physical phones','Live video analysis, capture/upload integration','Full onboarding, choice persistence, catalog and application wiring: Stage B, pending approval']
  browser.close()
finally:server.shutdown();server.server_close()
(OUT/'review-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
