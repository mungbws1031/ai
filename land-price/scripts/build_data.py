"""지도 경로와 차트 데이터를 만들고 index.html을 생성합니다.
land-price/ 폴더에서 실행: python3 scripts/build_data.py
행정동 경계(vuski/admdongkor, 약 35MB)는 data/adm.json에 없으면 내려받습니다(git 제외).
"""
import json, math, csv, statistics as st, os, urllib.request
ADM='data/adm.json'
if not os.path.exists(ADM):
    urllib.request.urlretrieve('https://raw.githubusercontent.com/vuski/admdongkor/master/ver20230701/HangJeongDong_ver20230701.geojson', ADM)
# --- map
d=json.load(open(ADM))
fs=[f for f in d['features'] if '영동군' in f['properties']['adm_nm']]
lon0,lon1,lat0,lat1=127.585,128.068,36.007,36.321
c=math.cos(math.radians(36.16)); W=600
k=W/((lon1-lon0)*c); H=round((lat1-lat0)*k)
def P(lon,lat): return ((lon-lon0)*c*k,(lat1-lat)*k)
areas=[]
for f in fs:
    name=f['properties']['adm_nm'].split()[-1]
    g=f['geometry']; polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    path=[]; xs=[];ys=[]; A=0;CX=0;CY=0
    for p in polys:
        for ring in p:
            q=[P(*pt) for pt in ring]
            # decimate: keep points >=1.2px apart
            out=[q[0]]
            for pt in q[1:]:
                if math.dist(pt,out[-1])>=1.2: out.append(pt)
            path.append('M'+'L'.join(f'{x:.1f},{y:.1f}' for x,y in out)+'Z')
            for i in range(len(q)-1):
                x0,y0=q[i];x1,y1=q[i+1];cr=x0*y1-x1*y0;A+=cr;CX+=(x0+x1)*cr;CY+=(y0+y1)*cr
    A/=2; areas.append({'name':name,'d':''.join(path),'cx':round(CX/(6*A),1),'cy':round(CY/(6*A),1)})
mapdata={'w':W,'h':H,'areas':areas}
# --- deals
farm=[]
for r in csv.DictReader(open('data/chogang_farmland_2016-2026.csv',encoding='utf-8-sig')):
    farm.append(r)
ok=[r for r in farm if r['지분']!='Y' and r['해제여부']!='Y']
deals=[{'d':r['계약일'],'j':r['지목'],'z':r['용도지역'],'b':r['번지(일부)'],'m2':float(r['면적㎡']),'py':int(r['면적평']),'amt':int(r['거래금액만원']),'pp':float(r['평당가만원']),'t':r['거래유형']} for r in ok]
def stats(v):
    v=sorted(v); n=len(v)
    q=lambda p: v[min(n-1,int(p*(n-1)+0.5))]
    return {'n':n,'min':v[0],'q1':q(.25),'med':round(st.median(v),1),'q3':q(.75),'max':v[-1]}
years=sorted(set(x['d'][:4] for x in deals))
yearly=[{'y':y,**stats([x['pp'] for x in deals if x['d'][:4]==y])} for y in years]
rec=[x for x in deals if x['d']>='2024']
byj={j:stats([x['pp'] for x in rec if x['j']==j]) for j in ('답','전','과수원')}
allj={j:stats([x['pp'] for x in deals if x['j']==j]) for j in ('답','전','과수원')}
r22=[x for x in deals if x['d']>='2022']
byz=sorted([{'z':z,**stats([x['pp'] for x in r22 if x['z']==z])} for z in set(x['z'] for x in r22)], key=lambda s:-s['n'])
periods=[]
for lo,hi in (('2016','2018'),('2019','2021'),('2022','2023'),('2024','2026')):
    periods.append({'p':f'{lo}–{hi[2:]}',**stats([x['pp'] for x in deals if lo<=x['d'][:4]<=hi])})
out={'map':mapdata,'deals':deals,'yearly':yearly,'byj':byj,'allj':allj,'byz':byz,'periods':periods,'counts':{'all_land':306,'farm':len(farm),'used':len(ok)}}
json.dump(out,open('data/viz.json','w'),ensure_ascii=False,separators=(',',':'))
print(H, len(deals), periods, byj, [ (b['z'],b['n'],b['med']) for b in byz], [(a['name'],a['cx'],a['cy']) for a in areas])
tpl=open('scripts/template.html',encoding='utf-8').read()
page='<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n'+tpl.replace('__DATA__',json.dumps(out,ensure_ascii=False,separators=(',',':')))+'\n</body>\n</html>\n'
open('index.html','w',encoding='utf-8').write(page)
print('wrote index.html', len(page))
