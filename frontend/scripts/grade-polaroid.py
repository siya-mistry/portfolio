#!/usr/bin/env python3
"""
grade-polaroid.py — bake the portfolio's polaroid film grade into a photo.

The "filter" on the scrapbook polaroids (warm, faded, slightly desaturated rose
tone) isn't a CSS filter — it's baked into each .webp. This reproduces that look
on a new photo by histogram-matching its per-channel color distribution to the
existing graded polaroids (edu1/edu2 by default), then blending back a little of
the original so greys/skies don't over-tint.

Output is a square webp sized for the <Polaroid> card (default 760x760).

Usage:
  python3 scripts/grade-polaroid.py INPUT OUTPUT
  python3 scripts/grade-polaroid.py IMG.HEIC public/media/exp/edu4.webp --crop 0 60 3213 3273
  python3 scripts/grade-polaroid.py photo.jpg out.webp --size 760 --strength 0.85

Options:
  --crop L T R B   crop box in source pixels (left top right bottom) before grading
  --size N         output square size in px (default 760)
  --strength F     0..1 how far toward the matched look (default 0.85; lower = subtler)
  --ref A B ...    reference graded polaroids to match (default edu1.webp edu2.webp)

Notes:
  - .heic/.HEIC inputs are converted via macOS `sips` automatically.
  - Run from the frontend/ directory so the default --ref paths resolve.
"""
import argparse
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image

# Pillow >=9.1 moved resampling filters under Image.Resampling; fall back for older.
LANCZOS = getattr(getattr(Image, "Resampling", Image), "LANCZOS")

HERE = os.path.dirname(os.path.abspath(__file__))
EXP = os.path.join(HERE, "..", "public", "media", "exp")
DEFAULT_REF = [os.path.join(EXP, "edu1.webp"), os.path.join(EXP, "edu2.webp")]


def load_rgb(path: str) -> Image.Image:
    """Open an image as RGB; transparently convert HEIC via macOS sips."""
    ext = os.path.splitext(path)[1].lower()
    if ext in (".heic", ".heif"):
        tmp = tempfile.NamedTemporaryFile(suffix=".png", delete=False).name
        subprocess.run(
            ["sips", "-s", "format", "png", path, "--out", tmp],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        img = Image.open(tmp).convert("RGB")
        os.unlink(tmp)
        return img
    return Image.open(path).convert("RGB")


def center_square(im: Image.Image) -> Image.Image:
    w, h = im.size
    s = min(w, h)
    left = (w - s) // 2
    top = (h - s) // 2
    return im.crop((left, top, left + s, top + s))


def match_channel(s: np.ndarray, r: np.ndarray) -> np.ndarray:
    """Histogram-match flat array s to the distribution of flat array r (uint8)."""
    s_vals, s_idx, s_cnt = np.unique(s, return_inverse=True, return_counts=True)
    r_vals, r_cnt = np.unique(r, return_counts=True)
    s_cdf = np.cumsum(s_cnt).astype(np.float64); s_cdf /= s_cdf[-1]
    r_cdf = np.cumsum(r_cnt).astype(np.float64); r_cdf /= r_cdf[-1]
    mapped = np.interp(s_cdf, r_cdf, r_vals)
    return mapped[s_idx]


def grade(src: np.ndarray, ref: np.ndarray, strength: float) -> np.ndarray:
    out = np.zeros_like(src, dtype=np.float64)
    for c in range(3):
        out[..., c] = match_channel(src[..., c].ravel(), ref[..., c].ravel()).reshape(src.shape[:2])
    blended = strength * out + (1.0 - strength) * src
    return np.clip(blended, 0, 255).astype(np.uint8)


def main() -> None:
    ap = argparse.ArgumentParser(description="Bake the polaroid film grade into a photo.")
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--crop", type=int, nargs=4, metavar=("L", "T", "R", "B"))
    ap.add_argument("--size", type=int, default=760)
    ap.add_argument("--strength", type=float, default=0.85)
    ap.add_argument("--ref", nargs="+", default=DEFAULT_REF)
    args = ap.parse_args()

    ref = np.concatenate(
        [np.asarray(load_rgb(p)).reshape(-1, 3) for p in args.ref], axis=0
    )

    im = load_rgb(args.input)
    if args.crop:
        im = im.crop(tuple(args.crop))
    im = center_square(im).resize((args.size, args.size), LANCZOS)

    res = grade(np.asarray(im), ref, args.strength)
    Image.fromarray(res).save(args.output, "WEBP", quality=92, method=6)
    print(f"wrote {args.output}  ({args.size}x{args.size}, strength {args.strength})")


if __name__ == "__main__":
    main()
