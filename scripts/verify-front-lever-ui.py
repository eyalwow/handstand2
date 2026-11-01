#!/usr/bin/env python3
"""Check real local Front Lever negative-video UI, never generate a score.
Use a public non-Front-Lever clip kept outside Git. The website uses the same
pinned bytes as the native web package, routed locally only for this test.
"""
import argparse,functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--video',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args()
assert not a.out.resolve().is_relative_to(ROOT),'Keep video diagnostics outside git'
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}';report={'realInference':True,'physicalDevice':False,'errors':[],'posts':[],'externalNative':[],'cases':[]}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  for label,path in [('website','/vercel-app/'),('native-web','/mobile/www/')]:
   ctx=browser.new_context(viewport={'width':390,'height':844},has_touch=True)
   if label=='website':
    ctx.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**',lambda r:r.fulfill(response=ctx.request.get(origin+'/mobile/www/vendor/vision/'+r.request.url.split('@0.10.14/')[1].replace('vision_bundle.mjs','vision_bundle.js'))))
    ctx.route('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/**',lambda r:r.fulfill(response=ctx.request.get(origin+'/mobile/www/vendor/model/'+r.request.url.rsplit('/',1)[1])))
   else:
    def block(r):report['externalNative'].append(r.request.url);r.abort()
    ctx.route('https://**',block)
   page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('request',lambda r:report['posts'].append(r.url) if r.method=='POST' else None)
   page.add_init_script("window.addEventListener('movalyt:analysis-timing',e=>window.qaTiming=e.detail)")
   page.goto(origin+path,wait_until='networkidle');page.locator('#welcomeSkip').click();page.locator('.home-primary').click()
   page.locator('#catalogGrid [data-exercise="front-lever"]').click();page.locator('#variationGrid [data-exercise="front-lever-full"]').click();page.locator('#variationContinue').click();page.locator('#guideAnalyze').click()
   assert page.locator('#frontLeverConsent').is_visible();page.locator('#frontLeverSideView').check()
   page.locator('#file').set_input_files(str(a.video.resolve()));page.wait_for_function("()=>window.qaTiming!==undefined",timeout=120000)
   assert page.locator('body').get_attribute('data-screen')=='replay'
   assert page.locator('#frontLeverReport h2').inner_text()=='פרונט לבר · מלא'
   text=page.locator('#frontLeverReport').inner_text()
   assert 'חלון החזקה אפשרי שנצפה' not in text,text
   assert 'ללא ציון' in page.locator('#frontLeverReport').inner_text()
   assert 'פרונט לבר ניסיוני' in page.locator('#replayTrimNotice').inner_text()
   assert 'Front Lever' not in page.locator('#replayTrimNotice').inner_text()
   assert not page.locator('#ringScore').is_visible() and not page.locator('#reportLink').is_visible()
   timing=page.evaluate('qaTiming');assert timing['poseFrames']>0
   page.locator('#play').click();page.wait_for_timeout(500);assert page.locator('#v').evaluate('(v)=>!v.paused&&v.currentTime>0');page.locator('#play').click()
   page.evaluate("location.hash='history'");page.wait_for_function("()=>document.body.dataset.screen==='history'")
   assert page.locator('#history-list .history-entry').count()==0
   assert page.locator('#variationHistory .history-entry').count()==0
   page.reload(wait_until='networkidle');assert page.locator('#variationHistory .history-entry').count()==0
   report['cases'].append({'package':label,'poseFrames':timing['poseFrames'],'outcome':timing['outcome'],'scoreDisplayed':False,'historyWrites':0,'hebrewReport':True,'playback':True});ctx.close()
  browser.close()
 assert not report['errors'] and not report['posts'] and not report['externalNative'],report
finally:
 server.shutdown();server.server_close();a.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
