#!/usr/bin/env python3
"""Generate @capacitor/assets source images for 미리 (pure stdlib, no PIL).

Produces, under assets/:
  icon-only.png        1024  opaque (cream field + 미리 mark)
  icon-foreground.png  1024  RGBA, transparent bg + mark (Android adaptive foreground)
  icon-background.png  1024  solid cream (Android adaptive background)
  splash.png           2732  cream + centered mark
  splash-dark.png      2732  same (light-only theme)

Then run:  npx capacitor-assets generate --android
"""
import zlib
import struct


def hex_rgb(h):
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


CREAM = hex_rgb("FBF8F4")
POINT = hex_rgb("C8453B")
POINT_SOFT = hex_rgb("F6E4E0")


def draw_mark(px, py, cx, cy, scale, bg):
    """Return RGBA tuple for pixel (px,py). The mark is a point ring with a
    soft inner disc and a small point dot top-right. `scale` = mark radius in px.
    `bg` is the background RGBA (use alpha 0 for transparent foreground)."""
    r_outer = scale
    r_inner = scale * 0.74
    dot_cx = cx + r_inner * 0.55
    dot_cy = cy - r_inner * 0.55
    dot_r = scale * 0.21

    def inside(ox, oy, rr):
        return (px - ox) ** 2 + (py - oy) ** 2 <= rr * rr

    if inside(dot_cx, dot_cy, dot_r):
        return (*POINT, 255)
    if inside(cx, cy, r_inner):
        return (*POINT_SOFT, 255)
    if inside(cx, cy, r_outer):
        return (*POINT, 255)
    return bg


def make(size, bg_rgba, mark_scale_frac):
    cx = cy = size / 2.0 + 0.5
    scale = size * mark_scale_frac
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            raw.extend(draw_mark(x + 0.5, y + 0.5, cx, cy, scale, bg_rgba))
    return raw


def write_png(path, size, raw):
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # 8-bit RGBA
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))
    print("wrote", path, size)


def solid(size, rgba):
    raw = bytearray()
    for _y in range(size):
        raw.append(0)
        for _x in range(size):
            raw.extend(rgba)
    return raw


if __name__ == "__main__":
    import os

    os.makedirs("assets", exist_ok=True)
    cream_opaque = (*CREAM, 255)
    transparent = (0, 0, 0, 0)

    # icon-only: opaque cream field, mark ~0.40r
    write_png("assets/icon-only.png", 1024, make(1024, cream_opaque, 0.40))
    # adaptive foreground: transparent bg, mark smaller (~0.30r) to survive mask crop
    write_png("assets/icon-foreground.png", 1024, make(1024, transparent, 0.30))
    # adaptive background: solid cream
    write_png("assets/icon-background.png", 1024, solid(1024, cream_opaque))
    # splash: cream field, smaller centered mark
    write_png("assets/splash.png", 2732, make(2732, cream_opaque, 0.13))
    write_png("assets/splash-dark.png", 2732, make(2732, cream_opaque, 0.13))
