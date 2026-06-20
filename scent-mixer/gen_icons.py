#!/usr/bin/env python3
"""Generate PWA icons (pure stdlib, no PIL). Draws a perfume bottle on a gradient."""
import zlib, struct, math

def lerp(a, b, t): return a + (b - a) * t

def make_icon(size):
    s = size / 512.0
    # palette
    g0 = (0xc0, 0x8b, 0xff)  # top-left  accent (purple)
    g1 = (0x5b, 0x8c, 0xff)  # bottom-right (blue)
    white = (245, 240, 255)

    def rrect(px, py, x0, y0, x1, y1, r):
        if x0 <= px <= x1 and y0 <= py <= y1:
            # rounded corners
            for cx, cy in ((x0+r,y0+r),(x1-r,y0+r),(x0+r,y1-r),(x1-r,y1-r)):
                in_x = (px < x0+r and cx==x0+r) or (px > x1-r and cx==x1-r)
                in_y = (py < y0+r and cy==y0+r) or (py > y1-r and cy==y1-r)
                if in_x and in_y:
                    return (px-cx)**2 + (py-cy)**2 <= r*r
            return True
        return False

    def circle(px, py, cx, cy, r):
        return (px-cx)**2 + (py-cy)**2 <= r*r

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            t = (x + y) / (2.0 * size)          # diagonal gradient
            bg = (int(lerp(g0[0], g1[0], t)),
                  int(lerp(g0[1], g1[1], t)),
                  int(lerp(g0[2], g1[2], t)))
            r, g, b, a = bg[0], bg[1], bg[2], 255

            X, Y = x / s, y / s  # work in 512 space
            on = False
            # bottle body
            if rrect(X, Y, 176, 212, 336, 432, 34): on = True
            # neck
            elif 232 <= X <= 280 and 176 <= Y <= 214: on = True
            # cap
            elif rrect(X, Y, 220, 142, 292, 180, 10): on = True
            if on:
                r, g, b = white
            else:
                # spray droplets (upper-right)
                for cx, cy, rr in ((360,150,16),(398,118,11),(338,108,8)):
                    if circle(X, Y, cx, cy, rr):
                        r, g, b = white; break

            # liquid accent line inside bottle (subtle)
            if rrect(X, Y, 176, 330, 336, 432, 34):
                # tint lower body with a touch of color
                r = int(lerp(r, g0[0], 0.18)); g = int(lerp(g, g0[1], 0.18)); b = int(lerp(b, g1[2], 0.18))

            raw += bytes((r, g, b, a))

    # assemble PNG
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

for sz in (192, 512):
    with open(f"scent-mixer/icon-{sz}.png", "wb") as f:
        f.write(make_icon(sz))
    print(f"wrote scent-mixer/icon-{sz}.png")
