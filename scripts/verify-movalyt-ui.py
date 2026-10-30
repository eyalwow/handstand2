#!/usr/bin/env python3
"""Touch/viewport UI integration with a real moving UCF101 handstand clip.

Uses real MediaPipe inference and the unchanged application engine. Only upstream
model/module URLs are mapped to verified local assets in this QA HTTP server.
No poses, scores or history are injected. Does not represent physical phone QA.
"""
import argparse
import functools
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MODEL_SHA = "59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a"
VIDEO_SHA = "7862ce384b0b15cbcda5d6741b5294933deec9635f54b0339793f19049458539"
VIDEO_URL = (
    "https://huggingface.co/datasets/sumith2425/UCF101/resolve/main/"
    "test/HandstandWalking/v_HandstandWalking_g04_c01.avi"
)
WIDTHS = [320, 375, 390, 430]
HEIGHTS = {320: 640, 375: 812, 390: 844, 430: 932}
HISTORY_KEY = "handstand-lab-analyses-v1"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--browser", choices=["chromium", "webkit", "all"], default="all")
parser.add_argument("--webkit-executable")
parser.add_argument("--chromium-executable", default="/usr/bin/chromium")
parser.add_argument(
    "--out", type=Path, default=ROOT / "docs/screenshots/mobile-refinement"
)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)


def prepare(directory):
    for spec, name in [
        ("@mediapipe/tasks-vision@0.10.14", "vision"),
        ("ptmaker-vision-models@1.0.0", "model"),
    ]:
        packed = subprocess.run(
            ["npm", "pack", spec, "--pack-destination", str(directory)],
            check=True,
            capture_output=True,
            text=True,
            env={**os.environ, "npm_config_cache": str(directory / "npm-cache")},
        )
        with tarfile.open(
            directory / packed.stdout.strip().splitlines()[-1]
        ) as archive:
            archive.extractall(directory / name, filter="data")
    assert (
        hashlib.sha256(
            (directory / "model/package/pose_landmarker_lite.task").read_bytes()
        ).hexdigest()
        == MODEL_SHA
    )
    with urlopen(VIDEO_URL, timeout=45) as response:
        original = response.read()
    assert hashlib.sha256(original).hexdigest() == VIDEO_SHA, "UCF101 LFS SHA mismatch"
    avi, video = directory / "source.avi", directory / "motion.mp4"
    avi.write_bytes(original)
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(avi),
            "-vf",
            "scale=480:-2",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-an",
            "-y",
            str(video),
        ],
        check=True,
    )
    return video


def snapshot(page, screen, width, prefix=""):
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(
        0 if screen == "processing" else 800 if screen == "results" else 250
    )
    assert not page.evaluate("document.documentElement.scrollWidth > innerWidth"), (
        screen,
        width,
    )
    page.screenshot(path=str(args.out / f"{prefix}{screen}-{width}.png"))


def run_browser(playwright, name, url, video):
    executable = (
        args.chromium_executable if name == "chromium" else args.webkit_executable
    )
    launch = {"headless": True}
    if executable:
        launch["executable_path"] = executable
    browser = getattr(playwright, name).launch(**launch)
    context = browser.new_context(
        viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
    )
    context.add_init_script(
        """window.qaLines=[];
          const lineTo=CanvasRenderingContext2D.prototype.lineTo;
          CanvasRenderingContext2D.prototype.lineTo=function(x,y){
            if(['cv','analysisCanvas'].includes(this.canvas.id))window.qaLines.push([this.canvas.id,x,y]);
            return lineTo.call(this,x,y);
          };
          window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaDiagnostic=e.detail);
          window.addEventListener('movalyt:analysis-timing',e=>window.qaTiming=e.detail);"""
    )
    page = context.new_page()
    errors = []
    console_errors = []
    page.on(
        "console",
        lambda message: (
            console_errors.append(message.text[:1500])
            if message.type == "error" and not message.text.startswith("INFO:")
            else None
        ),
    )
    page.on("pageerror", lambda error: errors.append(str(error)))
    report = {
        "browser": name,
        "viewport_widths": WIDTHS,
        "viewport_heights": HEIGHTS,
        "physical_device": False,
        "passed": [],
        "failed": [],
        "unrun": [],
    }
    prefix = "" if name == "chromium" else "webkit-"
    try:
        page.goto(url, wait_until="networkidle")
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": HEIGHTS[width]})
            for screen in ["home", "analyze", "history"]:
                page.evaluate("(screen) => location.hash = screen", screen)
                snapshot(
                    page,
                    "history-empty" if screen == "history" else screen,
                    width,
                    prefix,
                )
            report["passed"].append(
                f"{width}: home, upload, empty history, no horizontal overflow"
            )
        page.set_viewport_size({"width": 390, "height": 844})
        page.evaluate("location.hash='home'")
        page.locator("#aboutButton").click()
        assert page.locator("#aboutDialog").is_visible()
        page.keyboard.press("Escape")
        assert not page.locator("#aboutDialog").is_visible()
        assert page.locator("#aboutButton").evaluate(
            "(button) => button === document.activeElement"
        )
        page.emulate_media(reduced_motion="reduce")
        assert (
            page.locator(".app-nav a").first.evaluate(
                "(el) => getComputedStyle(el).transitionDuration"
            )
            == "0s"
        )
        page.emulate_media(reduced_motion="no-preference")
        page.evaluate(
            "document.documentElement.style.setProperty('--safe-top','47px');document.documentElement.style.setProperty('--safe-bottom','34px')"
        )
        assert page.locator(".brand").bounding_box()["y"] >= 47
        assert (
            page.locator(".app-nav").bounding_box()["y"]
            + page.locator(".app-nav").bounding_box()["height"]
            <= 845
        )
        snapshot(page, "safe-area-simulation", 390, prefix)
        page.evaluate(
            "document.documentElement.style.removeProperty('--safe-top');document.documentElement.style.removeProperty('--safe-bottom')"
        )
        report["passed"].append(
            "dialog close/focus return, reduced motion, simulated top/bottom safe areas"
        )
        page.evaluate("location.hash='analyze'")
        page.locator("#file").set_input_files(str(video))
        page.locator("#cancelAnalysis").click()
        page.wait_for_function("document.body.dataset.screen === 'analyze'")
        assert page.locator("#retryAnalysis").is_visible()
        assert page.evaluate(f"localStorage.getItem({json.dumps(HISTORY_KEY)})") is None
        report["passed"].append(
            "real MP4 upload and cancellation without history writes"
        )
        for width in WIDTHS:
            page.set_viewport_size({"width": width, "height": HEIGHTS[width]})
            with page.expect_file_chooser() as chooser:
                if width == WIDTHS[0]:
                    page.locator("#retryAnalysis").click()
                else:
                    page.evaluate("location.hash='analyze'")
                    page.locator("#openGallery").click()
            chooser.value.set_files(str(video))
            page.wait_for_function(
                "document.body.dataset.screen !== 'processing' || document.getElementById('prog').value > 0",
                timeout=90000,
            )
            if page.evaluate("document.body.dataset.screen") != "processing":
                page.screenshot(
                    path=str(args.out / f"{prefix}analysis-failure-{width}.png")
                )
                raise RuntimeError(
                    page.locator("#status").inner_text()
                    or "Analysis stopped before sampling"
                )
            assert page.evaluate(
                "Math.round(document.getElementById('prog').value*100)===parseInt(document.getElementById('analysisPercent').textContent)"
            )
            snapshot(page, "processing", width, prefix)
            page.wait_for_function(
                "document.body.dataset.screen !== 'processing'", timeout=120000
            )
            diagnostic = page.evaluate("window.qaDiagnostic")
            assert (
                diagnostic and diagnostic["score"] is not None
            ), "No reliable result from moving fixture"
            report.setdefault("analyses", []).append(
                {
                    "width": width,
                    "score": diagnostic["score"],
                    "execution": diagnostic["execution"],
                    "sample_count": len(diagnostic["timestamps"]),
                }
            )
            assert len(diagnostic["timestamps"]) > 30
            assert (
                page.evaluate(
                    "new Set(qaLines.filter(p=>p[0]==='analysisCanvas').map(p=>p[1].toFixed(1)+','+p[2].toFixed(1))).size"
                )
                > 30
            )
            for screen in ["results", "replay", "history"]:
                page.evaluate("(screen) => location.hash=screen", screen)
                snapshot(page, screen, width, prefix)
            page.evaluate("location.hash='replay'")
            page.locator("#showAngles").check()
            assert page.locator("#jointMetrics p").count() >= 2
            page.locator("#showAngles").uncheck()
            page.locator("#play").click()
            page.wait_for_timeout(450)
            assert not page.locator("#v").evaluate("(video)=>video.paused")
            page.locator("#play").click()
            page.locator("#spd").click()
            assert page.locator("#v").evaluate("(video)=>video.playbackRate") == 0.5
            page.locator("#scrub").evaluate(
                "slider=>{slider.value=(+slider.min + (+slider.max-slider.min)*.2);slider.dispatchEvent(new Event('input'))}"
            )
            page.wait_for_timeout(200)
            page.evaluate("qaLines=[]")
            page.locator("#showSkeleton").uncheck()
            assert page.evaluate("qaLines.filter(p=>p[0]==='cv').length") == 0
            page.locator("#showSkeleton").check()
            before = page.evaluate("qaLines.filter(p=>p[0]==='cv')")
            page.evaluate("qaLines=[]")
            page.locator("#scrub").evaluate(
                "slider=>{slider.value=(+slider.min + (+slider.max-slider.min)*.8);slider.dispatchEvent(new Event('input'))}"
            )
            page.wait_for_timeout(250)
            after = page.evaluate("qaLines.filter(p=>p[0]==='cv')")
            assert (
                before and after and before != after
            ), "Skeleton must move between real frames"
            page.evaluate("location.hash='history'")
            history = page.evaluate(f"localStorage.getItem({json.dumps(HISTORY_KEY)})")
            assert json.loads(history)[-1]["score"] == diagnostic["score"]
            page.reload(wait_until="networkidle")
            assert page.locator("#history-list .history-entry").count() == len(
                json.loads(history)
            )
            assert (
                page.evaluate(f"localStorage.getItem({json.dumps(HISTORY_KEY)})")
                == history
            )
            page.locator("#historyListTab").click()
            assert not page.locator("#historyChart").is_visible()
            page.locator("#historyGraphTab").click()
            assert page.locator("#historyChart").is_visible()
            page.evaluate("location.hash='results'")
            page.reload(wait_until="networkidle")
            assert page.evaluate("document.body.dataset.screen") == "analyze"
            assert page.locator("#sessionNotice").is_visible()
            report["passed"].append(
                f"{width}: real motion, progress, results, moving skeleton, replay, speed, angles, history/reload"
            )
        if name == "chromium":
            page.set_viewport_size({"width": 1440, "height": 900})
            page.evaluate("location.hash='home'")
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            report["passed"].append("1440: basic desktop usability/overflow smoke only")
        assert not errors, errors
    except Exception as error:
        report["failed"].append(str(error))
        report["unrun"].append(
            "Any steps after the failure above; not counted as passed"
        )
    finally:
        report["uncaught_js_errors"] = errors
        report["console_errors"] = console_errors
        report["last_timing"] = page.evaluate("window.qaTiming || null")
        browser.close()
    return report


with tempfile.TemporaryDirectory(prefix="movalyt-motion-qa-") as temporary:
    vendor = Path(temporary)
    video = prepare(vendor)

    class Handler(SimpleHTTPRequestHandler):
        def translate_path(self, path):
            for prefix, local in [
                ("/vendor/vision/", vendor / "vision/package"),
                ("/vendor/model/", vendor / "model/package"),
            ]:
                if path.startswith(prefix):
                    return str(local / path[len(prefix) :])
            return super().translate_path(path)

        def do_GET(self):
            if self.path in ["/vercel-app/pose-worker.js", "/vercel-app/pose-main.js"]:
                data = (
                    (ROOT / self.path[1:])
                    .read_text()
                    .replace(
                        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14",
                        "/vendor/vision",
                    )
                    .replace(
                        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1",
                        "/vendor/model",
                    )
                    .encode()
                )
                self.send_response(200)
                self.send_header("Content-Type", "text/javascript")
                self.end_headers()
                self.wfile.write(data)
            else:
                super().do_GET()

        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    reports = []
    try:
        with sync_playwright() as playwright:
            for name in (
                ["chromium", "webkit"] if args.browser == "all" else [args.browser]
            ):
                report = run_browser(
                    playwright,
                    name,
                    f"http://127.0.0.1:{server.server_port}/vercel-app/",
                    video,
                )
                reports.append(report)
                (args.out / f"{name}-report.json").write_text(
                    json.dumps(report, ensure_ascii=False, indent=2) + "\n"
                )
                print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    finally:
        server.shutdown()
        server.server_close()
    raise SystemExit(1 if any(report["failed"] for report in reports) else 0)
