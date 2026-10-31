#!/usr/bin/env python3
"""Actual inference/overlay QA on the cached public motion fixture, never a personal upload.
Run after verify-movalyt-ui.py has prepared ../movalyt-test-cache. Baseline worktree
is optional: --baseline /path/to/d39701c. Does not inject poses or scores.
"""
import argparse, functools, json, threading, subprocess
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--baseline", type=Path)
parser.add_argument(
    "--case",
    action="append",
    choices=["before", "after", "portrait", "rotation", "sideways", "cropped"],
)
parser.add_argument("--cache", type=Path, default=ROOT.parent / "movalyt-test-cache")
parser.add_argument(
    "--out", type=Path, default=ROOT / "docs/screenshots/intelligent-analysis"
)
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
# Cached derived clips: aspect padding, physical pixel rotation, then rotation
# metadata that restores upright playback. No new source footage is fetched.
for name, command in [
    (
        "portrait.mp4",
        [
            "-i",
            str(args.cache / "motion.mp4"),
            "-vf",
            "scale=400:300,pad=400:720:0:210:black",
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
        ],
    ),
    (
        "sideways.mp4",
        [
            "-i",
            str(args.cache / "portrait.mp4"),
            "-vf",
            "transpose=clock",
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
        ],
    ),
    (
        "rotation-metadata.mp4",
        [
            "-display_rotation:v:0",
            "90",
            "-i",
            str(args.cache / "sideways.mp4"),
            "-c",
            "copy",
        ],
    ),
]:
    if not (args.cache / name).exists():
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                *command,
                str(args.cache / name),
            ],
            check=True,
        )


if not (args.cache / "cropped.mp4").exists():
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(args.cache / "motion.mp4"),
            "-vf",
            "crop=360:260:60:50",
            "-an",
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            str(args.cache / "cropped.mp4"),
        ],
        check=True,
    )


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        for prefix, local in [
            ("/vendor/vision/", args.cache / "vendor/vision/package"),
            ("/vendor/model/", args.cache / "vendor/model/package"),
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
report = {"physical_device": False, "cases": [], "failed": [], "uncaught_errors": []}
# QA instrumentation observes the actual Worker and actual drawing, never supplies predictions.
INIT = """window.qaPose=[];window.qaDraw=[];
 const WorkerBase=window.Worker;window.Worker=class extends WorkerBase{constructor(...args){super(...args);this.addEventListener('message',e=>{if(e.data.type==='result')qaPose.push(e.data.landmarks)})}};
 const line=CanvasRenderingContext2D.prototype.lineTo;CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(this.canvas.id==='cv')qaDraw.push([x,y,this.lineWidth]);return line.call(this,x,y)};
 window.addEventListener('movalyt:analysis-diagnostic',e=>window.qaResult=e.detail);"""
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True)
        cases = (
            [("before", "/baseline/vercel-app/", "motion.mp4")] if args.baseline else []
        ) + [
            ("after", "/vercel-app/", "motion.mp4"),
            ("portrait", "/vercel-app/", "portrait.mp4"),
            ("rotation", "/vercel-app/", "rotation-metadata.mp4"),
            ("sideways", "/vercel-app/", "sideways.mp4"),
            ("cropped", "/vercel-app/", "cropped.mp4"),
        ]
        cases = [case for case in cases if not args.case or case[0] in args.case]
        for label, path, fixture in cases:
            assert (args.cache / fixture).exists(), fixture
            context = browser.new_context(
                viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True
            )
            context.add_init_script(INIT)
            page = context.new_page()
            page.on("pageerror", lambda e: report["uncaught_errors"].append(str(e)))
            page.goto(origin + path, wait_until="networkidle")
            page.locator("#welcomeSkip").click()
            page.evaluate("location.hash='analyze'")
            page.locator("#file").set_input_files(str(args.cache / fixture))
            page.wait_for_function("document.body.dataset.screen==='processing'")
            page.wait_for_function(
                "document.body.dataset.screen!=='processing'", timeout=120000
            )
            result = page.evaluate("window.qaResult")
            assert result is not None, label
            case = {
                "case": label,
                "fixture": fixture,
                "score": result["score"],
                "sample_count": len(result["timestamps"]),
                "decoded_size": page.locator("#v").evaluate(
                    "(v)=>[v.videoWidth,v.videoHeight]"
                ),
                "timeline": result.get("timeline"),
            }
            page.evaluate("location.hash='replay'")
            page.wait_for_timeout(100)
            # Exactly 2.05 seconds on the same moving fixture in before/after.
            t = 2.05
            stamps = [item["actual"] for item in result["timestamps"]]
            index = min(range(len(stamps)), key=lambda i: abs(stamps[i] - t))
            assert abs(stamps[index] - t) < 0.06
            page.locator("#scrub").evaluate(
                '(slider,index)=>{slider.value=index;slider.dispatchEvent(new Event("input"))}',
                index,
            )
            page.wait_for_timeout(200)
            assert (
                abs(page.locator("#v").evaluate("(v)=>v.currentTime") - stamps[index])
                < 0.05
            )
            page.screenshot(path=str(args.out / f"overlay-{label}-390.png"))
            if label == "after":
                page.evaluate("location.hash='results'")
                page.wait_for_timeout(800)
                page.screenshot(path=str(args.out / "results-after-390.png"))
                page.evaluate("location.hash='replay'")
                page.wait_for_timeout(150)
                page.screenshot(
                    path=str(args.out / "feedback-after-full-390.png"), full_page=True
                )
                assert page.locator("#coachDrills article").count() == 2
                assert page.locator("#coachDrills").evaluate(
                    '(el)=>el.closest("details").open'
                )
                assert page.locator("#playerInsights").is_visible()
                page.locator("#showAngles").check()
                assert page.locator("#jointMetrics p").count() > 0
                page.locator("#showAngles").uncheck()
            # At an exact sample, all drawn segment endpoints stay within the small
            # display-only filter displacement of actual inference outputs.
            poses = page.evaluate("window.qaPose")
            assert len(poses) == case["sample_count"]
            page.evaluate("qaDraw=[]")
            page.locator("#showSkeleton").uncheck()
            assert page.evaluate("qaDraw.length") == 0
            page.locator("#showSkeleton").check()
            draws = page.evaluate("qaDraw")
            raw = poses[index]
            w, h = case["decoded_size"]
            if label != "before" and raw and draws:
                points = [(q["x"] * w, q["y"] * h) for q in raw if q["v"] >= 0.5]
                errors = [
                    min(((x - a) ** 2 + (y - b) ** 2) ** 0.5 for a, b in points)
                    for x, y, _ in draws
                ]
                assert max(errors) < max(w, h) * 0.025, (label, max(errors))
                case["max_endpoint_distance_from_measured_pixels"] = max(errors)
                case["source_line_width_pixels"] = draws[0][2]
            case["visible_lines"] = len(draws)
            if result["score"] is None:
                assert (
                    page.locator("#replaySec .back").get_attribute("href") == "#analyze"
                )
                page.evaluate("location.hash='results'")
                page.wait_for_timeout(80)
                assert page.evaluate("document.body.dataset.screen") == "replay"
                assert not page.locator("#ringScore").inner_text()
                case["unscored_results_route_guard"] = True
            for width, height in [(320, 640), (430, 932)]:
                page.set_viewport_size({"width": width, "height": height})
                page.locator("#showSkeleton").uncheck()
                page.locator("#showSkeleton").check()
                assert not page.evaluate(
                    "document.documentElement.scrollWidth>innerWidth"
                )
                page.screenshot(path=str(args.out / f"overlay-{label}-{width}.png"))
            if label != "before" and case["timeline"]:
                assert (
                    case["timeline"]["ending"]["kind"] != "possible-balance-loss"
                ), "The public handstand-walking fixture is not a labeled fall"
            report["cases"].append(case)
            context.close()
        assert not report["uncaught_errors"], report["uncaught_errors"]
        if args.baseline and not args.case:
            assert report["cases"][0]["score"] == report["cases"][1]["score"] == 71
        rotation = next((c for c in report["cases"] if c["case"] == "rotation"), None)
        if rotation:
            assert rotation["decoded_size"] == [400, 720]
        # True sideways pixels may be unrecognizable; record rather than invent pose.
        browser.close()
except Exception as e:
    report["failed"].append(str(e))
    raise
finally:
    (
        args.out
        / (
            "overlay-" + "-".join(args.case) + "-report.json"
            if args.case
            else "overlay-report.json"
        )
    ).write_text(json.dumps(report, indent=2) + "\n")
    server.shutdown()
    server.server_close()
print(
    json.dumps(
        {
            "passed_cases": len(report["cases"]),
            "failed": report["failed"],
            "uncaught": report["uncaught_errors"],
        },
        indent=2,
    )
)
