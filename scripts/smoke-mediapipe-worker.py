#!/usr/bin/env python3
import functools,json,mimetypes,os,shutil,subprocess,tarfile,tempfile,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
MODEL_SHA256="59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a"

def pack(package,destination):
    result=subprocess.run(["npm","pack",package,"--pack-destination",str(destination)],cwd=destination,check=True,text=True,capture_output=True,env={**os.environ,"npm_config_cache":str(destination/"npm-cache")})
    return destination/result.stdout.strip().splitlines()[-1]

def extract(archive,destination):
    with tarfile.open(archive) as source: source.extractall(destination,filter="data")
    return destination/"package"

def sha256(path):
    import hashlib
    digest=hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda:source.read(1024*1024),b""):digest.update(block)
    return digest.hexdigest()

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,format,*args):pass

with tempfile.TemporaryDirectory(prefix="movalyt-mediapipe-smoke-") as temp_name:
    temp=Path(temp_name);site=temp/"site";vendor=site/"vendor";wasm=vendor/"wasm"
    wasm.mkdir(parents=True);(site/"vercel-app").mkdir()
    vision=extract(pack("@mediapipe/tasks-vision@0.10.14",temp),temp/"vision")
    models=extract(pack("ptmaker-vision-models@1.0.0",temp),temp/"models")
    model=models/"pose_landmarker_lite.task"
    if sha256(model)!=MODEL_SHA256:raise RuntimeError("Unexpected pose model checksum")
    shutil.copy(vision/"vision_bundle.mjs",vendor)
    for asset in (vision/"wasm").iterdir():shutil.copy(asset,wasm)
    shutil.copy(model,vendor)
    shutil.copy(ROOT/"vercel-app/pose-runtime.js",site/"vercel-app")
    shutil.copy(ROOT/"vercel-app/pose-worker.js",site/"vercel-app")
    shutil.copy(ROOT/"tests/browser/mediapipe-worker-smoke.html",site/"index.html")
    mimetypes.add_type("text/javascript",".mjs");mimetypes.add_type("application/wasm",".wasm")
    handler=functools.partial(QuietHandler,directory=site)
    server=ThreadingHTTPServer(("127.0.0.1",0),handler);threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        chromium=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium")
        with sync_playwright() as playwright:
            browser=playwright.chromium.launch(headless=True,executable_path=chromium)
            page=browser.new_page();errors=[];page.on("pageerror",lambda error:errors.append(str(error)))
            page.goto(f"http://127.0.0.1:{server.server_port}/",wait_until="domcontentloaded")
            page.wait_for_function("document.body.dataset.status",timeout=90000)
            report=json.loads(page.locator("#result").inner_text());browser.close()
        if errors or report.get("status")!="pass":raise RuntimeError(json.dumps({"report":report,"errors":errors},ensure_ascii=False))
        print(json.dumps(report,ensure_ascii=False,indent=2))
    finally:server.shutdown();server.server_close()
