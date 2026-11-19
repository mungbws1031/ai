#!/usr/bin/env python3
"""전자혀 안드로이드 런처 아이콘 + 스플래시 생성기 (순수 표준 라이브러리).

입력: cook/icon-512.png (RGBA/RGB 8비트 PNG)
출력: android/app/src/main/res 아래
  mipmap-<d>/ic_launcher.png            기본 사각 아이콘
  mipmap-<d>/ic_launcher_round.png      원형 아이콘
  mipmap-<d>/ic_launcher_foreground.png 적응형 아이콘 전경 (108dp 캔버스)
  values/ic_launcher_background.xml     적응형 배경색 (아이콘 가장자리에서 뽑은 주황)
  drawable*/splash.png                  스플래시 (크림 배경 + 가운데 아이콘)

`npx cap add android` 직후, 또는 아이콘을 바꿨을 때 cook/app 에서 실행:
  python3 scripts/icons.py
"""
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
SRC = os.path.join(APP, "..", "icon-512.png")
RES = os.path.join(APP, "android", "app", "src", "main", "res")

CREAM = (0xF4, 0xEE, 0xE3)  # --bg-base
ADAPTIVE_SCALE = 0.85       # 적응형 전경 글자를 캔버스 안쪽으로 줄이는 비율 (원형 마스크 여백 확보)

# density -> (legacy px, adaptive foreground px @108dp)
DENSITIES = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}


def read_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n"
    pos, idat, w = 8, b"", None
    while pos < len(d):
        n, t = struct.unpack(">I4s", d[pos:pos + 8])
        body = d[pos + 8:pos + 8 + n]
        if t == b"IHDR":
            w, h, depth, ctype, _, _, interlace = struct.unpack(">IIBBBBB", body)
            assert depth == 8 and ctype in (2, 6) and interlace == 0
        elif t == b"IDAT":
            idat += body
        pos += 12 + n
    bpp = 4 if ctype == 6 else 3
    raw = zlib.decompress(idat)
    stride = w * bpp
    rows, prev = [], bytearray(stride)
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        rows.append(line)
        prev = line
    # -> list of rows of (r,g,b,a) tuples
    img = []
    for line in rows:
        if bpp == 4:
            img.append([tuple(line[i:i + 4]) for i in range(0, stride, 4)])
        else:
            img.append([(line[i], line[i + 1], line[i + 2], 255) for i in range(0, stride, 3)])
    return w, h, img


def write_png(path, w, h, px):
    raw = bytearray()
    for row in px:
        raw.append(0)
        for r, g, b, a in row:
            raw.extend((r, g, b, a))

    def chunk(t, data):
        c = struct.pack(">I", len(data)) + t + data
        return c + struct.pack(">I", zlib.crc32(t + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) +
                chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


def resize(img, sw, sh, size):
    """size x size 로 박스(평균) 리샘플. 축소 전용(512 -> 작게)."""
    out = []
    for y in range(size):
        y0, y1 = y * sh // size, max((y + 1) * sh // size, y * sh // size + 1)
        row = []
        for x in range(size):
            x0, x1 = x * sw // size, max((x + 1) * sw // size, x * sw // size + 1)
            n = (y1 - y0) * (x1 - x0)
            s = [0, 0, 0, 0]
            for yy in range(y0, y1):
                r = img[yy]
                for xx in range(x0, x1):
                    p = r[xx]
                    for k in range(4):
                        s[k] += p[k]
            row.append(tuple(v // n for v in s))
        out.append(row)
    return out


def mask_round(px, size):
    c, r = size / 2.0, size / 2.0
    return [[p if (x + .5 - c) ** 2 + (y + .5 - c) ** 2 <= r * r else (0, 0, 0, 0)
             for x, p in enumerate(row)] for y, row in enumerate(px)]


def mask_rrect(px, size, frac=0.22):
    rad = size * frac
    out = []
    for y, row in enumerate(px):
        nr = []
        for x, p in enumerate(row):
            cx = min(max(x + .5, rad), size - rad)
            cy = min(max(y + .5, rad), size - rad)
            nr.append(p if (x + .5 - cx) ** 2 + (y + .5 - cy) ** 2 <= rad * rad else (0, 0, 0, 0))
        out.append(nr)
    return out


def edge_color(img, w, h):
    """아이콘 가장자리 한 줄 픽셀의 평균색 -> '#RRGGBB' (적응형 배경색)."""
    px = [img[0][x] for x in range(w)] + [img[h - 1][x] for x in range(w)] + \
         [img[y][0] for y in range(h)] + [img[y][w - 1] for y in range(h)]
    return "#%02X%02X%02X" % tuple(sum(p[k] for p in px) // len(px) for k in range(3))


def extract_glyph(img, w, h):
    """그라데이션 배경 위 크림색 글자만 뽑아 (크림, alpha) 레이어로 만든다.
    배경은 좌상단->우하단 선형 그라데이션으로 보고, 각 픽셀이 배경에서 크림 쪽으로 얼마나 갔는지가 alpha."""
    tl, br = img[2][2], img[h - 3][w - 3]
    cream = max((p for row in img[::4] for p in row[::4]), key=lambda p: p[0] + p[1] + p[2])[:3]
    out = []
    for y, row in enumerate(img):
        nr = []
        for x, p in enumerate(row):
            t = (x + y) / float(w + h - 2)
            bg = [tl[k] + (br[k] - tl[k]) * t for k in range(3)]
            d = [cream[k] - bg[k] for k in range(3)]
            den = sum(v * v for v in d) or 1.0
            a = sum((p[k] - bg[k]) * d[k] for k in range(3)) / den
            a = min(1.0, max(0.0, a))
            nr.append((cream[0], cream[1], cream[2], int(round(a * 255))))
        out.append(nr)
    return out


def adaptive_foreground(glyph, w, h, size):
    """글자 레이어를 size 캔버스의 ADAPTIVE_SCALE 배로 줄여 가운데에 둔다(나머지는 투명)."""
    inner = int(round(size * ADAPTIVE_SCALE))
    small = resize(glyph, w, h, inner)
    off = (size - inner) // 2
    canvas = [[(0, 0, 0, 0)] * size for _ in range(size)]
    for y in range(inner):
        for x in range(inner):
            canvas[off + y][off + x] = small[y][x]
    return canvas


def png_size(path):
    d = open(path, "rb").read(24)
    return struct.unpack(">II", d[16:24])


def main():
    w, h, img = read_png(SRC)
    glyph = extract_glyph(img, w, h)
    for d, (legacy, fg) in DENSITIES.items():
        base = os.path.join(RES, f"mipmap-{d}")
        sq = resize(img, w, h, legacy)
        write_png(os.path.join(base, "ic_launcher.png"), legacy, legacy, sq)
        write_png(os.path.join(base, "ic_launcher_round.png"), legacy, legacy, mask_round(sq, legacy))
        # 적응형 전경: 글자만(투명 배경) 85% 로 줄여 가운데에 — 배경색은 단색이라 이음새가 없다
        write_png(os.path.join(base, "ic_launcher_foreground.png"), fg, fg, adaptive_foreground(glyph, w, h, fg))
        print("launcher", d, legacy, fg)

    bg = edge_color(img, w, h)
    print("adaptive background", bg)
    with open(os.path.join(RES, "values", "ic_launcher_background.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
                f'    <color name="ic_launcher_background">{bg}</color>\n</resources>\n')

    # 스플래시: 크림 배경 + 가운데 둥근 아이콘 (짧은 변의 25%)
    cache = {}
    for dirpath, _, files in os.walk(RES):
        if "splash.png" in files and os.path.basename(dirpath).startswith("drawable"):
            p = os.path.join(dirpath, "splash.png")
            sw, sh = png_size(p)
            isz = int(min(sw, sh) * 0.25)
            if isz not in cache:
                cache[isz] = mask_rrect(resize(img, w, h, isz), isz)
            icon = cache[isz]
            ox, oy = (sw - isz) // 2, (sh - isz) // 2
            canvas = [[(*CREAM, 255)] * sw for _ in range(sh)]
            for y in range(isz):
                row = canvas[oy + y]
                for x in range(isz):
                    a = icon[y][x][3]
                    if a:
                        bg = row[ox + x]
                        pr = icon[y][x]
                        row[ox + x] = tuple((pr[k] * a + bg[k] * (255 - a)) // 255 for k in range(3)) + (255,)
            write_png(p, sw, sh, canvas)
            print("splash", os.path.relpath(p, RES), sw, sh)


if __name__ == "__main__":
    main()
