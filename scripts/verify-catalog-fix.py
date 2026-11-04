"""Catalog #38 follow-up: viewport, image, variant, guide and workout persistence checks."""
import functools,json,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/screenshots/catalog-fix'
OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}'
results=[]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,390,1440]:
  page=browser.new_page(viewport={'width':width,'height':900})
  errors=[];bad=[];posts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('response',lambda r:bad.append(r.url) if r.status>=400 else None)
  page.on('request',lambda r:posts.append(r.url) if r.method=='POST' else None)
  def check():
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),page.url
   for img in page.locator('img:visible').all():
    img.scroll_into_view_if_needed()
    img.evaluate('(img)=>img.decode()')
  def catalog():
   page.evaluate("location.hash='catalog'")
   page.wait_for_function("document.body.dataset.screen==='catalog'")
  page.goto(origin+'/vercel-app/',wait_until='networkidle')
  page.locator('#welcomeSkip').click();catalog()
  for family in ['planche','front-lever']:
   cover=page.locator(f'#catalogGrid [data-exercise="{family}"] img')
   cover.scroll_into_view_if_needed();cover.evaluate('(img)=>img.decode()')
   assert cover.get_attribute('src')==f'./assets/anatomy/full-{family}.webp'
  assert page.locator('#catalogGrid [data-exercise$="-band"]').count()==0
  check();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'catalog-{width}.png'))
  scenarios=0
  for family in ['planche','front-lever']:
   catalog();page.locator(f'#catalogGrid [data-exercise="{family}"]').click()
   for mode in ['none','band']:
    page.locator(f'#assistanceOptions [data-assistance="{mode}"]').click()
    ids=page.locator('#variationGrid [data-exercise]').evaluate_all('(nodes)=>nodes.map(x=>x.dataset.exercise)')
    assert len(ids)==(7 if family=='planche' and mode=='none' else 6)
    for exercise in ids:
     page.locator(f'#variationGrid [data-exercise="{exercise}"]').click()
     page.locator('#variationContinue').click()
     page.wait_for_function("document.body.dataset.screen==='guide'")
     check();page.reload(wait_until='networkidle')
     assert page.evaluate("JSON.parse(localStorage.getItem('movalyt-library-selection-v1')).exerciseId")==exercise
     if exercise=='planche-lean':
      assert page.locator('#guideArtwork img').count()==0
      assert 'הרגליים נשארות על הרצפה' in page.locator('#guideCriteria').inner_text()
      assert page.locator('#guideWorkout').is_visible()
      page.screenshot(path=str(OUT/f'lean-guide-{width}.png'))
     page.locator('#guideBack').click()
     page.wait_for_function("document.body.dataset.screen==='variations'")
     assert page.locator(f'#variationGrid [data-exercise="{exercise}"]').get_attribute('aria-pressed')=='true'
     scenarios+=1
  catalog();page.locator('#catalogGrid [data-exercise="handstand"]').click()
  assert page.locator('#guideArtwork img').get_attribute('src')=='./assets/anatomy/handstand.webp'
  page.locator('#guideAnalyze').click();assert page.locator('#exerciseSelect').input_value()=='handstand'
  catalog();page.locator('#catalogGrid [data-exercise="planche"]').click()
  page.locator('#assistanceOptions [data-assistance="none"]').click()
  page.locator('[data-exercise="planche-lean"]').click();page.locator('#variationContinue').click()
  page.locator('#guideWorkout').click();page.wait_for_selector('#ready:visible')
  assert page.locator('#workout-exercise').input_value()=='plancheLean'
  check();page.screenshot(path=str(OUT/f'workout-picker-{width}.png'))
  page.locator('#begin').click();page.wait_for_selector('#active-workout:visible');assert page.locator('#exercise-name').inner_text()=='הטיית פלאנץ׳'
  page.locator('#set-list input').first.check()
  page.wait_for_function("JSON.parse(localStorage.getItem('handstand-lab-active-workout-v1')).exercises[0].completed[0]===true")
  page.reload(wait_until='networkidle')
  assert page.locator('#set-list input').first.is_checked()
  before=page.evaluate("localStorage.getItem('handstand-lab-active-workout-v1')")
  page.goto(origin+'/vercel-app/workout.html?start=1&exercise=push',wait_until='networkidle')
  assert page.locator('#exercise-name').inner_text()=='הטיית פלאנץ׳'
  assert page.evaluate("localStorage.getItem('handstand-lab-active-workout-v1')")==before
  check();page.locator('#finish').click();page.locator('#confirm-finish').click()
  page.wait_for_selector('#summary:visible');check();page.reload(wait_until='networkidle')
  sessions=page.evaluate("JSON.parse(localStorage.getItem('handstand-lab-training-ui-v1')).sessions")
  assert len(sessions)==1 and sessions[0]['exercises']==['plancheLean']
  assert not errors,errors
  assert not bad,bad
  assert not posts,posts
  results.append({'width':width,'variantGuideReloadScenarios':scenarios,'familyCoversDecoded':True,'leanWorkoutReloadAndHistory':True,'existingWorkoutPreserved':True,'overflow':False,'pageErrors':errors,'httpErrors':bad,'posts':posts,'handstandReplacement':'blocked: requested PNG missing','leanArtwork':'blocked: requested PNG missing'})
  print(f'{width}px: {scenarios} variation/guide/reload scenarios and workout persistence passed',flush=True)
  page.close()
 browser.close()
server.shutdown()
(OUT/'checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False))
