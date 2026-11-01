#!/usr/bin/env python3
"""Live library flow checks; no landmark, score or history injection.
Optional --origin verifies an existing deployment. --path can target /mobile/www/.
These are browser viewport checks, not physical-device acceptance.
"""
import argparse,functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--origin')
parser.add_argument('--path',default='/vercel-app/')
parser.add_argument('--out',type=Path,default=ROOT/'docs/screenshots/library')
parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
args=parser.parse_args();args.out.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=None
if not args.origin:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
 threading.Thread(target=server.serve_forever,daemon=True).start();args.origin=f'http://127.0.0.1:{server.server_port}'
report={'browser':args.browser,'origin':args.origin,'path':args.path,'physicalDevice':False,'cases':[],'errors':[],'requestFailures':[],'posts':[]}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True) if args.browser=='chromium' else p.webkit.launch(headless=True)
  for width in [320,390,1440]:
   ctx=browser.new_context(viewport={'width':width,'height':844},has_touch=width<500,reduced_motion='reduce')
   page=ctx.new_page();page.on('pageerror',lambda e:report['errors'].append(str(e)))
   page.on('requestfailed',lambda r:report['requestFailures'].append(r.url))
   page.on('request',lambda r:report['posts'].append(r.url) if r.method=='POST' else None)
   def screen(name):
    page.wait_for_function('(s)=>document.body.dataset.screen===s',arg=name)
    assert page.locator('#'+{'catalog':'catalogView','variations':'variationsView','guide':'guideView','analyze':'analyzerView','history':'historyView','home':'homeView'}[name]).is_visible()
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),name
   def shot(name):page.screenshot(path=str(args.out/f'{name}-{width}.png'))
   def catalog():page.evaluate("location.hash='catalog'");screen('catalog')
   page.goto(args.origin+args.path,wait_until='networkidle');page.locator('#welcomeSkip').click();screen('home')
   page.locator('.home-primary').click();screen('catalog');assert page.locator('#catalog-title').inner_text()=='בחר תרגיל לניתוח'
   assert page.locator('#catalogGrid button').count()==20;assert page.locator('html').get_attribute('dir')=='rtl';shot('catalog')
   page.locator('#catalogGrid [data-exercise="planche"]').click();screen('variations');assert page.locator('#variationGrid button').count()==6
   page.locator('#variationGrid [data-exercise="planche-super-advanced-tuck"]').click();assert page.locator('#variationGrid [aria-pressed="true"]').count()==1
   assert page.evaluate('document.activeElement.dataset.exercise')=='planche-super-advanced-tuck'
   page.locator('[data-assistance="band"]').click();assert page.locator('#variationGrid [data-exercise="planche-super-advanced-tuck-band"]').get_attribute('aria-pressed')=='true'
   shot('band-variations');page.locator('#variationContinue').click();screen('guide');assert page.locator('#guideAnalyze').is_disabled()
   assert 'עיגון' in page.locator('#guideFilming').inner_text();shot('guide')
   page.reload(wait_until='networkidle');screen('guide');assert 'גומיית' in page.locator('#guide-title').inner_text();assert page.locator('#guideAnalyze').is_disabled()
   page.locator('#guideBack').click();screen('variations');assert page.locator('[data-assistance="band"]').get_attribute('aria-pressed')=='true'
   page.locator('[data-assistance="none"]').click();page.locator('#variationContinue').click();screen('guide');assert 'גומיית' not in page.locator('#guide-title').inner_text()
   catalog();page.locator('#catalogGrid [data-exercise="pull-up"]').click();screen('guide');assert page.locator('#guideAnalyze').is_disabled()
   catalog();page.locator('#catalogGrid [data-exercise="l-sit"]').click();screen('variations');assert page.locator('#variationGrid button').count()==3;assert not page.locator('#assistanceOptions').is_visible()
   catalog();page.locator('#catalogGrid [data-exercise="front-lever"]').click();screen('variations')
   page.locator('#variationGrid [data-exercise="front-lever-full"]').click();page.locator('#variationContinue').click();screen('guide')
   assert 'ניסיוני' in page.locator('#guideAvailability').inner_text();page.locator('#guideAnalyze').click();screen('analyze')
   assert page.locator('#exerciseSelect').input_value()=='front-lever-full';assert page.locator('#frontLeverConsent').is_visible();assert not page.locator('#frontLeverSideView').is_checked()
   assert not page.locator('.capture-visual').is_visible();page.reload(wait_until='networkidle');screen('analyze');assert page.locator('#exerciseSelect').input_value()=='front-lever-full';assert not page.locator('#frontLeverSideView').is_checked()
   catalog();page.locator('#catalogGrid [data-exercise="front-lever"]').click();screen('variations');page.locator('#variationGrid [data-exercise="front-lever-super-advanced-tuck"]').click();page.locator('#variationContinue').click();screen('guide');assert page.locator('#guideAnalyze').is_disabled()
   catalog();page.locator('#catalogGrid [data-exercise="handstand"]').click();screen('guide');assert page.locator('#guideAnalyze').is_enabled();shot('handstand-guide')
   page.locator('#guideAnalyze').click();screen('analyze');assert page.locator('#exerciseSelect').input_value()=='handstand';assert not page.locator('#frontLeverConsent').is_visible()
   catalog();page.locator('#libraryFilter').select_option('training');assert page.locator('#catalogGrid button').count()==111
   page.locator('#librarySearch').fill('גומייה');assert page.locator('#catalogGrid button').count()>0;page.locator('#catalogGrid button').first.click();screen('guide');assert page.locator('#guideAnalyze').is_disabled()
   catalog();page.locator('#librarySearch').fill('zzzzzz');assert page.locator('#catalogEmpty').is_visible();page.locator('#librarySearch').fill('');page.locator('#libraryFilter').select_option('all');assert page.locator('#catalogGrid button').count()==131
   page.locator('#libraryFilter').select_option('supported');assert page.locator('#catalogGrid button').count()==2
   page.locator('#catalogGrid [data-exercise="front-lever"]').click();screen('variations');page.locator('#variationGrid [data-exercise="front-lever-tuck"]').click();page.locator('#variationContinue').click();screen('guide');page.locator('#guideHistoryLink').click();screen('history')
   assert page.locator('#variationHistoryFilter').input_value()=='front-lever-tuck';assert 'אין מדידות' in page.locator('#variationHistory').inner_text()
   page.reload(wait_until='networkidle');screen('history');assert 'אין מדידות' in page.locator('#variationHistory').inner_text()
   # QA regressions: family capability, terminology, singular count and all 24 choices.
   catalog();page.locator('#libraryFilter').select_option('skills');page.locator('#librarySearch').fill('')
   front=page.locator('#catalogGrid [data-exercise="front-lever"]')
   assert 'ניתוח ניסיוני' in front.inner_text() and '5 וריאציות' in front.inner_text()
   assert 'ניתוח לא זמין' not in front.inner_text()
   assert 'ניתוח פעיל' in page.locator('#catalogGrid [data-exercise="handstand"]').inner_text()
   assert 'ניתוח לא זמין' in page.locator('#catalogGrid [data-exercise="planche"]').inner_text()
   page.locator('#librarySearch').fill('בק לבר');assert page.locator('#catalogCount').inner_text().startswith('תרגיל אחד ·')
   page.locator('#librarySearch').fill('אדוונס');assert page.locator('#catalogGrid button').count()==2
   page.locator('#librarySearch').fill('פרונט לבר');assert page.locator('#catalogGrid button').count()==1
   page.locator('#librarySearch').fill('');page.locator('#libraryFilter').select_option('supported')
   assert page.locator('#catalogGrid button').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.exercise).sort().join(",")')=='front-lever,handstand'
   matrix=[];layout={}
   for family,hebrew in [('planche','פלאנץ׳'),('front-lever','פרונט לבר')]:
    catalog();page.locator('#libraryFilter').select_option('skills');page.locator('#catalogGrid [data-exercise="'+family+'"]').click();screen('variations')
    assert page.locator('#variations-title').inner_text()=='בחר וריאציה · '+hebrew
    assert page.locator('#variationsView .eyebrow').evaluate('(n)=>parseFloat(getComputedStyle(n).fontSize)')>=14
    for band in [False,True]:
     page.locator('[data-assistance="'+('band' if band else 'none')+'"]').click()
     for variant in ['tuck','advanced-tuck','super-advanced-tuck','one-leg','straddle','full']:
      exercise_id=family+'-'+variant+('-band' if band else '')
      chosen=page.locator('#variationGrid [data-exercise="'+exercise_id+'"]');chosen.click()
      assert chosen.get_attribute('aria-pressed')=='true'
      assert page.evaluate('document.activeElement.dataset.exercise')==exercise_id
      page.reload(wait_until='networkidle');screen('variations')
      assert page.locator('#variationGrid [aria-pressed="true"]').get_attribute('data-exercise')==exercise_id
      assert page.locator('[data-assistance="'+('band' if band else 'none')+'"]').get_attribute('aria-pressed')=='true'
      if width<=700:
       action=page.locator('#variationContinue').bounding_box()
       assert action['y']>=0 and action['y']+action['height']<=844
       assert not page.locator('.app-nav').is_visible()
      if family=='planche' and band and variant=='super-advanced-tuck':
       page.evaluate('window.scrollTo(0,0)');shot('qa-variations')
       layout=page.locator('#variationGrid .library-card').first.evaluate('(n)=>({cardWidth:n.getBoundingClientRect().width,mediaHeight:n.querySelector("figure").getBoundingClientRect().height})')
       if width==1440:assert layout['cardWidth']>=300 and layout['mediaHeight']>=180,layout
      page.locator('#variationContinue').click();screen('guide')
      name=page.locator('#guide-title').inner_text();assert name.startswith(hebrew+' · ')
      active=family=='front-lever' and not band and variant!='super-advanced-tuck'
      assert page.locator('#guideAnalyze').is_enabled()==active
      assert ('עיגון' in page.locator('#guideFilming').inner_text())==band
      page.reload(wait_until='networkidle');screen('guide');assert page.locator('#guide-title').inner_text()==name
      assert page.locator('#guideAnalyze').is_enabled()==active
      page.locator('#guideBack').click();screen('variations')
      assert page.locator('#variationGrid [aria-pressed="true"]').get_attribute('data-exercise')==exercise_id
      matrix.append(exercise_id)
   assert len(matrix)==24 and len(set(matrix))==24
   if width<=700:
    page.evaluate('document.documentElement.style.setProperty("--safe-bottom","34px")')
    page.wait_for_function('()=>parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--variation-action-height"))>=document.getElementById("variationActionbar").getBoundingClientRect().height-1')
    padding=page.locator('#variationActionbar').evaluate('(n)=>parseFloat(getComputedStyle(n).paddingBottom)');assert padding>=46
    page.evaluate('window.scrollTo(0,document.documentElement.scrollHeight)')
    page.wait_for_function('()=>document.getElementById("variationGrid").lastElementChild.getBoundingClientRect().bottom<=document.getElementById("variationActionbar").getBoundingClientRect().top')
    assert page.locator('#variationGrid .library-card').last.is_visible()
    shot('qa-safe-area')
    layout['safeAreaBottomPadding']=padding
    page.evaluate('document.documentElement.style.removeProperty("--safe-bottom")')
   page.evaluate("location.hash='history'");screen('history')
   assert page.locator('#variationHistoryTitle').inner_text()=='פרונט לבר · היסטוריית מדידות ניסיוניות'
   assert 'מנוף קדמי' not in page.locator('#variationHistoryFilter').inner_text()
   assert 'אדוונס טאק' in page.locator('#variationHistoryFilter').inner_text() and 'סטראדל' in page.locator('#variationHistoryFilter').inner_text()
   # Recover gracefully without overwriting corrupt selection. Quota failures are unit tested.
   page.evaluate("localStorage.setItem('movalyt-library-selection-v1','broken')");page.reload(wait_until='networkidle');catalog();assert page.locator('#libraryNotice').is_visible()
   page.locator('#catalogGrid [data-exercise="handstand"]').click();screen('guide');assert page.evaluate("localStorage.getItem('movalyt-library-selection-v1')")=='broken'
   page.locator('#guideBack').click();screen('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();screen('guide');page.locator('#guideAnalyze').click();screen('analyze')
   report['cases'].append({'width':width,'flow':'passed','overflow':False,'catalog':131,'variants':27,'selectionMatrix':matrix,'layout':layout});ctx.close()
  browser.close()
 assert not report['errors'],report['errors'];assert not report['posts'],report['posts'];assert not report['requestFailures'],report['requestFailures']
finally:
 if server:server.shutdown();server.server_close()
 (args.out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
