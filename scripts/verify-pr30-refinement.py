#!/usr/bin/env python3
"""PR30 display/report and real side-entry regression. All inference is real.

Without --private-video, uses the cached public moving fixture and may record its
canvas. With it, full/held/partial derivatives and captures MUST stay outside the
repository. No raw personal footage/landmarks are included in repository output.
"""
import argparse, functools, json, threading, subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--baseline", type=Path)
parser.add_argument("--private-video", type=Path)
parser.add_argument("--held-start", type=float, default=4.5)
parser.add_argument("--partial-end", type=float, default=3.5)
parser.add_argument("--out", type=Path)
parser.add_argument("--record-motion", action="store_true")
args = parser.parse_args()
cache = ROOT.parent / "movalyt-test-cache"
out = (
    args.out
    or (
        cache / "pr30-private"
        if args.private_video
        else ROOT / "docs/screenshots/pr30-refinement"
    )
).resolve()
if args.private_video and out.is_relative_to(ROOT):
    parser.error("Private media/captures must stay outside the repository")
if args.private_video and args.record_motion:
    parser.error("Record motion only with the public fixture")
out.mkdir(parents=True, exist_ok=True)


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
origin = f"http://127.0.0.1:{server.server_port}"
INIT = """window.qaArcs=[];window.qaLines=[];
const arc=CanvasRenderingContext2D.prototype.arc;CanvasRenderingContext2D.prototype.arc=function(x,y,r,...rest){if(this.canvas.id==='cv')qaArcs.push([x,y,r]);return arc.call(this,x,y,r,...rest)};
const line=CanvasRenderingContext2D.prototype.lineTo;CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(this.canvas.id==='cv')qaLines.push([x,y,this.lineWidth]);return line.call(this,x,y)};
window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaResult=e.detail);"""
report = {
    "physical_device": False,
    "private_video": bool(args.private_video),
    "cases": [],
    "uncaught": [],
    "failed": [],
}
cases = []
source = args.private_video or cache / "motion.mp4"
if args.baseline:
    cases.append(("before", "/baseline/vercel-app/", source))
cases.append(("after", "/vercel-app/", source))
if args.private_video:
    for label, options in [
        ("already-inverted", ["-ss", str(args.held_start)]),
        ("partial", ["-t", str(args.partial_end)]),
    ]:
        path = out / (label + ".mp4")
        if not path.exists():
            subprocess.run(
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-i",
                    str(source),
                    *options,
                    "-an",
                    "-c:v",
                    "libx264",
                    "-pix_fmt",
                    "yuv420p",
                    str(path),
                ],
                check=True,
            )
        cases.append((label, "/vercel-app/", path))
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True)
        for label, url, video in cases:
            context = b.new_context(
                viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
            )
            context.add_init_script(INIT)
            page = context.new_page()
            page.on("pageerror", lambda e: report["uncaught"].append(str(e)))
            page.goto(origin + url, wait_until="networkidle")
            page.locator("#welcomeSkip").click()
            page.evaluate("location.hash='analyze'")
            page.locator("#file").set_input_files(str(video))
            page.wait_for_function("document.body.dataset.screen==='processing'")
            page.wait_for_function(
                "document.body.dataset.screen!=='processing'", timeout=120000
            )
            result = page.evaluate("qaResult")
            case = {
                "label": label,
                "score": result["score"],
                "sample_count": len(result["timestamps"]),
                "ascent": bool(result.get("timeline", {}).get("ascent")),
                "entryDiagnostics": result.get("timeline", {}).get("entryDiagnostics"),
                "legacyEntryTrace": result.get("legacyEntryTrace"),
            }
            if label == "before":
                page.wait_for_timeout(800)
                page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
                page.screenshot(path=str(out / "report-before-390.png"), full_page=True)
            if label == "after":
                assert case["score"] is not None
                if args.private_video:
                    assert case["ascent"], case
                assert page.locator("#coachDrills article").count() == 2
                assert not page.locator("#coachDrills").evaluate(
                    '(el)=>!!el.closest("details")'
                )
                assert not page.locator("#advancedReport").evaluate("el=>el.open")
                assert not page.locator("#scoreBreakdown").is_visible()
                for id in ["coachStrength", "coachSummary", "holdDuration"]:
                    value = page.locator("#" + id).inner_text()
                    assert page.locator("body").inner_text().count(value) == 1, (
                        id,
                        value,
                    )
                assert not page.locator("#resultMetrics").is_visible()
                page.wait_for_timeout(800)
                for width, height in [(320, 640), (375, 812), (390, 844), (430, 932)]:
                    page.set_viewport_size({"width": width, "height": height})
                    assert not page.evaluate(
                        "document.documentElement.scrollWidth>innerWidth"
                    )
                    if width == 390:
                        page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
                        page.screenshot(path=str(out / "report-after-390.png"))
                        page.screenshot(
                            path=str(out / "report-full-390.png"), full_page=True
                        )
                page.set_viewport_size({"width": 390, "height": 844})
                page.locator("#advancedReport summary").click()
                assert page.locator("#scoreBreakdown").is_visible()
                page.evaluate("window.scrollTo({top:0,behavior:'instant'})")
                page.screenshot(
                    path=str(out / "report-advanced-390.png"), full_page=True
                )
                page.locator("#advancedReport summary").click()
            if args.private_video and label in ["already-inverted", "partial"]:
                assert not case["ascent"], case
            if label in ["before", "after"]:
                page.evaluate("location.hash='replay'")
                page.wait_for_timeout(100)
                index = min(
                    range(len(result["timestamps"])),
                    key=lambda i: abs(
                        result["timestamps"][i]["actual"]
                        - (4.75 if args.private_video else 2.05)
                    ),
                )
                page.locator("#scrub").evaluate(
                    '(el,i)=>{el.value=i;el.dispatchEvent(new Event("input"))}', index
                )
                page.wait_for_timeout(180)
                page.evaluate("qaArcs=[];qaLines=[]")
                page.locator("#showSkeleton").uncheck()
                page.locator("#showSkeleton").check()
                case["default_joints"] = page.evaluate("qaArcs.length")
                case["line_widths"] = page.evaluate(
                    "[...new Set(qaLines.map(x=>x[2]))]"
                )
                page.screenshot(path=str(out / f"overlay-{label}-390.png"))
                if label == "after":
                    assert case["default_joints"] <= 12
                    assert len(case["line_widths"]) == 1
                    page.locator(".overlay-options summary").click()
                    page.evaluate("qaArcs=[]")
                    page.locator("#advancedOverlay").check()
                    case["advanced_joints"] = page.evaluate("qaArcs.length")
                    assert case["advanced_joints"] > case["default_joints"]
                    page.screenshot(path=str(out / "overlay-advanced-390.png"))
                    page.locator("#advancedOverlay").uncheck()
                    page.locator(".overlay-options summary").click()
                    if args.record_motion:
                        page.locator("#scrub").evaluate(
                            'el=>{el.value=3;el.dispatchEvent(new Event("input"))}'
                        )
                        page.wait_for_timeout(150)
                        page.evaluate(
                            """() => { window.recorded=new Promise(resolve=>{const chunks=[],rec=new MediaRecorder(cv.captureStream(30),{mimeType:'video/webm;codecs=vp9'});rec.ondataavailable=e=>chunks.push(e.data);rec.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer())));rec.start();setTimeout(()=>rec.stop(),2800)}); }"""
                        )
                        before_play = page.locator("#cv").evaluate("c=>c.toDataURL()")
                        page.locator("#play").click()
                        page.wait_for_timeout(400)
                        assert (
                            page.locator("#cv").evaluate("c=>c.toDataURL()")
                            != before_play
                        ), "Canvas must update during actual playback"
                        data = page.evaluate("recorded")
                        page.locator("#v").evaluate("v=>v.pause()")
                        webm = out / "overlay-motion.webm"
                        webm.write_bytes(bytes(data))
                        assert (
                            len(data) > 5000
                        ), "Recording must contain moving rendered canvas frames"
                        subprocess.run(
                            [
                                "ffmpeg",
                                "-hide_banner",
                                "-loglevel",
                                "error",
                                "-i",
                                str(webm),
                                "-an",
                                "-c:v",
                                "libx264",
                                "-pix_fmt",
                                "yuv420p",
                                "-movflags",
                                "+faststart",
                                "-y",
                                str(out / "overlay-minimal-motion.mp4"),
                            ],
                            check=True,
                        )
                        webm.unlink()
            report["cases"].append(case)
            context.close()
        if args.baseline:
            assert (
                report["cases"][0]["score"] == report["cases"][1]["score"]
            ), "Numeric score must stay unchanged"
        assert not report["uncaught"]
        b.close()
except Exception as e:
    report["failed"].append(str(e))
    raise
finally:
    (out / "checks.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    )
    server.shutdown()
    server.server_close()
print(json.dumps(report, indent=2, ensure_ascii=False))
