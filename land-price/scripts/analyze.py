"""raw CSV(CP949)에서 농지(전·답·과수원)만 골라 평당가 통계를 출력하고 정리 CSV를 씁니다.
land-price/ 폴더에서 실행: python3 scripts/analyze.py
"""
import csv, io, glob, statistics as st, sys
rows=[]
for f in sorted(glob.glob('data/raw/*.csv')):
    txt=open(f,'rb').read().decode('cp949')
    lines=txt.splitlines()
    i=next(k for k,l in enumerate(lines) if l.startswith('"NO"'))
    for r in csv.DictReader(io.StringIO('\n'.join(lines[i:]))):
        rows.append(r)
print('total',len(rows))
farm=[]
for r in rows:
    if r['지목'] not in ('전','답','과수원'): continue
    a=float(r['계약면적']); amt=int(r['거래금액(만원)'].replace(',',''))*10000
    r['평당']=amt/(a/3.305785); r['면적']=a; r['금액']=amt
    r['해제']= r['해제사유발생일'] not in ('-','')
    r['지분']= r['지분구분']=='지분'
    farm.append(r)
from collections import Counter
print('farm',len(farm),Counter(r['지목'] for r in farm), '해제',sum(r['해제'] for r in farm),'지분',sum(r['지분'] for r in farm))
ok=[r for r in farm if not r['해제'] and not r['지분']]
def s(lst):
    v=sorted(x['평당'] for x in lst)
    if not v: return '-'
    q=lambda p: v[min(len(v)-1,int(p*(len(v)-1)+0.5))]
    return f"n={len(v):3d} 중앙 {st.median(v)/1e4:6.1f}만 (하위25% {q(.25)/1e4:5.1f} ~ 상위25% {q(.75)/1e4:5.1f}, 최저 {v[0]/1e4:5.1f}, 최고 {v[-1]/1e4:6.1f})"
print('\n== 지목별 전체 (2016~2026)')
for j in ('전','답','과수원'): print(j, s([r for r in ok if r['지목']==j]))
print('\n== 기간별')
for lo,hi in ((2016,2018),(2019,2021),(2022,2023),(2024,2026)):
    sub=[r for r in ok if lo<=int(r['계약년월'][:4])<=hi]
    print(f'{lo}-{hi}', s(sub))
    for j in ('전','답','과수원'): print('   ',j, s([r for r in sub if r['지목']==j]))
print('\n== 용도지역별 (2022~)')
rec=[r for r in ok if int(r['계약년월'][:4])>=2022]
for z in sorted(set(r['용도지역'] for r in rec)): print(z, s([r for r in rec if r['용도지역']==z]))
print('\n== 2024~2026 건별')
for r in sorted([r for r in farm if int(r['계약년월'][:4])>=2024], key=lambda r:r['계약년월']+r['계약일'].zfill(2), reverse=True):
    print(f"{r['계약년월'][:4]}.{r['계약년월'][4:]}.{r['계약일'].zfill(2)} | {r['지목']:3s} | {r['용도지역']:6s} | {r['면적']:8.0f}㎡({r['면적']/3.305785:6.0f}평) | {r['금액']/1e4:8,.0f}만 | 평당 {r['평당']/1e4:5.1f}만 | {r['거래유형']}{' 지분' if r['지분'] else ''}{' 해제' if r['해제'] else ''}")
with open('data/chogang_farmland_2016-2026.csv','w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f); w.writerow(['계약일','지목','용도지역','번지(일부)','면적㎡','면적평','거래금액만원','평당가만원','거래유형','지분','해제여부'])
    for r in sorted(farm,key=lambda r:r['계약년월']+r['계약일'].zfill(2)):
        w.writerow([f"{r['계약년월'][:4]}-{r['계약년월'][4:]}-{r['계약일'].zfill(2)}",r['지목'],r['용도지역'],r['번지'],r['면적'],round(r['면적']/3.305785),r['금액']//10000,round(r['평당']/1e4,1),r['거래유형'],'Y' if r['지분'] else '','Y' if r['해제'] else ''])
