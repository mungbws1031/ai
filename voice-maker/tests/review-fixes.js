// 최종 리뷰 지적 사항 회귀 테스트
// 실행: node voice-maker/tests/review-fixes.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
let pass = 0, fail = 0;
const ok = (c, name, d='') => { c ? pass++ : fail++; console.log(c ? '  통과' : '  실패', name, d); };
function toneWav(sec = 0.6) {
  const sr = 22050, n = Math.round(sr*sec), b = Buffer.alloc(44 + n*2);
  b.write('RIFF',0); b.writeUInt32LE(36+n*2,4); b.write('WAVE',8); b.write('fmt ',12);
  b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(sr,24);
  b.writeUInt32LE(sr*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*2,40);
  for (let i=0;i<n;i++) b.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*440*i/sr)), 44+i*2);
  return b;
}
const serve = () => new Promise(r => {
  const s = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0, () => r(s));
});

(async () => {
  const app = await serve(); const URL = `http://localhost:${app.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });

  console.log('\n[#1 서비스 워커가 다른 사이트 응답을 캐시하지 않음]');
  {
    let hits = 0;
    const api = http.createServer((req, res) => {
      hits++;
      res.writeHead(hits === 1 ? 401 : 200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hit: hits }));
    }).listen(0);
    await new Promise(r => api.on('listening', r));
    const ctx = await browser.newContext();   // service worker 허용
    const p = await ctx.newPage();
    await p.goto(URL);
    await p.evaluate(() => navigator.serviceWorker.ready);
    await p.reload(); await p.waitForFunction(() => !!navigator.serviceWorker.controller);
    const api2 = `http://127.0.0.1:${api.address().port}/v1/voices`;
    const r1 = await p.evaluate(u => fetch(u).then(r => r.status), api2);
    const r2 = await p.evaluate(u => fetch(u).then(r => r.status), api2);
    ok(r1 === 401 && r2 === 200, '두 번째 요청은 캐시가 아닌 새 응답', `${r1}, ${r2}`);
    api.close();
    const r3 = await p.evaluate(u => fetch(u).then(r => 'resolved ' + r.status, e => 'rejected ' + e.name), api2);
    ok(r3.startsWith('rejected'), '연결 실패는 index.html이 아닌 오류로', r3);
    await ctx.close();
  }

  // 공통: 내레이션 + 느린 ElevenLabs 가짜 서버
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  let tts = 0, mode = 'ok';
  await page.route('https://api.elevenlabs.io/**', async route => {
    const url = route.request().url();
    if (url.endsWith('/v1/voices')) return route.fulfill({ contentType: 'application/json', body: '{"voices":[{"voice_id":"v1","name":"지수"}]}' });
    if (url.endsWith('/v1/user/subscription')) return route.fulfill({ contentType: 'application/json', body: '{"character_limit":10000,"character_count":0}' });
    if (mode === 'quota') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":{"status":"quota_exceeded","message":"This request exceeds your quota."}}' });
    tts++; await new Promise(r => setTimeout(r, 700));
    route.fulfill({ contentType: 'audio/mpeg', body: toneWav() });
  });
  await page.goto(URL);
  await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('voice-maker'); });
  await page.reload();
  await page.click('#tab-narr');
  await page.fill('#elKey', 'sk_test_abcdef'); await page.click('#elSave');
  await page.waitForFunction(() => document.querySelector('#elRemain').textContent.includes('10,000'));
  await page.locator('#speakers .spk').first().locator('.spk-ai').selectOption('v1');
  const st = n => page.getAttribute(`#lines .line:nth-child(${n}) .l-status`, 'data-status');
  const freshLines = async text => {
    await page.fill('#script', text); await page.click('#splitBtn');
    for (let i = 0; i < await page.locator('#lines .line').count(); i++) await page.locator('#lines .line').nth(i).locator('.l-src').selectOption('ai');
  };

  console.log('\n[#2 AI 만들기 두 번 눌러도 한 번만 요금]');
  await freshLines('하나. 둘. 셋.');
  tts = 0;
  await page.click('#genAll');
  await page.waitForTimeout(150);
  await page.click('#genAll', { force: true }).catch(() => {});
  await page.locator('#lines .line').nth(2).locator('.l-gen').click({ force: true }).catch(() => {});
  await page.waitForFunction(() => [...document.querySelectorAll('#lines .l-status')].every(s => s.dataset.status === 'ready'), null, { timeout: 10000 });
  await page.waitForTimeout(800);
  ok(tts === 3, 'TTS 요청은 줄 수(3)만큼', String(tts));

  console.log('\n[#3 만드는 중에 글을 고치면 옛 소리가 준비됨이 되지 않음]');
  await freshLines('첫 문장.');
  await page.click('#genAll');
  await page.waitForFunction(() => document.querySelector('#lines .l-status').dataset.status === 'busy');
  await page.locator('#lines .line').nth(0).locator('.l-text').fill('고친 문장.');
  await page.locator('#lines .line').nth(0).locator('.l-text').dispatchEvent('change');
  await page.waitForTimeout(1200);
  ok(await st(1) !== 'ready', '옛 글의 소리는 준비됨이 아님', await st(1));

  console.log('\n[#5 만드는 동안 다른 줄에 입력 중인 글이 지워지지 않음]');
  await freshLines('가. 나.');
  await page.click('#genAll');
  await page.waitForFunction(() => document.querySelector('#lines .l-status').dataset.status === 'busy');
  const t2 = page.locator('#lines .line').nth(1).locator('.l-text');
  await t2.click(); await page.keyboard.press('End'); await page.keyboard.type(' 덧붙임');
  await page.waitForFunction(() => document.querySelector('#lines .l-status').dataset.status === 'ready', null, { timeout: 5000 });
  ok((await page.locator('#lines .line').nth(1).locator('.l-text').inputValue()).includes('덧붙임'), '입력 중인 글 유지');
  ok(await page.evaluate(() => document.activeElement?.classList.contains('l-text')), '입력 칸 포커스 유지');
  await page.waitForFunction(() => [...document.querySelectorAll('#lines .l-status')].every(s => s.dataset.status !== 'busy'), null, { timeout: 8000 });

  console.log('\n[#6 한도 초과(401 quota_exceeded)는 키 오류가 아니라 한도 안내]');
  await freshLines('한도 시험.');
  mode = 'quota';
  await page.click('#genAll'); await page.waitForTimeout(500);
  const msg = await page.textContent('#status');
  ok(msg.includes('한도') && !msg.includes('키를 확인'), '한도 안내', msg);
  mode = 'ok';

  console.log('\n[#4 녹음 중 다른 줄 녹음으로 바로 넘어가기]');
  await page.fill('#script', '에이. 비.'); await page.click('#splitBtn');
  for (const i of [0, 1]) await page.locator('#lines .line').nth(i).locator('.l-src').selectOption('rec');
  await page.locator('#lines .line').nth(0).locator('.l-rec').click();
  await page.waitForFunction(() => document.querySelector('#lines .l-status').dataset.status === 'recording', null, { timeout: 8000 });
  await page.waitForTimeout(800);
  await page.locator('#lines .line').nth(1).locator('.l-rec').click();
  await page.waitForFunction(() => document.querySelector('#lines .line:nth-child(2) .l-status').dataset.status === 'recording', null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  ok(await st(1) === 'ready', '첫 줄 녹음 저장됨', await st(1));
  ok(await st(2) === 'recording' && (await page.locator('#lines .line').nth(1).locator('.l-rec').textContent()) === '녹음 끝내기', '둘째 줄은 녹음 중 표시 유지', await st(2));
  await page.locator('#lines .line').nth(1).locator('.l-rec').click();
  await page.waitForFunction(() => document.querySelector('#lines .line:nth-child(2) .l-status').dataset.status === 'ready', null, { timeout: 5000 }).catch(() => {});
  ok(await st(2) === 'ready', '둘째 줄도 끝내면 저장됨', await st(2));

  ok(errors.length === 0, '페이지 오류 없음', errors.join(' | '));
  await browser.close(); app.close();
  console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('중단:', e.message.split('\n')[0]); process.exit(1); });
