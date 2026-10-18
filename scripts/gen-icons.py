"""Génère les icônes PNG de l'app (python3 + Pillow). Usage : python3 scripts/gen-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

BG = "#09090b"
FG = "#a3e635"
OUT = Path(__file__).resolve().parent.parent / "public" / "icons"


def dumbbell(size: int, scale: float = 1.0) -> Image.Image:
    s = 4 * size  # sur-échantillonnage pour l'anti-crénelage
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    u = s / 512
    rects = [(96, 246, 416, 266, 6), (128, 176, 168, 336, 12), (344, 176, 384, 336, 12),
             (96, 204, 128, 308, 10), (384, 204, 416, 308, 10)]
    for x0, y0, x1, y1, r in rects:
        d.rounded_rectangle([x0 * u, y0 * u, x1 * u, y1 * u], radius=r * u, fill=FG)
    img = img.rotate(35, resample=Image.BICUBIC)
    if scale != 1.0:
        inner = img.resize((int(s * scale), int(s * scale)), Image.LANCZOS)
        img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        img.paste(inner, ((s - inner.width) // 2, (s - inner.height) // 2), inner)
    bg = Image.new("RGBA", (s, s), BG)
    bg.alpha_composite(img)
    return bg.resize((size, size), Image.LANCZOS).convert("RGB")


OUT.mkdir(parents=True, exist_ok=True)
dumbbell(180).save(OUT / "apple-touch-icon.png")
dumbbell(192).save(OUT / "icon-192.png")
dumbbell(512).save(OUT / "icon-512.png")
dumbbell(512, 0.7).save(OUT / "icon-maskable-512.png")
dumbbell(64).save(OUT / "favicon.png")
