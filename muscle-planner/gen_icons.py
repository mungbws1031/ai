#!/usr/bin/env python3
"""Generate PWA icons (pure stdlib, no PIL). Draws a flexed-arm style dumbbell on a teal background."""
import zlib, struct

def make_icon(size):
    s = size / 512.0
    bg = (0x0e, 0x5f, 0x57)
    fg = (240, 248, 246)
    warm = (0xe5, 0x86, 0x48)

    def rrect(X, Y, x0, y0, x1, y1, r):
        if not (x0 <= X <= x1 and y0 <= Y <= y1):
            return False
        cx = min(max(X, x0 + r), x1 - r)
        cy = min(max(Y, y0 + r), y1 - r)
        return (X - cx) ** 2 + (Y - cy) ** 2 <= r * r

    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            X, Y = x / s, y / s
            c = bg
            # dumbbell: bar + two plates on each side
            if rrect(X, Y, 150, 240, 362, 272, 10): c = fg
            if rrect(X, Y, 96, 168, 146, 344, 18) or rrect(X, Y, 366, 168, 416, 344, 18): c = fg
            if rrect(X, Y, 62, 204, 100, 308, 14) or rrect(X, Y, 412, 204, 450, 308, 14): c = fg
            # heat dot (stimulus)
            if (X - 256) ** 2 + (Y - 150) ** 2 <= 34 ** 2: c = warm
            raw += bytes((c[0], c[1], c[2], 255))

    def chunk(typ, data):
        out = struct.pack(">I", len(data)) + typ + data
        return out + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")

for sz in (192, 512):
    with open(f"muscle-planner/icon-{sz}.png", "wb") as f:
        f.write(make_icon(sz))
    print(f"wrote muscle-planner/icon-{sz}.png")
