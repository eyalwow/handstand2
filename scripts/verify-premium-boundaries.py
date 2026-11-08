"""Additional UI boundaries. Stored-history fixtures are test-only, never screenshots or inferred grades."""
import argparse,functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];cache=ROOT.parent/'movalyt-test-cache'
a=argparse.ArgumentParser();a.add_argument('--out',type=Path,default=ROOT/'docs/screenshots/premium-analysis/boundaries');args=a.parse_args();args.out.mkdir(parents=True,exist_ok=True)
class H(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
s=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(H,directory=str(ROOT)));threading.Thread(target=s.serve_forever,daemon=True).start()
report={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def deps(route):
  u=route.request.url;path=cache/'vendor/vision/package'/u.split('@0.10.14/',1)[1] if '@0.10.14/' in u else cache/'vendor/model/package/pose_landmarker_lite.task'
  route.fulfill(path=path,content_type='application/wasm' if path.suffix=='.wasm' else 'text/javascript' if path.suffix in ['.js','.mjs'] else 'application/octet-stream',headers={'Access-Control-Allow-Origin':'*'})
 ctx.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**',deps);ctx.route('https://storage.googleapis.com/mediapipe-models/**',deps)
 page.add_init_script("window.qaTimings=[];addEventListener('movalyt:analysis-timing',e=>qaTimings.push(e.detail))")
 page.goto(f'http://127.0.0.1:{s.server_port}/vercel-app/',wait_until='networkidle');page.locator('#welcomeSkip').click()
 # Existing records are opened, compared only by model and never rewritten.
 records=[{'date':'2026-10-01T10:00:00Z','score':70,'model':'v4-observed-hold'},{'date':'2026-10-02T10:00:00Z','score':75,'model':'v4-observed-hold'}]
 raw=json.dumps(records)
 page.evaluate('(raw)=>{localStorage.setItem("handstand-lab-analyses-v1",raw);localStorage.setItem("handstand-lab-active-workout-v1","preserve-training");location.hash="history"}',raw)
 page.wait_for_function("document.body.dataset.screen==='history'")
 page.locator('#history-list [data-history-index]').first.click()
 assert page.locator('#historyReportDialog').is_visible();text=page.locator('#historyReportBody').inner_text()
 assert '75 / 100' in text and '+5' in text and 'אינם זמינים לשחזור' in text
 page.locator('#closeHistoryReport').click();assert page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")==raw
 page.reload(wait_until='domcontentloaded');page.wait_for_function("document.body.dataset.screen==='history'")
 assert page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")==raw
 page.evaluate("localStorage.setItem('handstand-lab-analyses-v1','corrupt');dispatchEvent(new Event('storage'))")
 assert 'לא זמינים' in page.locator('#history-list').inner_text();assert page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")=='corrupt'
 page.evaluate("localStorage.removeItem('handstand-lab-analyses-v1')")
 report['legacyHistoryFixtures']={'summary':True,'sameModelComparison':True,'reload':True,'corruptPreserved':True,'writesByApp':False,'data':'test-only fixtures, not inference; no screenshots'}
 page.evaluate("location.hash='home'");page.wait_for_function("document.body.dataset.screen==='home'")
 page.evaluate("document.documentElement.style.setProperty('--safe-top','47px');document.documentElement.style.setProperty('--safe-bottom','34px')")
 assert page.locator('.brand:visible').bounding_box()['y']>=47
 assert page.locator('.app-nav').bounding_box()['height']>=100
 page.screenshot(path=str(args.out/'safe-area-390.png'));report['safeArea']='CSS simulation: 47px top, 34px bottom; layout passed, not a physical iPhone'
 page.evaluate("document.documentElement.style.removeProperty('--safe-top');document.documentElement.style.removeProperty('--safe-bottom')")
 page.locator('.home-primary').click();page.locator('[data-exercise="front-lever"]').click();page.locator('[data-exercise="front-lever-full"]').click();page.locator('#variationContinue').click();page.locator('#guideAnalyze').click()
 page.locator('#file').set_input_files(str(cache/'motion.mp4'));page.wait_for_function("!document.getElementById('startReviewedAnalysis').disabled")
 page.locator('#startReviewedAnalysis').click();assert page.evaluate('qaTimings.length')==0
 assert 'לאשר' in page.locator('#uploadReviewStatus').inner_text()
 page.locator('#frontLeverSideView').check();page.locator('#startReviewedAnalysis').click()
 page.wait_for_function('qaTimings.length>0',timeout=120000)
 assert page.locator('#frontLeverReport').is_visible();assert 'ללא ציון' in page.locator('#frontLeverReport').inner_text()
 assert page.locator('#holdSec').is_hidden();assert page.evaluate("localStorage.getItem('movalyt-variation-observations-v1')")==None
 page.screenshot(path=str(args.out/'front-lever-negative-390.png'))
 report['experimentalFrontLever']={'consentRequired':True,'negativeRealMotion':True,'gradeInvented':False,'historyCreated':False,'timing':page.evaluate('qaTimings.at(-1)')}
 page.evaluate("location.hash='catalog'");page.wait_for_function("document.body.dataset.screen==='catalog'");page.locator('[data-exercise="handstand"]').click();page.locator('#guideAnalyze').click()
 page.locator('#file').set_input_files(str(cache/'no-pose.mp4'));page.wait_for_function("!document.getElementById('startReviewedAnalysis').disabled");page.locator('#startReviewedAnalysis').click()
 page.wait_for_function('qaTimings.length>1',timeout=90000)
 assert page.evaluate('qaTimings.at(-1).outcome')=='no-pose';assert page.locator('#holdSec').is_hidden()
 assert 'לזהות גוף' in page.locator('#uploadReviewStatus').inner_text()
 assert page.locator('#replaceUpload').is_visible();page.screenshot(path=str(args.out/'no-pose-390.png'))
 assert page.evaluate("localStorage.getItem('handstand-lab-active-workout-v1')")=='preserve-training'
 report['blankClip']='no-pose, readable retry, no score/history';report['trainingDataPreserved']=True
 # An explicit test-only DOM fixture covers the reliable-report layout branch.
 # No screenshot or history write is made; it is not a newly inferred result.
 page.evaluate("""async()=>{
  const {analysisUI}=await import('./movalyt-ui.js');
  const {renderHandstandInsights}=await import('./handstand-insights-ui.js');
  analysisUI.result(71,{sc:{banana:72,shoulder:74,elbow:76,lean:62}});
  document.getElementById('out').style.display='block';document.getElementById('holdSec').style.display='block';
  renderHandstandInsights({hold:{seconds:3.2,censored:false}}, {strength:'בדיקת פריסה בלבד — אינה תוצאת ניתוח',priority:'בדיקת פריסה בלבד — אינה תוצאת ניתוח',evidence:[],ending:'בדיקת פריסה בלבד',drills:[],limitations:'נתוני בדיקה בלבד',target:null});
  analysisUI.finish('scored');
 }""")
 for width in [320,390,1440]:
  page.set_viewport_size({'width':width,'height':844 if width<900 else 1000})
  assert page.locator('#replaySec').is_hidden() and page.locator('#holdSec').is_visible()
  assert page.locator('#watchSkeleton').is_visible()
  assert page.locator('#ringScore').inner_text()=='71'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")==None
 report['scoredReportLayoutFixture']={'widths':[320,390,1440],'summaryVisibleAndReplayReachable':True,'overflow':False,'historyWritten':False,'data':'Explicit UI fixture only, not live inference; no screenshots'}
 assert not errors,errors;report['pageErrors']=errors
 b.close()
s.shutdown();(args.out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
