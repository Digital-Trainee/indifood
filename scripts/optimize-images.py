"""Run manually after replacing source images: python scripts/optimize-images.py.

Requires Pillow with WebP support. Generated files are committed so deployment
does not need Python. Source artwork and social preview images stay intact.
"""
import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets/data/products.js"
config = json.loads(DATA.read_text(encoding="utf-8").split("window.INDIFOOD =", 1)[1].strip().rstrip(";"))
sources = {product["image"]: (160, 480, 960) for product in config["products"]}
sources.update({
    "assets/images/banana-chips.png": (768, 1536),
    "assets/images/banana-chips-story.png": (768, 1536),
    "assets/images/indifood-logo.jpg": (384, 768),
})
manifest = {}
original_total = optimized_total = 0
for source, widths in sources.items():
    file = ROOT / source
    variants = []
    with Image.open(file) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        for requested_width in widths:
            width = min(requested_width, image.width)
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            resized.save(buffer, "WEBP", quality=84, method=6)
            content = buffer.getvalue()
            digest = hashlib.sha256(content).hexdigest()[:12]
            target = file.with_name(f"{file.stem}-{width}.{digest}.webp")
            target.write_bytes(content)
            variants.append((target.relative_to(ROOT).as_posix(), width, len(content)))
        manifest[source] = {
            "src": variants[-1][0],
            "srcset": ", ".join(f"{name} {width}w" for name, width, _ in variants),
            "width": image.width,
            "height": image.height,
        }
        original_total += file.stat().st_size
        optimized_total += variants[-1][2]
        print(f"{file.name}: {file.stat().st_size:,} -> {variants[-1][2]:,} bytes")
config["images"] = manifest
DATA.write_text("'use strict';\nwindow.INDIFOOD = " + json.dumps(config, indent=2, ensure_ascii=False) + ";\n", encoding="utf-8")
print(f"Total full-size image bytes: {original_total:,} -> {optimized_total:,} ({100 * (1 - optimized_total / original_total):.1f}% smaller)")
