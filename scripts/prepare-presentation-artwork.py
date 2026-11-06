"""Title-free derivatives for analysis views; PR #41 catalog assets remain untouched."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'vercel-app'
OUT = ROOT / 'assets/presentation'
BOUNDS = {'advanced-tuck-planche': .80, 'tuck-planche': .73,
          'banded-full-front-lever': .79, 'one-leg-planche': .73,
          'planche-lean': .70, 'one-leg-l-sit': .78,
          'super-advanced-tuck-planche': .76, 'one-leg-front-lever': .79,
          'straddle-planche': .72, 'tuck-l-sit': .78,
          'super-advanced-tuck-front-lever': .85,
          'banded-full-planche': .80, 'tuck-front-lever': .74}

def main():
    OUT.mkdir(exist_ok=True)
    manifest = []
    for name, boundary in BOUNDS.items():
        source = ROOT / f'assets/anatomy/{name}.webp'
        image = Image.open(source).convert('RGB')
        width, height = image.size
        body = image.crop((0, 0, width, int(height * boundary)))
        bounds = body.convert('L').point(lambda value: 255 if value > 42 else 0).getbbox()
        box = (max(0, bounds[0] - 12), max(0, bounds[1] - 12),
               min(width, bounds[2] + 12), min(body.height, bounds[3] + 12))
        crop = image.crop(box)
        output = OUT / f'{name}.webp'
        crop.save(output, 'WEBP', quality=92, method=6)
        manifest.append({'source': str(source.relative_to(ROOT)),
                         'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                         'crop': list(box), 'output': str(output.relative_to(ROOT)),
                         'size': list(crop.size)})
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')

if __name__ == '__main__':
    main()
