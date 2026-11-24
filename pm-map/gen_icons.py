#!/usr/bin/env python3
"""Generate PWA icons (pure stdlib, no PIL): a 4x4 competency grid, amber tiles on dark,
two tiles outlined in blue as the "this task needs" highlight. Run from the repo root."""
import zlib, struct

BG = (0x12, 0x13, 0x15)
AMBER = (0xf0, 0x8a, 0x2e)
DIM = (0x4a, 0x2c, 0x12)
BLUE = (0x5b, 0x93, 0xff)
# level per cell (row-major): 0 = dim, 1 = amber
LEVEL = [1, 1, 0, 1,
         1, 0, 1, 1,
         0, 1, 1, 0,
         1, 1, 0, 1]
NEED = {5, 10}  # outlined cells

def make_icon(size):
    s = size / 512.0
    pad, gap = 96, 16
    cell = (512 - 2 * pad - 3 * gap) / 4
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            X, Y = x / s, y / s
            col = BG
            cx, cy = (X - pad) / (cell + gap), (Y - pad) / (cell + gap)
            if 0 <= cx < 4 and 0 <= cy < 4:
                i, j = int(cx), int(cy)
                ox = X - pad - i * (cell + gap)
                oy = Y - pad - j * (cell + gap)
                k = j * 4 + i
                if k in NEED and -8 <= ox <= cell + 8 and -8 <= oy <= cell + 8 and not (0 <= ox <= cell and 0 <= oy <= cell):
                    col = BLUE
                if 0 <= ox <= cell and 0 <= oy <= cell:
                    col = AMBER if LEVEL[k] else DIM
                    if k in NEED and (ox < 8 or oy < 8 or ox > cell - 8 or oy > cell - 8):
                        col = BLUE
            raw += bytes((*col, 255))

    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")

for sz in (192, 512):
    with open(f"pm-map/icon-{sz}.png", "wb") as f:
        f.write(make_icon(sz))
    print(f"wrote pm-map/icon-{sz}.png")
