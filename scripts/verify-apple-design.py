#!/usr/bin/env python3
"""Mobile web design/flow verification against a real cached motion clip.
Baseline snapshots use an immutable worktree. No injected poses, scores or history.
"""
import argparse, functools, json, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--baseline", type=Path)
parser.add_argument("--before-only", action="store_true")
parser.add_argument("--after-only", action="store_true")
parser.add_argument(
    "--width",
    type=int,
    choices=[320, 375, 390, 430],
    help="Restrict a focused rerun to one width",
)
parser.add_argument(
    "--capture-only",
    action="store_true",
    help="Refresh static capture screenshots without repeating inference",
)
parser.add_argument("--out", type=Path, default=ROOT / "docs/screenshots/apple-design")
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
cache = ROOT.parent / "movalyt-test-cache"


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        for prefix, local in [
            ("/vendor/vision/", cache / "vendor/vision/package"),
            ("/vendor/model/", cache / "vendor/model/package"),
        ]:
            if path.startswith(prefix):
                return str(local / path[len(prefix) :])
        if path.startswith("/baseline/") and args.baseline:
            return str(args.baseline / path[len("/baseline/") :].split("?")[0])
        return super().translate_path(path)

    def do_GET(self):
        if self.path.endswith(("/pose-worker.js", "/pose-main.js")):
            data = (
                Path(self.translate_path(self.path))
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

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {"physical_device": False, "cases": [], "failed": [], "uncaught": []}
cases = []
if not args.after_only:
    if not args.baseline:
        parser.error("--baseline is required for before captures")
    cases.append(("before", 390, 844, "/baseline/vercel-app/", "motion.mp4"))
if not args.before_only:
    cases += [
        ("after", w, h, "/vercel-app/", "motion.mp4")
        for w, h in [(320, 640), (375, 812), (390, 844), (430, 932)]
    ]
    cases.append(("after-portrait", 390, 844, "/vercel-app/", "portrait.mp4"))


if args.width:
    cases = [
        case for case in cases if case[1] == args.width and case[0] != "after-portrait"
    ]


def shot(page, label, screen, width, full=False):
    if screen.startswith("capture"):
        page.wait_for_timeout(650)
    if screen == "results":
        page.wait_for_timeout(800)
    page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
    assert not page.evaluate("document.documentElement.scrollWidth>innerWidth"), (
        label,
        screen,
        width,
    )
    page.screenshot(
        path=str(args.out / f"{label}-{screen}-{width}.png"), full_page=full
    )


def large_text(page, label, screen, width):
    page.evaluate("document.documentElement.style.fontSize='32px'")
    assert not page.evaluate("document.documentElement.scrollWidth>innerWidth"), (
        "large text",
        screen,
        width,
    )
    if screen == "capture":
        photo = page.locator(".capture-visual").bounding_box()
        for selector in [".capture-visual-copy strong", ".capture-image-credit"]:
            box = page.locator(selector).bounding_box()
            assert box["y"] + box["height"] <= photo["y"] + photo["height"], (
                "clipped image copy",
                selector,
                box,
                photo,
            )
    if screen == "results":
        assert (
            page.locator("#coachSummary").evaluate(
                "e=>parseFloat(getComputedStyle(e).fontSize)"
            )
            >= 34
        )
    shot(page, label, screen + "-200", width)
    page.evaluate("document.documentElement.style.removeProperty('font-size')")


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True)
        for label, width, height, path, fixture in cases:
            context = browser.new_context(
                viewport={"width": width, "height": height},
                is_mobile=True,
                has_touch=True,
            )
            context.add_init_script(
                "window.qaArcs=[];const arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.arc=function(x,y,r,...a){if(this.canvas.id==='cv')qaArcs.push([x,y,r]);return arc.call(this,x,y,r,...a)};window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaResult=e.detail)"
            )
            page = context.new_page()
            page.on("pageerror", lambda e: report["uncaught"].append(str(e)))
            page.goto(
                f"http://127.0.0.1:{server.server_port}" + path,
                wait_until="networkidle",
            )
            page.locator("#welcomeSkip").click()
            page.locator("#navAnalyze").click()
            shot(page, label, "capture", width)
            case = {
                "label": label,
                "width": width,
                "fixture": fixture,
                "capture_metadata_px": page.locator(".private-note").evaluate(
                    "e=>parseFloat(getComputedStyle(e).fontSize)"
                ),
            }
            if label == "after":
                assert (
                    page.locator(".analyzer-heading .back").bounding_box()["x"]
                    > width / 2
                )
                assert page.locator(".pick").bounding_box()["height"] >= 56
                if width == 390:
                    large_text(page, label, "capture", width)
            if args.capture_only:
                report["cases"].append(case)
                context.close()
                continue
            with page.expect_file_chooser() as chooser:
                page.locator(".pick").click()
            chooser.value.set_files(str(cache / fixture))
            page.wait_for_function("document.body.dataset.screen==='processing'")
            page.wait_for_function(
                "document.getElementById('prog').value>0", timeout=90000
            )
            shot(page, label, "processing", width)
            page.wait_for_function(
                "document.body.dataset.screen!=='processing'", timeout=120000
            )
            result = page.evaluate("qaResult")
            assert (
                isinstance(result["score"], (int, float))
                and 0 <= result["score"] <= 100
            ), result["score"]
            assert len(result["timestamps"]) == 42
            case["score"] = result["score"]
            case["sample_count"] = len(result["timestamps"])
            assert page.evaluate("document.body.dataset.screen") == "results"
            shot(page, label, "results", width)
            case["report_body_px"] = page.locator("#coachSummary").evaluate(
                "e=>parseFloat(getComputedStyle(e).fontSize)"
            )
            if label == "after":
                assert case["report_body_px"] >= 17
                assert not page.locator("#advancedReport").evaluate("e=>e.open")
                assert page.locator("#coachDrills article").count() == 2
                for id in ["coachStrength", "coachSummary", "holdDuration"]:
                    text = page.locator("#" + id).inner_text()
                    assert page.locator("body").inner_text().count(text) == 1, (
                        id,
                        text,
                    )
                if width == 390:
                    source_url = page.locator("#v").evaluate("v=>v.src")
                    page.locator(".analyzer-heading .back").click()
                    page.wait_for_function("document.body.dataset.screen==='analyze'")
                    page.locator("#navAnalyze").click()
                    page.wait_for_function("document.body.dataset.screen==='results'")
                    assert page.locator("#v").evaluate("v=>v.src") == source_url
                    shot(page, label, "report-full", width, True)
                    large_text(page, label, "results", width)
                    page.locator("#advancedReport summary").click()
                    assert page.locator("#scoreBreakdown").is_visible()
                    page.locator("#advancedReport summary").click()
            cta = page.get_by_role("link", name="צפה בסרטון עם שלד", exact=True)
            assert cta.is_visible()
            box = cta.bounding_box()
            case["skeleton_cta_before_bottom_nav"] = (
                box["y"] + box["height"] < height - 76
            )
            if label == "after":
                assert case["skeleton_cta_before_bottom_nav"]
            cta.click()
            page.wait_for_function("document.body.dataset.screen==='replay'")
            page.wait_for_timeout(100)
            shot(page, label, "player", width)
            case["player_clock_px"] = page.locator("#playerTime").evaluate(
                "e=>parseFloat(getComputedStyle(e).fontSize)"
            )
            assert page.locator("#showSkeleton").is_checked()
            assert not page.locator("#advancedOverlay").is_checked()
            page.evaluate("qaArcs=[]")
            page.locator("#showSkeleton").uncheck()
            page.locator("#showSkeleton").check()
            assert 0 < len(page.evaluate("qaArcs")) <= 12
            for id in ["play", "spd", "prev", "next", "scrub"]:
                b = page.locator("#" + id).bounding_box()
                assert b["width"] >= 44 and b["height"] >= 44, (label, width, id, b)
            frame = page.locator("#cv").evaluate("c=>c.toDataURL()")
            page.locator("#play").click()
            page.wait_for_timeout(450)
            assert not page.locator("#v").evaluate("v=>v.paused")
            assert page.locator("#cv").evaluate("c=>c.toDataURL()") != frame
            page.locator("#play").click()
            assert page.locator("#v").evaluate("v=>v.paused")
            page.locator("#spd").click()
            assert page.locator("#v").evaluate("v=>v.playbackRate") == 0.5
            t = page.locator("#v").evaluate("v=>v.currentTime")
            page.locator("#next").click()
            page.wait_for_function("(t)=>v.currentTime>t+.04", arg=t)
            t = page.locator("#v").evaluate("v=>v.currentTime")
            page.locator("#prev").click()
            page.wait_for_function("(t)=>v.currentTime<t-.04", arg=t)
            if label == "after" and width == 390:
                large_text(page, label, "player", width)
                page.locator("#showAngles").check()
                assert page.locator("#jointMetrics p").count() > 0
                page.locator("#showAngles").uncheck()
                source_url = page.locator("#v").evaluate("v=>v.src")
                page.locator("#navHistory").click()
                page.locator("#navAnalyze").click()
                page.wait_for_function("document.body.dataset.screen==='results'")
                assert page.locator("#v").evaluate("v=>v.src") == source_url
                page.get_by_role("link", name="צפה בסרטון עם שלד", exact=True).click()
                page.wait_for_function("document.body.dataset.screen==='replay'")
                page.locator("#prev").focus()
                page.keyboard.press("Tab")
                assert page.evaluate("document.activeElement.id") == "play"
                assert (
                    page.locator("#play").evaluate(
                        "e=>parseFloat(getComputedStyle(e).outlineWidth)"
                    )
                    >= 2
                )
                page.keyboard.press("Space")
                page.wait_for_timeout(150)
                assert not page.locator("#v").evaluate("v=>v.paused")
                page.keyboard.press("Space")
                page.emulate_media(reduced_motion="reduce", contrast="more")
                assert (
                    page.locator("#scoreArc").evaluate(
                        "e=>getComputedStyle(e).animationName"
                    )
                    == "none"
                )
                page.emulate_media(
                    reduced_motion="no-preference", contrast="no-preference"
                )
                page.evaluate(
                    "document.documentElement.style.setProperty('--safe-top','47px');document.documentElement.style.setProperty('--safe-bottom','34px')"
                )
                assert (
                    page.locator(".player-heading").bounding_box()["height"] >= 47 + 44
                )
                shot(page, label, "safe-area", width)
                page.evaluate(
                    "document.documentElement.style.removeProperty('--safe-top');document.documentElement.style.removeProperty('--safe-bottom')"
                )
            case["flow"] = (
                "native picker → real inference → results CTA → synchronized skeleton playback"
            )
            report["cases"].append(case)
            context.close()
        assert not report["uncaught"], report["uncaught"]
        browser.close()
except Exception as e:
    report["failed"].append(str(e))
    raise
finally:
    (
        args.out
        / (
            "capture-checks.json"
            if args.capture_only
            else "before-checks.json" if args.before_only else "after-checks.json"
        )
    ).write_text(json.dumps(report, indent=2) + "\n")
    server.shutdown()
    server.server_close()
print(json.dumps(report, indent=2))
