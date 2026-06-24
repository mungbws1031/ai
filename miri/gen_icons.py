#!/usr/bin/env python3
"""Generate 미리 PWA icons (pure stdlib, no PIL).

Warm working-mom tone: off-white field, SU-red point circle with a soft
'bell/reminder' dot. Run from the miri/ dir: python3 gen_icons.py
"""
import zlib
import struct


def hex_rgb(h):
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


CREAM = hex_rgb("FBF8F4")
POINT = hex_rgb("C8453B")
POINT_SOFT = hex_rgb("F6E4E0")
WHITE = (255, 255, 255)


def make_icon(size):
    cx = cy = size / 2.0
    r_outer = size * 0.40
    r_inner = size * 0.30
    # small reminder dot top-right of inner circle
    dot_cx = cx + r_inner * 0.55
    dot_cy = cy - r_inner * 0.55
    dot_r = size * 0.085

    def inside(px, py, ox, oy, rr):
        return (px - ox) ** 2 + (py - oy) ** 2 <= rr * rr

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            px, py = x + 0.5, y + 0.5
            if inside(px, py, dot_cx, dot_cy, dot_r):
                col = POINT
            elif inside(px, py, cx, cy, r_inner):
                col = POINT_SOFT
            elif inside(px, py, cx, cy, r_outer):
                col = POINT
            else:
                col = CREAM
            raw.extend(col)
    return raw


def write_png(path, size):
    raw = make_icon(size)

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)  # 8-bit RGB
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)
    print("wrote", path, size)


if __name__ == "__main__":
    write_png("public/icon-192.png", 192)
    write_png("public/icon-512.png", 512)
