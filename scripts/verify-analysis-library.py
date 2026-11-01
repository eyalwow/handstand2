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
   # Recover gracefully without overwriting corrupt selection. Quota failures are unit tested.
   page.evaluate("localStorage.setItem('movalyt-library-selection-v1','broken')");page.reload(wait_until='networkidle');catalog();assert page.locator('#libraryNotice').is_visible()
   page.locator('#catalogGrid [data-exercise="handstand"]').click();screen('guide');assert page.evaluate("localStorage.getItem('movalyt-library-selection-v1')")=='broken'
   page.locator('#guideBack').click();screen('catalog');page.locator('#catalogGrid [data-exercise="handstand"]').click();screen('guide');page.locator('#guideAnalyze').click();screen('analyze')
   report['cases'].append({'width':width,'flow':'passed','overflow':False,'catalog':131,'variants':27});ctx.close()
  browser.close()
 assert not report['errors'],report['errors'];assert not report['posts'],report['posts'];assert not report['requestFailures'],report['requestFailures']
finally:
 if server:server.shutdown();server.server_close()
 (args.out/'checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
