#!/usr/bin/env python3
"""Generate Eddie PWA icons (pure stdlib, no PIL). Draws the Eddie chick on a teal gradient."""
import zlib, struct

def lerp(a, b, t): return a + (b - a) * t

def make_icon(size):
    s = size / 512.0
    # palette (brand teal)
    g0 = (0x5c, 0xb8, 0xb0)  # top-left
    g1 = (0x2f, 0x7d, 0x7d)  # bottom-right
    chick = (0xff, 0xd5, 0x4a)   # yellow body
    beak = (0xff, 0x9e, 0x3d)    # orange beak
    eye = (0x2b, 0x2b, 0x2b)

    def circle(px, py, cx, cy, r):
        return (px - cx) ** 2 + (py - cy) ** 2 <= r * r

    def tri_beak(px, py):
        # downward triangle beak around (256, 300), width ~46, height ~34
        if 300 <= py <= 334:
            half = 23 * (1 - (py - 300) / 34.0)
            return 256 - half <= px <= 256 + half
        return False

    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 per row
        for x in range(size):
            t = (x + y) / (2.0 * size)  # diagonal gradient
            r = int(lerp(g0[0], g1[0], t))
            g = int(lerp(g0[1], g1[1], t))
            b = int(lerp(g0[2], g1[2], t))

            X, Y = x / s, y / s  # work in 512 space
            # chick body (big circle)
            if circle(X, Y, 256, 280, 150):
                r, g, b = chick
            # tuft on head
            if circle(X, Y, 256, 138, 16) or circle(X, Y, 232, 150, 12) or circle(X, Y, 280, 150, 12):
                r, g, b = chick
            # eyes
            if circle(X, Y, 222, 250, 17) or circle(X, Y, 290, 250, 17):
                r, g, b = eye
            # eye highlight
            if circle(X, Y, 228, 244, 6) or circle(X, Y, 296, 244, 6):
                r, g, b = (255, 255, 255)
            # beak
            if tri_beak(X, Y):
                r, g, b = beak

            raw += bytes((r, g, b, 255))

    # build PNG
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")

if __name__ == "__main__":
    import os
    out = os.path.join(os.path.dirname(__file__), "public")
    os.makedirs(out, exist_ok=True)
    for sz in (192, 512):
        with open(os.path.join(out, f"icon-{sz}.png"), "wb") as f:
            f.write(make_icon(sz))
        print(f"wrote public/icon-{sz}.png")
    # apple touch icon (180)
    with open(os.path.join(out, "apple-touch-icon.png"), "wb") as f:
        f.write(make_icon(180))
    print("wrote public/apple-touch-icon.png")
