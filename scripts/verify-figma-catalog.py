"""Catalog acceptance and pixel regression against PR #40, in isolated browser contexts."""
import argparse
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base', type=Path, default=Path('/tmp/movalyt-catalog-base'))
parser.add_argument('--out', type=Path, default=ROOT / 'docs/screenshots/figma-catalog/acceptance')
parser.add_argument('--url')
parser.add_argument('--access-file', type=Path)
parser.add_argument('--browser', choices=['chromium', 'webkit'], default='chromium')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *values):
        pass


servers = []


def serve(root):
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    servers.append(server)
    return f'http://127.0.0.1:{server.server_port}/vercel-app/'


url = args.url or serve(ROOT)
base_url = serve(args.base) if not args.url else None
report = {'browser': args.browser, 'viewports': [], 'otherScreens': {}}
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox']) if args.browser == 'chromium' else playwright.webkit.launch()

    def ready(page):
        page.evaluate('document.fonts.ready')
        for img in page.locator('img:visible').all():
            img.scroll_into_view_if_needed()
            img.evaluate('(img)=>img.decode()')
        page.evaluate('scrollTo(0,0)')

    def navigate(page, screen):
        page.evaluate('(screen)=>location.hash=screen', screen)
        expect(page.locator('body')).to_have_attribute('data-screen', screen)

    def start(target, width):
        context = browser.new_context(viewport={'width': width, 'height': 844 if width < 900 else 1000}, device_scale_factor=2 if width < 900 else 1, reduced_motion='reduce', locale='he-IL')
        if args.access_file:
            context.route('https://vercel.live/**', lambda route: route.abort())
        page = context.new_page()
        if args.access_file:
            page.goto(args.access_file.read_text().strip(), wait_until='domcontentloaded')
        page.goto(target, wait_until='domcontentloaded')
        page.locator('#welcomeSkip').click()
        return context, page

    for width in [390, 320, 1440]:
        context, page = start(url, width)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        navigate(page, 'catalog')
        ready(page)
        cards = page.locator('#catalogGrid > button')
        assert cards.count() == 20
        assert cards.evaluate_all('(cards)=>cards.slice(0,6).map(x=>x.dataset.exercise)') == ['handstand', 'front-lever', 'planche', 'pull-up', 'muscle-up', 'dip']
        assert page.locator('#catalogGrid [data-availability="active"]').count() == 1
        assert page.locator('#catalogGrid [data-availability="experimental"]').count() == 1
        assert page.locator('#catalogGrid img').count() == 9
        assert page.locator('#catalogGrid img').evaluate_all('(images)=>images.every(x=>x.complete&&x.naturalWidth>0&&getComputedStyle(x).objectFit==="contain")')
        assert page.evaluate('document.documentElement.scrollWidth===innerWidth')
        assert page.locator('html').get_attribute('dir') == 'rtl'
        boxes = cards.evaluate_all('(cards)=>cards.slice(0,6).map(x=>({id:x.dataset.exercise,x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height}))')
        assert boxes[0]['x'] > boxes[1]['x'] and boxes[0]['y'] == boxes[1]['y']
        assert len(set(round(box['height'], 1) for box in boxes)) == 1
        page.screenshot(path=str(args.out / f'catalog-{width}.png'))
        page.locator('#librarySearch').fill('פלאנץ')
        assert cards.count() == 1
        page.locator('#librarySearch').fill('Planche Lean')
        assert cards.count() == 1
        page.locator('#librarySearch').fill('no such exercise')
        assert page.locator('#catalogEmpty').is_visible()
        page.locator('#librarySearch').fill('')
        page.locator('#catalogOptions summary').click()
        page.locator('#libraryFilter').select_option('supported')
        assert cards.count() == 2
        page.locator('#libraryFilter').select_option('all')
        assert cards.count() > 20
        page.locator('#libraryFilter').select_option('skills')
        page.locator('#librarySort').select_option('name')
        assert cards.locator('strong').evaluate_all('(nodes)=>nodes.every((node,i)=>!i||nodes[i-1].textContent.localeCompare(node.textContent,"he")<=0)')
        page.locator('#librarySort').select_option('recommended')
        page.locator('#catalogOptions summary').click()
        cards.last.scroll_into_view_if_needed()
        page.evaluate('scrollTo(0,document.documentElement.scrollHeight)')
        assert cards.last.bounding_box()['y'] + cards.last.bounding_box()['height'] <= page.locator('.app-nav').bounding_box()['y']
        page.screenshot(path=str(args.out / f'catalog-bottom-{width}.png'))
        page.locator('#catalogGrid [data-exercise="planche"]').click()
        expect(page.locator('body')).to_have_attribute('data-screen', 'variations')
        assert page.locator('#familyHero img').get_attribute('src') == './assets/anatomy/full-planche.webp'
        page.locator('#variationGrid [data-exercise="planche-lean"]').click()
        page.locator('#variationContinue').click()
        expect(page.locator('body')).to_have_attribute('data-screen', 'guide')
        assert page.locator('#guideArtwork img').get_attribute('src') == './assets/anatomy/planche-lean.webp'
        assert not errors, errors
        report['viewports'].append({'width': width, 'columns': 2, 'mainCards': 20, 'approvedImagesDecoded': 9, 'uniformFirstSix': True, 'searchHebrewEnglish': True, 'emptyState': True, 'filterSort': True, 'familySelection': True, 'noOverflow': True, 'lastCardClearOfNav': True, 'pageErrors': errors})
        context.close()
        print(f'{width}px catalog acceptance passed', flush=True)

    if base_url:
        shots = {}
        for label, target in [('base', base_url), ('implementation', url)]:
            context, page = start(target, 390)
            shots[label] = {}
            for screen in ['home', 'variations', 'guide', 'analyze', 'history']:
                if screen == 'variations':
                    navigate(page, 'catalog')
                    page.locator('#catalogGrid [data-exercise="planche"]').click()
                    expect(page.locator('body')).to_have_attribute('data-screen', 'variations')
                else:
                    navigate(page, screen)
                ready(page)
                path = args.out / f'{label}-{screen}-390.png'
                page.screenshot(path=str(path))
                shots[label][screen] = path
            navigate(page, 'home')
            page.locator('#aboutButton').click()
            ready(page)
            path = args.out / f'{label}-settings-390.png'
            page.screenshot(path=str(path))
            shots[label]['settings'] = path
            context.close()
        for screen in shots['base']:
            diff = ImageChops.difference(Image.open(shots['base'][screen]).convert('RGB'), Image.open(shots['implementation'][screen]).convert('RGB'))
            assert diff.getbbox() is None, f'Unexpected visual change outside catalog: {screen}'
            report['otherScreens'][screen] = 'pixel-identical to PR #40 at 390px'
    browser.close()
for server in servers:
    server.shutdown()
(args.out / 'checks.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(report, ensure_ascii=False), flush=True)
