"""Prepare pinned public motion/model fixtures for UI QA; no personal footage or generated poses."""
import hashlib,json,shutil,subprocess
from pathlib import Path
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1];CACHE=ROOT.parent/'movalyt-test-cache';CACHE.mkdir(exist_ok=True)
vision=ROOT/'mobile/node_modules/@mediapipe/tasks-vision'
if not vision.exists():raise SystemExit('Run npm ci --prefix mobile first (MediaPipe 0.10.14).')
if json.loads((vision/'package.json').read_text())['version']!='0.10.14':raise SystemExit('Unexpected MediaPipe version')
shutil.copytree(vision,CACHE/'vendor/vision/package',dirs_exist_ok=True)
def fetch(path,url,expected):
 if not path.exists():
  path.parent.mkdir(parents=True,exist_ok=True)
  with urlopen(url,timeout=60) as response:path.write_bytes(response.read())
 if hashlib.sha256(path.read_bytes()).hexdigest()!=expected:raise SystemExit('Checksum mismatch: '+str(path))
model_url='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
video_url='https://huggingface.co/datasets/sumith2425/UCF101/resolve/main/test/HandstandWalking/v_HandstandWalking_g04_c01.avi'
model_sha='59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a'
video_sha='7862ce384b0b15cbcda5d6741b5294933deec9635f54b0339793f19049458539'
fetch(CACHE/'vendor/model/package/pose_landmarker_lite.task',model_url,model_sha)
fetch(CACHE/'source.avi',video_url,video_sha)
if not (CACHE/'motion.mp4').exists():subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(CACHE/'source.avi'),'-vf','scale=480:-2','-an','-c:v','libx264','-pix_fmt','yuv420p',str(CACHE/'motion.mp4')],check=True)
if not (CACHE/'no-pose.mp4').exists():subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=black:s=480x360:r=10:d=1','-c:v','libx264','-pix_fmt','yuv420p',str(CACHE/'no-pose.mp4')],check=True)
print(json.dumps({'model':{'url':model_url,'sha256':model_sha},'motion':{'url':video_url,'sha256':video_sha,'derivative':'480px H.264, no audio, no frame or timing changes'},'negative':'solid-color generated clip, no body'},indent=2))
