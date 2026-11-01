#!/usr/bin/env python3
"""Real public-video upload through library -> original MediaPipe -> report/history.
No injected landmarks/results. Local website routes pinned CDN bytes for QA only;
native web package must use its own local vendor assets. Never commits video.
"""
import argparse,functools,json,threading,subprocess,tarfile,tempfile
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--video',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--expect',choices=['score','abstain'],default='score');p.add_argument('--include-baseline',action='store_true');p.add_argument('--only-native',action='store_true');a=p.parse_args()
assert not a.out.resolve().is_relative_to(ROOT),'Keep video diagnostics outside git'
baseline=tempfile.TemporaryDirectory(prefix='movalyt-pr34-')
if a.include_baseline:
 archive=Path(baseline.name)/'source.tar'
 with archive.open('wb') as out:subprocess.run(['git','archive','a9023c13f6a499b8cd0396cd2338d33d3a4c0051','vercel-app'],cwd=ROOT,stdout=out,check=True)
 with tarfile.open(archive) as src:src.extractall(baseline.name,filter='data')
class H(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
 def translate_path(self,path):
  if path.startswith('/baseline/'):
   target=(Path(baseline.name)/path[len('/baseline/'):].split('?')[0]).resolve()
   return str(target) if target.is_relative_to(Path(baseline.name)) else '/dev/null'
  return super().translate_path(path)
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}';report={'realInference':True,'physicalDevice':False,'errors':[],'posts':[],'externalNative':[],'cases':[]}
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
  cases=([('pr34-baseline','/baseline/vercel-app/')] if a.include_baseline else [])+[('website','/vercel-app/'),('native-web','/mobile/www/')]
  if a.only_native:cases=[('native-web','/mobile/www/')]
  for label,path in cases:
   ctx=b.new_context(viewport={'width':390,'height':844},has_touch=True)
   if label!='native-web':
    ctx.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**',lambda r:r.fulfill(response=ctx.request.get(origin+'/mobile/www/vendor/vision/'+r.request.url.split('@0.10.14/')[1].replace('vision_bundle.mjs','vision_bundle.js'))))
    ctx.route('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/**',lambda r:r.fulfill(response=ctx.request.get(origin+'/mobile/www/vendor/model/'+r.request.url.rsplit('/',1)[1])))
   else:
    def block(r):report['externalNative'].append(r.request.url);r.abort()
    ctx.route('https://**',block)
   page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)));page.on('request',lambda r:report['posts'].append(r.url) if r.method=='POST' else None)
   page.add_init_script("window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaResult=e.detail)")
   page.goto(origin+path,wait_until='networkidle');page.locator('#welcomeSkip').click()
   if label=='pr34-baseline':page.evaluate("location.hash='analyze'")
   else:
    page.locator('.home-primary').click();page.locator('#catalogGrid [data-exercise="handstand"]').click();page.locator('#guideAnalyze').click()
   page.locator('#file').set_input_files(str(a.video.resolve()))
   page.wait_for_function("()=>document.body.dataset.screen==='processing'")
   page.wait_for_function("()=>document.body.dataset.screen!=='processing'",timeout=120000)
   screen=page.locator('body').get_attribute('data-screen')
   data=page.evaluate('qaResult');assert data is not None
   print(json.dumps({'package':label,'screen':screen,'score':data['score'],'hold':data['timeline']['hold'],'reason':data['measurement'].get('reason')}),flush=True)
   assert screen==('results' if a.expect=='score' else 'replay'),page.locator('#status').inner_text()
   assert (data['score'] is not None)==(a.expect=='score')
   if a.expect=='score':page.locator('#watchSkeleton').click();page.wait_for_function("()=>document.body.dataset.screen==='replay'");assert page.locator('#showSkeleton').is_checked()
   page.locator('#play').click();page.wait_for_timeout(600);assert page.locator('#v').evaluate('(v)=>!v.paused && v.currentTime>0');page.locator('#play').click()
   page.evaluate("location.hash='history'");page.wait_for_function("()=>document.body.dataset.screen==='history'");assert page.locator('#history-list .history-entry').count()==(1 if a.expect=='score' else 0)
   page.reload(wait_until='networkidle');assert page.locator('#history-list .history-entry').count()==(1 if a.expect=='score' else 0)
   score=data['score'];seconds=data['timeline']['hold']['seconds'] if data['timeline']['hold'] else None;samples=len(data['timestamps'])
   report['cases'].append({'package':label,'score':score,'seconds':seconds,'samples':samples,'delegate':data['delegate'],'reason':data['measurement'].get('reason'),'playback':True,'historyReload':True})
   print(json.dumps(report['cases'][-1]),flush=True);ctx.close()
  b.close()
 assert not report['errors'] and not report['posts'] and not report['externalNative'],report
 assert len({x['score'] for x in report['cases']})==1
 assert len({x['seconds'] for x in report['cases']})==1
finally:
 server.shutdown();server.server_close();baseline.cleanup();a.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
