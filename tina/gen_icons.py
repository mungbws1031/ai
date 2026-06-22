#!/usr/bin/env python3
"""Generate PWA icons for 티나 (pure stdlib, no PIL).

Motif: a cleared horizontal surface (the "tidy line") emerging from fog into a
clear sky, with a small sparkle — the 안개→쾌청 (fog→clear) story of the app.
"""
import zlib, struct


def lerp(a, b, t):
    return a + (b - a) * t


def make_icon(size):
    s = size / 512.0
    # palette (matches app theme)
    sky_top = (0x16, 0x25, 0x40)   # deep night blue
    sky_bot = (0x5e, 0xc8, 0xff)   # clear accent blue (lower = "cleared")
    fog = (0x9a, 0xaa, 0xca)
    white = (0xf2, 0xf7, 0xff)
    gold = (0xff, 0xcc, 0x55)

    def rrect(px, py, x0, y0, x1, y1, r):
        if x0 <= px <= x1 and y0 <= py <= y1:
            for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
                in_x = (px < x0 + r and cx == x0 + r) or (px > x1 - r and cx == x1 - r)
                in_y = (py < y0 + r and cy == y0 + r) or (py > y1 - r and cy == y1 - r)
                if in_x and in_y:
                    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
            return True
        return False

    def circle(px, py, cx, cy, r):
        return (px - cx) ** 2 + (py - cy) ** 2 <= r * r

    def star4(px, py, cx, cy, r):
        # 4-point sparkle: union of a thin vertical and horizontal diamond
        dx, dy = abs(px - cx), abs(py - cy)
        return (dx / r + dy / (r * 0.28) <= 1) or (dx / (r * 0.28) + dy / r <= 1)

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            X, Y = x / s, y / s  # work in 512 space

            # vertical sky gradient
            t = Y / 512.0
            r = int(lerp(sky_top[0], sky_bot[0], t))
            g = int(lerp(sky_top[1], sky_bot[1], t))
            b = int(lerp(sky_top[2], sky_bot[2], t))

            # fog band in the upper-middle (soft horizontal streaks)
            if 150 <= Y <= 250:
                fog_amt = 0.30 * (1 - abs(Y - 200) / 50.0)
                r = int(lerp(r, fog[0], fog_amt))
                g = int(lerp(g, fog[1], fog_amt))
                b = int(lerp(b, fog[2], fog_amt))

            # the cleared "surface line" (a clean white bar — the tidy plane)
            if rrect(X, Y, 96, 322, 416, 360, 18):
                r, g, b = white
            # subtle shadow under the surface
            elif rrect(X, Y, 96, 360, 416, 380, 10):
                r = int(lerp(r, 0, 0.18)); g = int(lerp(g, 0, 0.18)); b = int(lerp(b, 0, 0.18))

            # sun emerging top-right (clear)
            if circle(X, Y, 372, 150, 46):
                r, g, b = gold

            # sparkle above the surface (the "티 났다" pop)
            if star4(X, Y, 188, 250, 40):
                r, g, b = white
            if star4(X, Y, 300, 286, 22):
                r, g, b = gold

            raw += bytes((r, g, b, 255))

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


for sz in (192, 512):
    with open(f"tina/icon-{sz}.png", "wb") as f:
        f.write(make_icon(sz))
    print(f"wrote tina/icon-{sz}.png")
