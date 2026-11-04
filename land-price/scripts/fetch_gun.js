// 국토교통부 실거래가 공개시스템에서 영동군 전체 토지 매매 CSV를 연도별로 내려받습니다(data/gun/, git 제외).
// land-price/ 폴더에서 실행: node scripts/fetch_gun.js  → 이어서 python3 scripts/extract_simcheon.py
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('https://rt.molit.go.kr/pt/xls/xls.do?mobileAt=', {waitUntil:'networkidle', timeout:60000});
  for (let y = 2016; y <= 2026; y++) {
    const form = {srhThingNo:'G',srhDelngSecd:'1',srhAddrGbn:'1',srhLfstsSecd:'1',sidoNm:'충청북도',sggNm:'영동군',emdNm:'전체',loadNm:'',areaNm:'면적',hsmpNm:'',mobileAt:'',srhFromDt:`${y}-01-01`,srhToDt: y===2026?'2026-11-04':`${y}-12-31`,srhNewRonSecd:'',srhSidoCd:'43000',srhSggCd:'43740',srhEmdCd:'',srhRoadNm:'',srhLoadCd:'',srhHsmpCd:'',srhArea:'',srhFromAmount:'',srhToAmount:'',srhLrArea:''};
    const body = new URLSearchParams(form).toString();
    const res = await p.evaluate(async bd => {
      const h = {'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8'};
      const chk = await (await fetch('/pt/xls/ptXlsDownDataCheck.do',{method:'POST',headers:h,body:bd})).text();
      if (!/"cnt":[1-9]/.test(chk)) return {chk};
      const r = await fetch('/pt/xls/ptXlsCSVDown.do',{method:'POST',headers:h,body:bd});
      const buf = new Uint8Array(await r.arrayBuffer());
      let s=''; for (let i=0;i<buf.length;i++) s+=String.fromCharCode(buf[i]);
      return {chk, ct: r.headers.get('content-type'), b64: btoa(s)};
    }, body);
    console.log(y, res.chk, res.ct||'');
    if (res.b64) fs.writeFileSync(`data/gun/${y}.csv`, Buffer.from(res.b64,'base64'));
    await p.waitForTimeout(800);
  }
  await b.close();
})();
