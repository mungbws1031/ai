#!/usr/bin/env python3
"""Generate PWA icons for 티켓팅 가상 연습 (pure stdlib, no PIL).

Motif: a golden ticket with a perforation line + notches and a small seat grid,
on the app's dark navy background.
"""
import zlib, struct


def lerp(a, b, t):
    return a + (b - a) * t


def make_icon(size):
    s = size / 512.0
    bg_top = (0x14, 0x18, 0x2c)
    bg_bot = (0x23, 0x2a, 0x4d)
    gold = (0xe0, 0xa8, 0x2e)
    accent = (0x5b, 0x8c, 0xff)
    dark = (0x0f, 0x12, 0x20)
    white = (0xe8, 0xeb, 0xf5)

    def rrect(px, py, x0, y0, x1, y1, r):
        if not (x0 <= px <= x1 and y0 <= py <= y1):
            return False
        for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
            in_x = (px < x0 + r and cx == x0 + r) or (px > x1 - r and cx == x1 - r)
            in_y = (py < y0 + r and cy == y0 + r) or (py > y1 - r and cy == y1 - r)
            if in_x and in_y:
                return (px - cx) ** 2 + (py - cy) ** 2 <= r * r
        return True

    def circle(px, py, cx, cy, r):
        return (px - cx) ** 2 + (py - cy) ** 2 <= r * r

    perf = 300  # x of perforation line

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            X, Y = x / s, y / s  # work in 512 space
            t = Y / 512.0
            r = int(lerp(bg_top[0], bg_bot[0], t))
            g = int(lerp(bg_top[1], bg_bot[1], t))
            b = int(lerp(bg_top[2], bg_bot[2], t))

            in_body = rrect(X, Y, 96, 168, 416, 344, 26)
            # notches cut the perforation line at top & bottom edges
            cut = circle(X, Y, perf, 168, 24) or circle(X, Y, perf, 344, 24)
            if in_body and not cut:
                if X < perf:
                    r, g, b = gold          # main ticket
                else:
                    r, g, b = accent        # stub
                # perforation dashes
                if abs(X - perf) < 5 and (int(Y // 26) % 2 == 0):
                    r, g, b = dark
                # seat grid on the main part (3 x 4 dots)
                for sy in (236, 276):
                    for sx in (150, 192, 234):
                        if abs(X - sx) < 11 and abs(Y - sy) < 11:
                            r, g, b = dark
                # a small star on the stub
                if circle(X, Y, 360, 256, 9):
                    r, g, b = white

            raw += bytes((r, g, b, 255))

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)  # RGBA
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    for sz in (192, 512):
        with open(os.path.join(here, f"icon-{sz}.png"), "wb") as f:
            f.write(make_icon(sz))
        print(f"wrote site/icon-{sz}.png")
