#!/usr/bin/env python3
"""Gera os ícones do PWA da Resoluta Finance usando a paleta da marca (bordo + dourado).

Uso:
    python3 tools/make_icons.py

Saída: arquivos PNG em icons/
"""
import os
from PIL import Image, ImageDraw, ImageFont

# Paleta da marca (extraída da logo Resoluta)
C_TOP = (122, 31, 61)      # bordo/vinho
C_BOTTOM = (78, 18, 40)    # bordo escuro
C_ACCENT = (200, 162, 74)  # dourado
C_LETTER = (232, 200, 119) # dourado claro (letra R)

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT_DIR, exist_ok=True)


def find_font(size):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def vertical_gradient(size, top, bottom):
    grad = Image.new("RGB", (1, size), top)
    for y in range(size):
        t = y / max(size - 1, 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        grad.putpixel((0, y), (r, g, b))
    return grad.resize((size, size))


def make_icon(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = vertical_gradient(size, C_TOP, C_BOTTOM).convert("RGBA")

    if maskable:
        # fundo cobre toda a área (safe zone tratada pela plataforma)
        img = grad
        radius = 0
        inset = int(size * 0.20)
    else:
        radius = int(size * 0.22)
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
        img.paste(grad, (0, 0), mask)
        inset = int(size * 0.14)

    draw = ImageDraw.Draw(img)

    # moldura dourada fina
    pad = int(size * 0.085)
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=int(size * (0.16 if maskable else 0.14)),
        outline=C_ACCENT,
        width=max(2, int(size * 0.012)),
    )

    # Letra "R" central
    font = find_font(int(size * 0.52))
    text = "R"
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx = (size - tw) / 2 - bbox[0]
    ty = (size - th) / 2 - bbox[1]
    # sombra suave
    draw.text((tx + size * 0.012, ty + size * 0.012), text, font=font, fill=(40, 8, 20, 160))
    draw.text((tx, ty), text, font=font, fill=C_LETTER)

    # pequeno losango dourado sob a letra
    cy = int(size * 0.74)
    cx = size // 2
    d = int(size * 0.028)
    draw.polygon([(cx, cy - d), (cx + d, cy), (cx, cy + d), (cx - d, cy)], fill=C_ACCENT)

    return img


def main():
    sizes = {
        "icon-192.png": (192, False),
        "icon-512.png": (512, False),
        "icon-maskable-512.png": (512, True),
        "apple-touch-icon.png": (180, False),
        "favicon-32.png": (32, False),
        "favicon-16.png": (16, False),
    }
    for name, (size, maskable) in sizes.items():
        icon = make_icon(size, maskable=maskable)
        path = os.path.join(OUT_DIR, name)
        icon.save(path, "PNG")
        print("gerado:", path, icon.size)


if __name__ == "__main__":
    main()
