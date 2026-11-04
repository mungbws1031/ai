"""data/gun/*.csv(영동군 전체, CP949)에서 심천면 거래만 골라 data/simcheon_land_2016-2026.csv(UTF-8)로 저장합니다.
land-price/ 폴더에서 실행: python3 scripts/extract_simcheon.py
"""
import csv, io, glob
rows = []
hdr = None
for f in sorted(glob.glob('data/gun/*.csv')):
    lines = open(f, 'rb').read().decode('cp949').splitlines()
    i = next(k for k, l in enumerate(lines) if l.startswith('"NO"'))
    r = list(csv.reader(io.StringIO('\n'.join(lines[i:]))))
    hdr = r[0]
    rows += [x for x in r[1:] if '심천면' in x[1]]
with open('data/simcheon_land_2016-2026.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(hdr[1:])
    for x in rows:
        w.writerow(x[1:])
print('심천면 거래', len(rows), '건')
