#!/usr/bin/env python3
"""Real local uploads with pinned MediaPipe, before/after and identical-pose replay.

Prepare assets using npm pack @mediapipe/tasks-vision@0.10.14 and
ptmaker-vision-models@1.0.0, extracted to ASSETS/{vision,model}/package.
Private videos are read by Playwright's local file input only. Reports must be
outside the repository. No deployment, paid API, or remote upload is used.
"""
import argparse
import functools
import hashlib
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import subprocess
import tarfile
import tempfile
import threading
from urllib.parse import unquote, urlsplit
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'db6fe32a82e8e1388140f924c718d817ae5c62cd'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--video', type=Path, action='append', default=[])
parser.add_argument('--negative', type=Path, action='append', default=[])
parser.add_argument('--assets', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
parser.add_argument('--runs', type=int, default=3)
args = parser.parse_args()
if args.out.resolve().is_relative_to(ROOT):
    parser.error('--out must be outside the repository')
if not args.video and not args.negative:
    parser.error('provide --video or --negative')
if not 3 <= args.runs <= 10:
    parser.error('use 3–10 runs')
assert hashlib.sha256((args.assets/'model/package/pose_landmarker_lite.task').read_bytes()).hexdigest() == '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'

INIT = """window.qaPoses=[];window.qaTiming=[];window.qaDiagnostic=null;
const BaseWorker=Worker;window.Worker=class extends BaseWorker {
 constructor(...args){super(...args);this.addEventListener('message',e=>{
  if(e.data.type==='result')qaPoses.push(e.data.landmarks);
 });}
};
window.addEventListener('movalyt:analysis-diagnostic',e=>qaDiagnostic=e.detail);
window.addEventListener('movalyt:analysis-timing',e=>qaTiming.push(e.detail));
"""
report = {'baseline': BASE, 'cases': [], 'errors': [], 'posts': [], 'limitations': ['Not physical iPhone validation; projected 2D technique is not anatomical ground truth.']}
with tempfile.TemporaryDirectory(prefix='handstand-baseline-') as name:
    baseline = Path(name)
    archive = baseline/'source.tar'
    with archive.open('wb') as output:
        subprocess.run(['git','archive',BASE,'vercel-app'],cwd=ROOT,stdout=output,check=True)
    with tarfile.open(archive) as source:
        source.extractall(baseline,filter='data')

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

        def translate_path(self, path):
            path=unquote(urlsplit(path).path)
            for prefix, folder in [('/baseline/', baseline),('/vendor/vision/',args.assets/'vision/package'),('/vendor/model/',args.assets/'model/package')]:
                if path.startswith(prefix):
                    target=(folder/path[len(prefix):]).resolve()
                    return str(target) if target.is_relative_to(folder.resolve()) else '/dev/null'
            return super().translate_path(path)

        def do_GET(self):
            if urlsplit(self.path).path.endswith(('/pose-worker.js','/pose-main.js')):
                content=Path(self.translate_path(self.path)).read_text().replace('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14','/vendor/vision').replace('https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1','/vendor/model').encode()
                self.send_response(200);self.send_header('Content-Type','text/javascript');self.end_headers();self.wfile.write(content)
            else:
                super().do_GET()

    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    origin=f'http://127.0.0.1:{server.server_port}'
    args.out.parent.mkdir(parents=True,exist_ok=True)
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True)
            for video, negative in [(p,False) for p in args.video]+[(p,True) for p in args.negative]:
                case={'inputSha256':hashlib.sha256(video.read_bytes()).hexdigest(),'negative':negative,'before':[],'after':[]}
                report['cases'].append(case)
                for label,prefix in [('before','/baseline'),('after','')]:
                    context=browser.new_context(viewport={'width':390,'height':844})
                    context.add_init_script(INIT)
                    page=context.new_page()
                    page.on('pageerror',lambda e:report['errors'].append(str(e)))
                    page.on('request',lambda r:report['posts'].append(r.url) if r.method=='POST' else None)
                    page.goto(origin+prefix+'/vercel-app/',wait_until='domcontentloaded')
                    page.locator('#welcomeSkip').click()
                    page.evaluate("location.hash='analyze'")
                    for i in range(args.runs):
                        page.evaluate('qaPoses=[];qaDiagnostic=null')
                        page.locator('#file').set_input_files(str(video.resolve()))
                        page.wait_for_function('n=>qaTiming.length>n',arg=i,timeout=500000)
                        result=page.evaluate('({diagnostic:qaDiagnostic,outcome:qaTiming.at(-1).outcome})')
                        if result['diagnostic'] is None:
                            raise AssertionError(f'{label}: no diagnostics: {result}')
                        if label=='after':
                            result['samePoseBaseline']=page.evaluate("""async () => {
                              const src=await (await fetch('/baseline/vercel-app/handstand-engine.js')).text();
                              const legacy=new Function(src.slice(src.indexOf('const K={'),src.indexOf('const ENAME='))+';return {analyze,reliableResult,analyzeEntry}')();
                              const {overallHandstandScore,observedEntryWindow}=await import('/baseline/vercel-app/handstand-summary.js');
                              const {analyzeHandstandTimeline}=await import('/baseline/vercel-app/handstand-temporal.js');
                              const v=document.getElementById('v'),frames=qaPoses.map(f=>f?.map(p=>({x:p.x*v.videoWidth,y:p.y*v.videoHeight,v:p.v}))||null);
                              const raw=legacy.analyze(frames,10),hold=legacy.reliableResult(raw,10)?raw:null;
                              const entryFrames=observedEntryWindow(frames,10,hold),entry=entryFrames?legacy.analyzeEntry(entryFrames,10):null;
                              if(entry?.arch===null)entry.total=(entry.sc.reach*.4+entry.sc.shoulder*.2+entry.sc.elbow*.15)/.75;
                              const timeline=analyzeHandstandTimeline({frames,timestamps:qaDiagnostic.timestamps.map(t=>t.actual),width:v.videoWidth,height:v.videoHeight,hold,entry});
                              return {score:overallHandstandScore(hold,entry),holdSeconds:timeline.hold?.seconds??null,scores:hold?.sc??null};
                            }""")
                        case[label].append(result)
                        args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2))
                        d=result['diagnostic']
                        print(json.dumps({'case':len(report['cases']),'phase':label,'run':i+1,'seconds':d['timeline']['hold']['seconds'] if d['timeline']['hold'] else None,'score':d['score'],'scores':d['hold']['scores'] if d['hold'] else None,'outcome':result['outcome']}),flush=True)
                    case[label+'Identical']=all(r==case[label][0] for r in case[label])
                    context.close()
                assert case['afterIdentical'], 'new inference diagnostics varied across runs'
                if negative:
                    assert all(r['diagnostic']['score'] is None and r['diagnostic']['timeline']['hold'] is None for r in case['after']), 'negative acquired a hold or score'
            browser.close()
            assert not report['errors'], report['errors']
            assert not report['posts'], report['posts']
    finally:
        server.shutdown();server.server_close()
        args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2))
