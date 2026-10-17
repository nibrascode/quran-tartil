#!/usr/bin/env python3
"""Generates every app icon from assets/icon-source.jpg (run: python3 scripts/make-icons.py). Needs Pillow + numpy.
Outputs are committed: public/ (PWA, favicon, apple-touch) and assets/android-res/ (launcher, adaptive, splash), copied by scripts/android-setup.sh."""
import os, numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (6, 25, 58)  # #06193a, sampled from the art's dark blue
src = Image.open(os.path.join(ROOT, "assets/icon-source.jpg")).convert("RGB")
a = np.asarray(src).astype(float)
# content (gold book, arch, waves, check) = pixels that are warm; the navy art/background is cool. Soft alpha keeps glows.
warm = (a[..., 0] + a[..., 1]) / 2 - a[..., 2]
alpha = np.clip((warm - 4) / 18, 0, 1)
inner = np.zeros(alpha.shape); inner[90:960, 100:930] = 1  # ignore the rounded-square rim highlight
alpha *= inner
rgba = np.dstack([a, alpha * 255]).astype(np.uint8)
content = Image.fromarray(rgba, "RGBA")
ys, xs = np.where(alpha > 0.5)
bbox = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
cx, cy = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
R = max(np.hypot(x - cx, y - cy) for x, y in [(bbox[0], bbox[1]), (bbox[2], bbox[1]), (bbox[0], bbox[3]), (bbox[2], bbox[3])])
# real radius of the content (corners of the bbox are empty): measure from the mask
ry, rx = np.where(alpha > 0.5); R = float(np.hypot(rx - cx, ry - cy).max())

def bgimg(n, shape="square"):
    g = Image.new("RGB", (n, n), BG)
    # soft lighter centre like the art
    glow = Image.new("L", (n, n), 0); d = ImageDraw.Draw(glow); d.ellipse([n * .12, n * .06, n * .88, n * .82], fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(n * .16))
    light = Image.new("RGB", (n, n), (12, 46, 100))
    return Image.composite(light, g, glow)

def place(n, radius_frac):
    """content scaled so its farthest point sits at radius_frac*n/2 from the centre"""
    s = (radius_frac * n / 2) / R
    c = content.resize((max(1, int(content.width * s)), max(1, int(content.height * s))), Image.LANCZOS)
    layer = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    layer.alpha_composite(c, (int(n / 2 - cx * s), int(n / 2 - cy * s)))
    return layer

def full(n, radius_frac):  # opaque square icon
    b = bgimg(n).convert("RGBA"); b.alpha_composite(place(n, radius_frac)); return b.convert("RGB")
def circle(n, radius_frac):
    im = full(n, radius_frac).convert("RGBA"); m = Image.new("L", (n * 4, n * 4), 0); ImageDraw.Draw(m).ellipse([0, 0, n * 4 - 1, n * 4 - 1], fill=255)
    im.putalpha(m.resize((n, n), Image.LANCZOS)); return im
def save(img, rel):
    p = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(p), exist_ok=True); img.save(p); print(rel, img.size)

# --- Android ---
res = "assets/android-res"
for d, px in [("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]:
    save(full(px * 4, 1.06).resize((px, px), Image.LANCZOS), f"{res}/mipmap-{d}/ic_launcher.png")      # legacy: full-bleed square art
    save(circle(px * 4, 0.9).resize((px, px), Image.LANCZOS), f"{res}/mipmap-{d}/ic_launcher_round.png")
for d, px in [("mdpi", 108), ("hdpi", 162), ("xhdpi", 216), ("xxhdpi", 324), ("xxxhdpi", 432)]:
    # adaptive foreground: content inside the 66dp safe circle of the 108dp canvas (radius 33dp = 0.611 of half-width)
    save(place(px * 4, 0.60).resize((px, px), Image.LANCZOS), f"{res}/mipmap-{d}/ic_launcher_foreground.png")
os.makedirs(os.path.join(ROOT, res, "values"), exist_ok=True)
open(os.path.join(ROOT, res, "values/ic_launcher_background.xml"), "w").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#06193A</color>\n</resources>\n')
# splash: navy + centred art (loaded through a layer-list drawable, never stretched)
save(full(1024, 1.1).resize((512, 512), Image.LANCZOS), f"{res}/drawable-nodpi/splash_icon.png") if False else save(place(1024, 0.9).resize((512, 512), Image.LANCZOS), f"{res}/drawable-nodpi/splash_icon.png")
open(os.path.join(ROOT, res, "values/splash_colors.xml"), "w").write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="splash_bg">#06193A</color>\n</resources>\n')
os.makedirs(os.path.join(ROOT, res, "drawable"), exist_ok=True)
open(os.path.join(ROOT, res, "drawable/splash.xml"), "w").write('<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n    <item android:drawable="@color/splash_bg" />\n    <item>\n        <bitmap android:src="@drawable/splash_icon" android:gravity="center" />\n    </item>\n</layer-list>\n')

# --- PWA / web ---
save(full(1536, 1.06).resize((192, 192), Image.LANCZOS), "public/icon-192.png")
save(full(2048, 1.06).resize((512, 512), Image.LANCZOS), "public/icon-512.png")
save(full(2048, 0.78).resize((512, 512), Image.LANCZOS), "public/icon-maskable-512.png")  # content inside the 80% safe zone
save(full(1440, 1.0).resize((180, 180), Image.LANCZOS), "public/apple-touch-icon.png")
save(full(1280, 1.0).resize((32, 32), Image.LANCZOS), "public/favicon-32.png")
fav = [full(1280, 1.0).resize((s, s), Image.LANCZOS) for s in (16, 32, 48)]
fav[2].save(os.path.join(ROOT, "public/favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48)], append_images=fav[:2]); print("public/favicon.ico")
# square SVG-free fallback source for docs
