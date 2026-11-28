// 목소리 공방 회귀 테스트 (Playwright, headless Chromium + 가짜 마이크)
// 실행: node voice-maker/tests/regression.js
// 스크린샷: voice-maker/tests/shots/
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };

let pass = 0, fail = 0;
const ok = (cond, name, detail='') => {
  if (cond) { pass++; console.log('  통과', name, detail); }
  else { fail++; console.log('  실패', name, detail); }
};

// WAV(16-bit mono) 분석: 길이(초), 영교차율(잡음·밝기 지표), 4kHz 이상 에너지 비율 대용
function wavInfo(buf) {
  const sr = buf.readUInt32LE(24), n = (buf.length - 44) / 2;
  let zc = 0, prev = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    const v = buf.readInt16LE(44 + i*2);
    if ((v >= 0) !== (prev >= 0)) zc++;
    prev = v; peak = Math.max(peak, Math.abs(v));
  }
  return { riff: buf.toString('ascii',0,4) === 'RIFF' && buf.toString('ascii',8,12) === 'WAVE', sr, sec: n/sr, zcr: zc/n, peak };
}

// 테스트용 WAV 파일(440Hz+880Hz 2초)을 만들어 '파일 불러오기' 경로를 확인
function makeToneWav(file) {
  const sr = 22050, n = sr*2, b = Buffer.alloc(44 + n*2);
  b.write('RIFF',0); b.writeUInt32LE(36+n*2,4); b.write('WAVE',8); b.write('fmt ',12);
  b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(sr,24);
  b.writeUInt32LE(sr*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*2,40);
  for (let i=0;i<n;i++) b.writeInt16LE(Math.round(8000*(Math.sin(2*Math.PI*440*i/sr)+0.5*Math.sin(2*Math.PI*880*i/sr))), 44+i*2);
  fs.writeFileSync(file, b);
}

(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const errors = [];
  const watch = page => {
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => m.type() === 'error' && !/fonts\.g/.test(m.text()) && errors.push(m.text()));
  };

  for (const vp of [{ name: 'PC', width: 1280, height: 1000 }, { name: '폰', width: 390, height: 844 }]) {
    console.log(`\n[${vp.name} ${vp.width}px]`);
    const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block', acceptDownloads: true });
    const page = await ctx.newPage(); watch(page);
    await page.goto(URL); await page.waitForLoadState('networkidle');

    // ── 글 → 목소리 ──
    ok(await page.evaluate(() => document.documentElement.scrollWidth) === vp.width, '가로 넘침 없음');
    await page.click('#ttsPresets [data-name="꼬마"]');
    ok(await page.inputValue('#pitch') === '1.8' && await page.inputValue('#rate') === '1.15', '캐릭터 버튼이 빠르기·높낮이 변경');
    await page.fill('#text', '저장 테스트 문장입니다.');
    await page.click('#save');
    await page.reload(); await page.waitForLoadState('networkidle');
    ok((await page.textContent('#history')).includes('저장 테스트 문장'), '저장한 문장이 새로고침 후에도 남음');
    await page.click('#history .del');
    ok((await page.locator('#history .del').count()) === 0, '저장한 문장 삭제');
    await page.fill('#text', '');
    await page.click('#speak');
    ok((await page.textContent('#status')).includes('먼저 입력'), '빈 글 재생 시 안내 문구');
    await page.keyboard.press('Tab');
    const focusOutline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    ok(focusOutline !== 'none', '키보드 포커스 표시', focusOutline);
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-tts.png`), fullPage: true });

    // ── 내 목소리 바꾸기 ──
    await page.click('#tab-fx');
    ok(await page.isDisabled('#fxSave'), '녹음 전에는 저장 버튼 비활성');
    await page.click('#recBtn'); await page.waitForTimeout(2200); await page.click('#recBtn');
    await page.waitForFunction(() => !document.querySelector('#fxSave').disabled, null, { timeout: 5000 });
    ok(true, '가짜 마이크 녹음 → 저장 가능 상태');

    if (vp.name === 'PC') {
      const results = {};
      const names = await page.$$eval('#fxPresets .chip', els => els.map(e => e.dataset.name));
      for (const n of names) {
        await page.click(`#fxPresets [data-name="${n}"]`); await page.waitForTimeout(150);
        await page.click('#fxStop').catch(() => {});
        const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#fxSave')]);
        const info = wavInfo(fs.readFileSync(await dl.path()));
        results[n] = info;
        ok(info.riff && info.sec > 0.5 && info.peak > 1000, `WAV 저장: ${n}`, `${dl.suggestedFilename()} ${info.sec.toFixed(2)}초 zcr=${info.zcr.toFixed(4)}`);
      }
      const base = results['그대로'];
      ok(results['헬륨'].sec < base.sec * 0.75, '헬륨: 높아진 만큼 짧아짐');
      ok(results['거인'].sec > base.sec * 1.3, '거인: 낮아진 만큼 길어짐');
      ok(results['숨소리'].zcr > base.zcr * 5, '숨소리: 공기 잡음이 실제로 섞임');
      ok(results['동굴'].sec > base.sec * 1.5, '동굴: 메아리 꼬리가 붙음');

      // 비음 슬라이더 → EQ 곡선이 1kHz 근처에서 솟아야 함
      await page.click('#fxPresets [data-name="그대로"]'); await page.click('#fxStop').catch(() => {});
      const flatCurve = await page.locator('#eqCurve').screenshot();
      await page.locator('#fxNasal').fill('1'); await page.dispatchEvent('#fxNasal', 'input');
      const nasalCurve = await page.locator('#eqCurve').screenshot();
      ok(!flatCurve.equals(nasalCurve), '비음 조절 시 EQ 곡선 갱신');

      // 재생 중 EQ 실시간 조절 + 평평하게
      await page.click('#fxPlay'); await page.waitForTimeout(200);
      await page.locator('#eq0').fill('6'); await page.dispatchEvent('#eq0', 'input');
      ok(await page.textContent('#eqOut0') === '+6', 'EQ 값 표시', await page.textContent('#eqOut0'));
      ok(!(await page.isDisabled('#fxStop')), '조절해도 재생이 끊기지 않음');
      await page.screenshot({ path: path.join(SHOTS, 'PC-fx-playing.png'), fullPage: true });
      await page.click('#eqReset');
      ok((await page.$$eval('.band input', els => els.every(e => e.value === '0'))), '평평하게: EQ 0으로');
      await page.click('#fxStop');

      // 오디오 파일 불러오기 (+ 잘못된 파일)
      const tone = path.join(SHOTS, 'tone.wav'); makeToneWav(tone);
      await page.setInputFiles('#fileIn', tone);
      await page.waitForFunction(() => document.querySelector('#recInfo').textContent.includes('tone.wav'));
      ok((await page.textContent('#recTime')) === '0:02', '오디오 파일 불러오기', await page.textContent('#recTime'));
      const bad = path.join(SHOTS, 'bad.mp3'); fs.writeFileSync(bad, 'not audio');
      await page.setInputFiles('#fileIn', bad);
      await page.waitForFunction(() => document.querySelector('#status').textContent.includes('열 수 없어요'));
      ok(true, '잘못된 파일은 안내 문구');
      fs.unlinkSync(tone); fs.unlinkSync(bad);
    }
    ok(await page.evaluate(() => document.documentElement.scrollWidth) === vp.width, '내 목소리 탭 가로 넘침 없음');
    await page.screenshot({ path: path.join(SHOTS, `${vp.name}-fx.png`), fullPage: true });
    await ctx.close();
  }

  // 마이크 거부 경로
  console.log('\n[마이크 권한 거부]');
  const b2 = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--deny-permission-prompts'] });
  const p2 = await (await b2.newContext({ serviceWorkers: 'block' })).newPage(); watch(p2);
  await p2.goto(URL); await p2.click('#tab-fx'); await p2.click('#recBtn');
  await p2.waitForTimeout(800);
  ok((await p2.textContent('#status')).includes('마이크 권한'), '거부 시 해결 방법 안내', await p2.textContent('#status'));
  await b2.close();

  ok(errors.length === 0, '페이지·콘솔 오류 없음', errors.join(' | '));
  await browser.close(); server.close();
  console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})();
