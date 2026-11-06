"""Real UI and media regression. No fake scores/poses/history or outbound cloud calls.
--url targets an actual deployment; --access-file holds its temporary auth URL locally.
CDN MediaPipe files may be fulfilled from the checksum-verified public test cache.
"""
import argparse,functools,json,mimetypes,threading,time
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser(description=__doc__)
a.add_argument('--url');a.add_argument('--path',default='/vercel-app/');a.add_argument('--access-file',type=Path)
a.add_argument('--out',type=Path,default=ROOT/'docs/screenshots/premium-analysis/local')
a.add_argument('--browser',choices=['chromium','webkit'],default='chromium');a.add_argument('--inference',action='store_true')
a.add_argument('--smoke',action='store_true',help='Focused handoff check of Full/Banded Full Front Lever and Lean/Banded Full Planche')
a.add_argument('--widths',nargs='+',type=int,default=[390,320,1440])
a.add_argument('--cache',type=Path,default=ROOT.parent/'movalyt-test-cache')
args=a.parse_args();args.out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None
if not args.url:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start();args.url=f'http://127.0.0.1:{server.server_port}'+args.path
report={'url':args.url,'browser':args.browser,'viewports':[],'inference':[],'previewToolbarBlocked':bool(args.access_file),'mode':'focused-handoff' if args.smoke else 'full'}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']) if args.browser=='chromium' else p.webkit.launch()
 for width in args.widths:
  context=browser.new_context(viewport={'width':width,'height':844 if width<900 else 1000},reduced_motion='reduce',is_mobile=width<900,has_touch=width<900,device_scale_factor=2 if width<900 else 1,locale='he-IL')
  if args.access_file:context.route('https://vercel.live/**',lambda route:route.abort())
  # Route only external model dependencies to verified files, never app modules or data.
  if args.inference:
   def deps(route):
    url=route.request.url
    if 'cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/' in url:
     tail=url.split('@0.10.14/',1)[1];path=args.cache/'vendor/vision/package'/tail
    else:path=args.cache/'vendor/model/package/pose_landmarker_lite.task'
    mime='application/wasm' if path.suffix=='.wasm' else 'text/javascript' if path.suffix in ['.js','.mjs'] else 'application/octet-stream'
    route.fulfill(path=path,content_type=mime,headers={'Access-Control-Allow-Origin':'*'})
   context.route('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/**',deps)
   context.route('https://storage.googleapis.com/mediapipe-models/**',deps)
  page=context.new_page();errors=[];bad=[];posts=[]
  def wait(expression,arg=None,timeout=30000):
   # Direct DevTools evaluation avoids wait_for_function's string eval under native CSP.
   predicate=expression if expression.startswith('(s)=>') else '()=>('+expression+')'
   deadline=time.monotonic()+timeout/1000
   while time.monotonic()<deadline:
    if page.evaluate(predicate,arg):return
    page.wait_for_timeout(100)
   raise AssertionError('Timed out waiting for application state: '+expression)
  page.on('pageerror',lambda e:errors.append({'message':str(e),'stack':e.stack}))
  page.on('response',lambda r:bad.append({'status':r.status,'path':urlparse(r.url).path}) if r.status>=400 else None)
  page.on('request',lambda r:posts.append(urlparse(r.url).path) if r.method=='POST' else None)
  page.add_init_script("window.qaTimings=[];window.qaDiagnostics=[];addEventListener('movalyt:analysis-timing',e=>qaTimings.push(e.detail));addEventListener('movalyt:analysis-diagnostic',e=>qaDiagnostics.push(e.detail));")
  if args.access_file:page.goto(args.access_file.read_text().strip(),wait_until='domcontentloaded')
  page.goto(args.url,wait_until='domcontentloaded');wait('!!document.body.dataset.screen',timeout=60000);assert page.title().startswith('MOVALYT')
  page.locator('#welcomeSkip').click()
  def screen(name):wait('(s)=>document.body.dataset.screen===s',arg=name)
  def navigate(name):page.evaluate('(s)=>location.hash=s',name);screen(name)
  def decode(img):
   img.scroll_into_view_if_needed()
   img.evaluate("img=>img.complete?(img.naturalWidth>0?Promise.resolve():Promise.reject(Error('Image failed: '+img.getAttribute('src')))):new Promise((resolve,reject)=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',()=>reject(Error('Image failed: '+img.getAttribute('src'))),{once:true});})")
   img.evaluate('(img)=>img.decode()')
  def check(name,shot=True):
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
   assert page.locator('html').get_attribute('dir')=='rtl'
   for img in page.locator('img:visible').all():
    decode(img)
   page.evaluate('scrollTo(0,0)')
   if shot:page.screenshot(path=str(args.out/f'{args.browser}-{name}-{width}.png'))
  screen('home');check('home')
  assert page.locator('.home-primary').inner_text().startswith('בחר תרגיל ונתח סרטון')
  assert page.locator('a[href*="workout"]:visible,a[href*="training"]:visible').count()==0
  page.locator('#aboutButton').click();check('settings');page.keyboard.press('Escape')
  assert page.evaluate("document.activeElement.id==='aboutButton'")
  page.locator('.home-primary').click();screen('catalog');check('catalog')
  for family,asset in [('planche','full-planche'),('front-lever','full-front-lever'),('handstand','handstand-corrected')]:
   assert page.locator(f'#catalogGrid [data-exercise="{family}"] img').get_attribute('src')==f'./assets/catalog/{asset}.webp'
  page.locator('#librarySearch').fill('Planche Lean');assert page.locator('#catalogGrid > button').count()==1
  page.locator('#librarySearch').fill('אין תרגיל כזה');assert page.locator('#catalogEmpty').is_visible()
  page.locator('#librarySearch').fill('');page.locator('#catalogOptions summary').click();page.locator('#librarySort').select_option('name')
  page.locator('#libraryFilter').select_option('supported');assert page.locator('#catalogGrid > button').count()==2
  page.locator('#libraryFilter').select_option('skills');page.locator('#librarySort').select_option('recommended');page.locator('#catalogOptions summary').click()
  variants=0
  for family in ['planche','front-lever']:
   navigate('catalog');page.locator(f'#catalogGrid [data-exercise="{family}"]').click();screen('variations')
   for mode in ['none','band']:
    page.locator(f'#assistanceOptions [data-assistance="{mode}"]').click()
    ids=page.locator('#variationGrid [data-exercise]').evaluate_all('(nodes)=>nodes.map(x=>x.dataset.exercise)')
    if args.smoke:ids=[id for id in ids if id in ['planche-lean','planche-full-band','front-lever-full','front-lever-full-band']]
    for id in ids:
     card=page.locator(f'#variationGrid [data-exercise="{id}"]');card.click();expect(card).to_have_attribute('aria-pressed','true')
     if card.locator('img').count():decode(card.locator('img'))
     page.locator('#variationContinue').click();screen('guide')
     assert page.locator('#guideWorkout').is_hidden()
     check(id,shot=id in ['planche-lean','front-lever-full-band'])
     page.reload(wait_until='domcontentloaded');screen('guide')
     assert page.evaluate("JSON.parse(localStorage.getItem('movalyt-library-selection-v1')).exerciseId")==id
     if id=='planche-lean':assert page.locator('#guideArtwork img').get_attribute('src').endswith('planche-lean.webp')
     page.locator('#guideBack').click();screen('variations');expect(page.locator(f'[data-exercise="{id}"]')).to_have_attribute('aria-pressed','true')
     variants+=1
   check(f'{family}-family')
  navigate('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();screen('guide');check('handstand-guide')
  page.locator('#guideAnalyze').click();screen('analyze');check('upload')
  # Unsupported/corrupt files stop at review, before inference and without storage writes.
  page.locator('#file').set_input_files({'name':'broken.mp4','mimeType':'video/mp4','buffer':b'not a video'})
  wait("document.getElementById('uploadReviewStatus').textContent.includes('לא ניתן')")
  assert page.locator('#startReviewedAnalysis').is_disabled();check('decode-error')
  page.locator('#discardUpload').click();assert page.locator('#uploadReview').is_hidden()
  navigate('history');check('history-empty');assert 'אין' in page.locator('#variationHistory').inner_text()
  # Primary actions and navigation meet the minimum target size.
  navigate('catalog')
  targets=page.locator('#catalogView button:visible,#catalogView input:visible,#catalogView select:visible,.app-nav a:visible').evaluate_all('(nodes)=>nodes.map(n=>({id:n.id||n.dataset.exercise||n.textContent.trim(),w:n.getBoundingClientRect().width,h:n.getBoundingClientRect().height}))')
  assert all(x['w']>=44 and x['h']>=44 for x in targets),targets
  if args.inference:
   navigate('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();page.locator('#guideAnalyze').click();screen('analyze')
   page.locator('#file').set_input_files(str(args.cache/'motion.mp4'))
   wait("!document.getElementById('startReviewedAnalysis').disabled")
   assert page.evaluate('qaTimings.length')==0
   assert page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")==None
   check('video-review')
   page.locator('#startReviewedAnalysis').click();screen('processing');page.locator('#cancelAnalysis').click()
   wait("qaTimings.some(x=>x.outcome==='cancelled')",timeout=30000);screen('analyze')
   assert page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")==None
   page.locator('#file').set_input_files(str(args.cache/'motion.mp4'));wait("!document.getElementById('startReviewedAnalysis').disabled")
   page.locator('#startReviewedAnalysis').click();screen('processing');check('processing')
   wait("qaTimings.some(x=>!['cancelled'].includes(x.outcome))",timeout=180000)
   timing=page.evaluate('qaTimings.at(-1)');diagnostics=page.evaluate('qaDiagnostics.at(-1)||null')
   check('actual-'+timing['outcome']);assert timing['poseFrames']>0
   if timing['outcome'] in ['scored','unreliable']:
    assert page.locator('#replaySec').is_visible()
    assert page.locator('#showSkeleton').is_visible()
    page.locator('#play').click();wait("!document.getElementById('v').paused")
    page.wait_for_timeout(300);page.locator('#play').click()
    page.locator('#showSkeleton').uncheck();page.locator('#showSkeleton').check()
    page.locator('#showAngles').check();page.locator('#next').click();check('player')
   if timing['outcome']=='scored':
    assert page.locator('#holdSec').is_visible()
    assert page.locator('#ringScore').inner_text()==str(round(diagnostics['score']))
    navigate('history');check('history-real')
    if page.locator('[data-history-index]').count():
     page.locator('[data-history-index]').first.click();check('saved-summary')
     assert 'אינם זמינים לשחזור' in page.locator('#historyReportBody').inner_text()
     page.locator('#closeHistoryReport').click()
   else:
    assert page.locator('#holdSec').is_hidden()
    if timing['outcome']=='unreliable':
     assert page.locator('#measurementNotice').is_visible()
     assert 'בביטחון' in page.locator('#measurementNotice').inner_text()
   report['inference'].append({'width':width,'timing':timing,'score':diagnostics and diagnostics['score']})
  assert not errors,errors
  assert not bad,bad
  assert not posts,posts
  report['viewports'].append({'width':width,'variantGuideReloads':variants,'rtl':True,'imagesDecoded':True,'overflow':False,'targets44px':True,'pageErrors':errors,'httpErrors':bad,'posts':posts})
  print(f'{args.browser} {width}px: selection, images, reload, errors'+(' and actual inference' if args.inference else '')+' passed',flush=True)
  context.close()
 browser.close()
if server:server.shutdown()
(args.out/f'{args.browser}-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False),flush=True)
