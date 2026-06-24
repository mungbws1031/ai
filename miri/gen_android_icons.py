#!/usr/bin/env python3
"""Generate 미리 Android launcher icons into the native res dirs (pure stdlib).

Overwrites Capacitor's default icon with the 미리 brand mark across all densities:
  mipmap-<d>/ic_launcher.png           legacy square (cream + mark)
  mipmap-<d>/ic_launcher_round.png     round (cream disc + mark)
  mipmap-<d>/ic_launcher_foreground.png  adaptive foreground (transparent + mark)
and sets the adaptive background color to cream.

Run from miri/ after `npx cap add android`:  python3 gen_android_icons.py
"""
import os
import zlib
import struct


def hex_rgb(h):
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


CREAM = hex_rgb("FBF8F4")
POINT = hex_rgb("C8453B")
POINT_SOFT = hex_rgb("F6E4E0")
RES = "android/app/src/main/res"

# density -> (legacy launcher px, adaptive foreground px @108dp)
DENSITIES = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}


def write_png(path, size, raw):
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def render(size, mark_frac, shape):
    """shape: 'square' (cream fill), 'round' (cream disc), 'fg' (transparent)."""
    cx = cy = size / 2.0 + 0.5
    scale = size * mark_frac
    r_outer, r_inner = scale, scale * 0.74
    dot_cx, dot_cy, dot_r = cx + r_inner * 0.55, cy - r_inner * 0.55, scale * 0.21
    disc_r = size * 0.5

    def ins(px, py, ox, oy, rr):
        return (px - ox) ** 2 + (py - oy) ** 2 <= rr * rr

    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            if ins(px, py, dot_cx, dot_cy, dot_r):
                raw.extend((*POINT, 255))
            elif ins(px, py, cx, cy, r_inner):
                raw.extend((*POINT_SOFT, 255))
            elif ins(px, py, cx, cy, r_outer):
                raw.extend((*POINT, 255))
            elif shape == "square":
                raw.extend((*CREAM, 255))
            elif shape == "round" and ins(px, py, cx, cy, disc_r):
                raw.extend((*CREAM, 255))
            else:
                raw.extend((0, 0, 0, 0))
    return raw


def main():
    for d, (legacy, fg) in DENSITIES.items():
        base = os.path.join(RES, f"mipmap-{d}")
        os.makedirs(base, exist_ok=True)
        write_png(os.path.join(base, "ic_launcher.png"), legacy, render(legacy, 0.40, "square"))
        write_png(os.path.join(base, "ic_launcher_round.png"), legacy, render(legacy, 0.40, "round"))
        # adaptive foreground: mark kept inside the 66% safe zone of the 108dp canvas
        write_png(os.path.join(base, "ic_launcher_foreground.png"), fg, render(fg, 0.22, "fg"))
        print("wrote", d, legacy, fg)

    # adaptive background → cream
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w") as f:
        f.write(
            '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
            '    <color name="ic_launcher_background">#FBF8F4</color>\n</resources>\n'
        )
    print("set background color → #FBF8F4")


if __name__ == "__main__":
    main()
