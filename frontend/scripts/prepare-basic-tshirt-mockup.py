#!/usr/bin/env python3
"""کراپ دقیق دور تیشرت → mockup مربع، mask، نسخه مشکی"""
from __future__ import annotations

import colorsys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "mockups" / "basic"
REPO_IMAGE = ROOT.parent.parent / "image.png"
SIZE = 1000
BLACK_HEX = "#1a1a20"

# نسبت کراپ دور تیشرت (برای عکس روی چوب سفید — image.png)
CROP_X1 = 0.265
CROP_Y1 = 0.055
CROP_X2 = 0.672
CROP_Y2 = 0.865
CROP_PAD = 0.02


def _source_path() -> Path:
    for name in ("tshirt-source.png", "tshirt-source.jpg", "tshirt-source.webp"):
        p = OUT / name
        if p.exists():
            return p
    if REPO_IMAGE.exists():
        return REPO_IMAGE
    raise SystemExit("منبع mockup یافت نشد — image.png یا tshirt-source.png را قرار دهید")


def _is_fabric_pixel(r: int, g: int, b: int, y: int, h: int) -> int:
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    _, sat, _ = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)

    if g > r + 20 and g > b + 12 and sat > 0.12:
        return 0
    if y < h * 0.12 and r > 90 and g > 60 and b < 110 and r - b > 15:
        return 0
    if lum > 145 and sat < 0.22:
        return 255
    if lum > 105 and sat < 0.15:
        return 180
    return 0


def _fabric_mask(im: Image.Image) -> Image.Image:
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    mp = mask.load()
    px = im.load()
    for y in range(h):
        for x in range(w):
            mp[x, y] = _is_fabric_pixel(*px[x, y], y, h)
    mask = mask.filter(ImageFilter.MaxFilter(3))
    return mask.filter(ImageFilter.GaussianBlur(1.2))


def _crop_shirt(im: Image.Image) -> Image.Image:
    w, h = im.size
    x1 = int(w * CROP_X1)
    y1 = int(h * CROP_Y1)
    x2 = int(w * CROP_X2)
    y2 = int(h * CROP_Y2)

    cx, cy = (x1 + x2) // 2, (y1 + y2) // 2
    side = int(max(x2 - x1, y2 - y1) * (1 + CROP_PAD))
    x1 = max(0, cx - side // 2)
    y1 = max(0, cy - side // 2)
    x2 = min(w, x1 + side)
    y2 = min(h, y1 + side)
    if x2 - x1 < side:
        x1 = max(0, x2 - side)
    if y2 - y1 < side:
        y1 = max(0, y2 - side)

    return im.crop((x1, y1, x2, y2))


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _tint_fabric(base: Image.Image, mask: Image.Image, color_hex: str, strength: float) -> Image.Image:
    tint_layer = Image.new("RGB", base.size, _hex_to_rgb(color_hex))
    tinted = Image.composite(tint_layer, base, mask)
    return Image.blend(base, tinted, strength)


def main() -> None:
    src = _source_path()
    im = Image.open(src).convert("RGB")

    cropped = _crop_shirt(im)
    canvas = cropped.resize((SIZE, SIZE), Image.Resampling.LANCZOS)
    mask = _fabric_mask(canvas)
    mask = mask.filter(ImageFilter.GaussianBlur(0.8))

    gray = canvas.convert("L")
    shadow = ImageEnhance.Brightness(ImageOps.invert(gray).filter(ImageFilter.GaussianBlur(5))).enhance(0.35)

    canvas.save(OUT / "tshirt-photo.jpg", quality=90, optimize=True)
    mask.save(OUT / "tshirt-mask.png", optimize=True)
    shadow.convert("RGB").save(OUT / "tshirt-shadow.jpg", quality=85, optimize=True)

    black = _tint_fabric(canvas, mask, BLACK_HEX, 0.84)
    black.save(OUT / "tshirt-photo-black.jpg", quality=90, optimize=True)

    print(f"✓ cropped {cropped.size[0]}x{cropped.size[1]} → {SIZE}x{SIZE}")


if __name__ == "__main__":
    main()
