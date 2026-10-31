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
import shutil
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
parser.add_argument(
    "--ui-only",
    action="store_true",
    help="Check UI without retrying the known Linux WebKit inference limitation",
)
parser.add_argument("--chromium-executable", default="/usr/bin/chromium")
parser.add_argument("--out", type=Path, default=ROOT / "docs/screenshots/overnight")
parser.add_argument("--cache", type=Path, default=ROOT.parent / "movalyt-test-cache")
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)


def prepare(directory):
    directory.mkdir(parents=True, exist_ok=True)
    packages = args.cache / "packages"
    packages.mkdir(parents=True, exist_ok=True)
    for spec, name, artifact in [
        ("@mediapipe/tasks-vision@0.10.14", "vision", "vision_bundle.mjs"),
        ("ptmaker-vision-models@1.0.0", "model", "pose_landmarker_lite.task"),
    ]:
        if (directory / name / "package" / artifact).exists():
            continue
        packed = subprocess.run(
            ["npm", "pack", spec, "--pack-destination", str(packages)],
            check=True,
            capture_output=True,
            text=True,
            env={**os.environ, "npm_config_cache": str(args.cache / "npm-cache")},
        )
        with tarfile.open(packages / packed.stdout.strip().splitlines()[-1]) as archive:
            archive.extractall(directory / name, filter="data")
    assert (
        hashlib.sha256(
            (directory / "model/package/pose_landmarker_lite.task").read_bytes()
        ).hexdigest()
        == MODEL_SHA
    )
    avi, video = args.cache / "source.avi", args.cache / "motion.mp4"
    if not avi.exists():
        with urlopen(VIDEO_URL, timeout=45) as response:
            avi.write_bytes(response.read())
    assert hashlib.sha256(avi.read_bytes()).hexdigest() == VIDEO_SHA
    if not video.exists():
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
    negative = args.cache / "no-pose.mp4"
    if not negative.exists():
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=320x480:r=10:d=2",
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-y",
                str(negative),
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
        assert page.evaluate("document.body.dataset.screen") == "onboarding"
        snapshot(page, "welcome", 390, prefix)
        page.locator("#welcomeStart").click()
        assert page.locator("#onboardingNext").is_disabled()
        page.locator("#goal-technique").check()
        snapshot(page, "onboarding-goal", 390, prefix)
        page.locator("#onboardingNext").click()
        assert page.locator("input[name=interest]").count() == 20
        page.locator("#interest-planche").check()
        page.locator("#interest-front-lever").check()
        snapshot(page, "onboarding-exercises", 390, prefix)
        page.locator("#onboardingNext").click()
        snapshot(page, "onboarding-explain", 390, prefix)
        page.locator("#onboardingNext").click()
        snapshot(page, "onboarding-finish", 390, prefix)
        page.locator("#onboardingNext").click()
        profile = page.evaluate(
            "JSON.parse(localStorage.getItem('movalyt-preferences-v1'))"
        )
        assert (
            profile["completed"]
            and profile["goal"] == "technique"
            and set(profile["interests"]) == {"handstand", "planche", "front-lever"}
        )
        page.reload(wait_until="networkidle")
        assert page.evaluate("document.body.dataset.screen") == "home"
        page.locator("#aboutButton").click()
        snapshot(page, "settings", 390, prefix)
        page.locator("#restartOnboarding").click()
        assert page.evaluate("document.body.dataset.screen") == "onboarding"
        page.locator("#welcomeSkip").click()
        assert (
            page.evaluate(
                "JSON.parse(localStorage.getItem('movalyt-preferences-v1')).interests.length"
            )
            == 3
        )
        page.reload(wait_until="networkidle")
        assert page.evaluate("document.body.dataset.screen") == "home"
        report["passed"].append(
            "Full first-run onboarding, goal/multiple interests, completion persistence, reload, settings replay and Welcome skip"
        )
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
            page.evaluate("location.hash='catalog'")
            assert page.locator("#catalogGrid .exercise-card").count() == 20
            assert page.locator("#catalogGrid a.exercise-card").count() == 1
            assert page.locator("#catalogGrid [data-status=coming-soon]").count() == 19
            snapshot(page, "catalog", width, prefix)
            page.evaluate("location.hash='home'")
            page.locator("#aboutButton").click()
            page.locator("#restartOnboarding").click()
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            page.locator("#welcomeStart").click()
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            page.locator("#goal-progress").check()
            page.locator("#onboardingNext").click()
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            page.locator("#onboardingNext").click()
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            page.locator("#onboardingNext").click()
            assert not page.evaluate("document.documentElement.scrollWidth>innerWidth")
            page.locator("#onboardingNext").click()
            report["passed"].append(
                f"{width}: six-state shell, 20-item catalog/one available engine, onboarding steps, no horizontal overflow"
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
        assert page.locator(".brand:visible").bounding_box()["y"] >= 47
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
        if args.ui_only:
            report["unrun"].append(
                "Media inference/player/results: deliberately excluded; known Linux WebKit GLctx.activeTexture limitation, no physical device"
            )
            return report
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
                    page.locator(".pick").click()
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
            assert page.locator("#resultMetrics article").count() >= 4
            assert not page.locator("#playerMetrics").is_visible()
            page.evaluate("location.hash='results'")
            assert not page.locator("#advancedReport").evaluate("el=>el.open")
            assert page.locator("#coachDrills article").count() == 2
            page.evaluate("location.hash='replay'")
            assert not page.locator("#coachPanel").evaluate(
                "element=>element.closest('details')!==null"
            )
            page.locator("#expandPlayer").click()
            assert page.evaluate("document.body.dataset.expanded") == "true"
            page.keyboard.press("Escape")
            assert (
                page.locator("#expandPlayer").get_attribute("aria-expanded") == "false"
            )
            before_play = page.locator("#cv").evaluate("c=>c.toDataURL()")
            page.locator("#play").click()
            page.wait_for_timeout(450)
            assert (
                page.locator("#cv").evaluate("c=>c.toDataURL()") != before_play
            ), "Canvas must move during actual playback"
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
            page.evaluate("location.hash='analyze'")
            old_history = page.evaluate(
                "localStorage.getItem('handstand-lab-analyses-v1')"
            )
            page.locator("#file").set_input_files(str(args.cache / "no-pose.mp4"))
            page.wait_for_function("document.body.dataset.screen==='processing'")
            page.wait_for_function(
                "document.body.dataset.screen!=='processing'", timeout=120000
            )
            assert page.evaluate("document.body.dataset.screen") == "analyze"
            assert (
                page.locator("#playerMetrics article").count() == 0
                and page.locator("#ringScore").inner_text() == ""
            )
            assert (
                page.evaluate("localStorage.getItem('handstand-lab-analyses-v1')")
                == old_history
            )
            report["passed"].append(
                "No-pose retry clears previous measured cards/score and never adds fake history"
            )
            denied = browser.new_context(viewport={"width": 390, "height": 844})
            denied.add_init_script(
                "const read=Storage.prototype.getItem;Storage.prototype.getItem=function(key){if(key==='movalyt-preferences-v1')throw Error('blocked');return read.call(this,key)};const write=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='movalyt-preferences-v1')throw Error('blocked');return write.call(this,key,value)}"
            )
            denied_page = denied.new_page()
            denied_page.goto(url, wait_until="networkidle")
            denied_page.locator("#welcomeSkip").click()
            assert (
                denied_page.evaluate("document.body.dataset.screen") == "home"
                and denied_page.locator("#storageNotice").is_visible()
            )
            denied.close()
            report["passed"].append(
                "Unavailable preference storage still permits entry with an explicit unsaved notice"
            )
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


if __name__ == "__main__":
    vendor = args.cache / "vendor"
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
