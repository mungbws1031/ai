// 내레이션 작업실 테스트 (가짜 마이크 + ElevenLabs 가짜 응답, 실제 키·요금 없음)
// 실행: node voice-maker/tests/narration.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots'); fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html':'text/html', '.js':'text/javascript', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
let pass = 0, fail = 0;
const ok = (c, name, d='') => { c ? pass++ : fail++; console.log(c ? '  통과' : '  실패', name, d); };

function toneWav(sec = 1, freq = 300) {
  const sr = 22050, n = Math.round(sr*sec), b = Buffer.alloc(44 + n*2);
  b.write('RIFF',0); b.writeUInt32LE(36+n*2,4); b.write('WAVE',8); b.write('fmt ',12);
  b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22); b.writeUInt32LE(sr,24);
  b.writeUInt32LE(sr*2,28); b.writeUInt16LE(2,32); b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(n*2,40);
  for (let i=0;i<n;i++) b.writeInt16LE(Math.round(9000*Math.sin(2*Math.PI*freq*i/sr)), 44+i*2);
  return b;
}
const wavSec = buf => (buf.length - 44) / 2 / buf.readUInt32LE(24);
const status = p => p.textContent('#status');
const lineStatus = (p, i) => p.getAttribute(`#lines .line:nth-child(${i}) .l-status`, 'data-status');

(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  }).listen(0);
  const URL = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 }, serviceWorkers: 'block', acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => m.type() === 'error' && !/fonts\.g|Failed to load resource|ERR_FAILED/.test(m.text()) && errors.push(m.text()));
  page.on('dialog', d => d.accept());

  // ElevenLabs 가짜 서버
  let mode = 'ok'; const ttsCalls = [];
  await page.route('https://api.elevenlabs.io/**', async route => {
    const req = route.request(), url = req.url();
    if (mode === 'network') return route.abort('failed');
    if (mode === 'auth') return route.fulfill({ status: 401, contentType: 'application/json', body: '{"detail":{"status":"invalid_api_key"}}' });
    if (url.endsWith('/v1/voices')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ voices: [{ voice_id: 'v1', name: '지수' }, { voice_id: 'v2', name: '민준' }] }) });
    if (url.endsWith('/v1/user/subscription')) return route.fulfill({ contentType: 'application/json', body: '{"character_limit":10000,"character_count":1000}' });
    if (url.includes('/v1/text-to-speech/')) {
      ttsCalls.push({ url, key: req.headers()['xi-api-key'], body: JSON.parse(req.postData()) });
      return route.fulfill({ contentType: 'audio/mpeg', body: toneWav(1.0, 440) });
    }
    route.fulfill({ status: 404, body: '' });
  });

  await page.goto(URL); await page.waitForLoadState('networkidle');
  await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase('voice-maker'); });
  await page.reload(); await page.waitForLoadState('networkidle');

  console.log('\n[원고 나누기]');
  const split = await page.evaluate(() => window.__vm.splitScript('옛날 옛적에. "안녕!" 했어요.\n\n끝.'));
  ok(JSON.stringify(split.map(l => l.text)) === JSON.stringify(['옛날 옛적에.', '"안녕!"', '했어요.', '끝.']), 'splitScript 문장·대사 분리', JSON.stringify(split.map(l => l.text)));
  ok(split[2].pause === 0.9 && split[0].pause === 0.4, '문단 끝 쉼 0.9초, 문장 뒤 0.4초', split.map(l => l.pause).join(','));

  await page.click('#tab-narr');
  await page.fill('#script', '옛날 옛적에. "안녕!" 했어요.\n\n끝.');
  await page.click('#splitBtn');
  ok(await page.locator('#lines .line').count() === 4, '줄 목록 4줄');

  console.log('\n[화자]');
  await page.click('#addSpeaker');
  const spk = page.locator('#speakers .spk').nth(1);
  await spk.locator('.spk-name').fill('토끼'); await spk.locator('.spk-name').dispatchEvent('change');
  await spk.locator('.spk-preset').selectOption({ label: '헬륨' });
  await page.locator('#lines .line').nth(1).locator('.l-speaker').selectOption({ label: '토끼' });
  ok(await page.locator('#lines .line').nth(1).locator('.l-speaker option:checked').textContent() === '토끼', '줄에 화자 지정');
  page.removeAllListeners('dialog'); page.on('dialog', d => d.accept());
  await spk.locator('.spk-del').click();
  ok(await page.locator('#lines .line').nth(1).locator('.l-speaker option:checked').textContent() === '내레이터', '화자 삭제 → 줄이 내레이터로');
  ok(await page.locator('#speakers .spk').first().locator('.spk-del').count() === 0, '내레이터는 삭제 버튼 없음');
  await page.click('#addSpeaker');
  const rabbit = page.locator('#speakers .spk').nth(1);
  await rabbit.locator('.spk-name').fill('토끼'); await rabbit.locator('.spk-name').dispatchEvent('change');
  await rabbit.locator('.spk-preset').selectOption({ label: '헬륨' });
  await page.locator('#lines .line').nth(1).locator('.l-speaker').selectOption({ label: '토끼' });

  console.log('\n[직접 녹음]');
  for (const i of [0, 1]) {
    const line = page.locator('#lines .line').nth(i);
    await line.locator('.l-src').selectOption('rec');
    await line.locator('.l-rec').click();
    await page.waitForFunction(n => document.querySelector(`#lines .line:nth-child(${n}) .l-status`).dataset.status === 'recording', i + 1, { timeout: 8000 });
    await page.waitForTimeout(1200); await line.locator('.l-rec').click();
    await page.waitForFunction(n => document.querySelector(`#lines .line:nth-child(${n}) .l-status`).dataset.status === 'ready', i + 1, { timeout: 5000 });
  }
  ok(await lineStatus(page, 1) === 'ready' && await lineStatus(page, 2) === 'ready', '두 줄 녹음 완료');
  await page.reload(); await page.waitForLoadState('networkidle'); await page.click('#tab-narr');
  await page.waitForTimeout(500);
  ok(await page.locator('#lines .line').count() === 4 && await lineStatus(page, 1) === 'ready', '새로고침 후 줄·녹음 유지');

  console.log('\n[AI 음성]');
  await page.fill('#elKey', 'sk_test_1234567890');
  await page.click('#elSave');
  await page.waitForFunction(() => document.querySelector('#elRemain').textContent.includes('9,000'));
  ok(true, '남은 글자 9,000 표시');
  ok(!(await page.inputValue('#elKey')).includes('567890'), '저장 후 키 가려짐', await page.inputValue('#elKey'));
  await page.locator('#speakers .spk').first().locator('.spk-ai').selectOption('v1');
  for (const i of [2, 3]) await page.locator('#lines .line').nth(i).locator('.l-src').selectOption('ai');
  ok(/2줄/.test(await page.textContent('#genAll')) && /6자/.test(await page.textContent('#genAll')), '생성 버튼에 줄·글자 수', await page.textContent('#genAll'));
  await page.click('#genAll');
  await page.waitForFunction(() => [3,4].every(n => document.querySelector(`#lines .line:nth-child(${n}) .l-status`).dataset.status === 'ready'), null, { timeout: 8000 });
  ok(ttsCalls.length === 2, 'TTS 요청 2번', String(ttsCalls.length));
  ok(ttsCalls[0].key === 'sk_test_1234567890' && ttsCalls[0].body.model_id === 'eleven_multilingual_v2' && ttsCalls[0].url.includes('/v1/text-to-speech/v1'), '키·모델·목소리 전달');
  await page.click('#genAll');
  ok(ttsCalls.length === 2, '바뀌지 않은 줄은 재생성 안 함');

  console.log('\n[AI 오류]');
  mode = 'auth';
  await page.locator('#lines .line').nth(3).locator('.l-text').fill('끝이에요.');
  await page.locator('#lines .line').nth(3).locator('.l-text').dispatchEvent('change');
  ok(await lineStatus(page, 4) === 'empty', '글 수정 시 오디오 무효');
  await page.click('#genAll'); await page.waitForTimeout(600);
  ok(await lineStatus(page, 4) === 'error' && (await status(page)).includes('키'), '401 → 키 확인 안내', await status(page));
  mode = 'network';
  await page.click('#genAll'); await page.waitForTimeout(600);
  ok((await status(page)).includes('연결하지 못했어요'), '연결 실패 안내', await status(page));

  console.log('\n[내보내기]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#saveWav')]);
  const wav = fs.readFileSync(await dl.path());
  const sec = wavSec(wav);
  ok(wav.toString('ascii',0,4) === 'RIFF' && dl.suggestedFilename().startsWith('narration-'), 'WAV 저장', `${dl.suggestedFilename()} ${sec.toFixed(2)}초`);
  ok(sec > 2.5 && sec < 6, '길이 ≈ 녹음 2줄(헬륨 포함) + AI 1줄 + 쉼', sec.toFixed(2));
  ok((await status(page)).includes('1줄') && (await status(page)).includes('비어'), '빈 줄 건너뜀 안내', await status(page));
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#saveSrt')]);
  const srt = fs.readFileSync(await dl2.path(), 'utf8');
  const cues = [...srt.matchAll(/(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)/g)]
    .map(m => [ (+m[1]*3600 + +m[2]*60 + +m[3]) + m[4]/1000, (+m[5]*3600 + +m[6]*60 + +m[7]) + m[8]/1000 ]);
  ok(cues.length === 3 && dl2.suggestedFilename().endsWith('.srt'), 'SRT 큐 3개', String(cues.length));
  ok(cues.every((c, i) => c[1] > c[0] && (i === 0 || c[0] >= cues[i-1][1])), 'SRT 시간 오름차순');
  ok(srt.includes('"안녕!"') && srt.startsWith('1\n'), 'SRT 내용·번호');
  ok(Math.abs(cues[2][1] - sec) < 0.6, '마지막 자막 끝 ≈ WAV 길이', `${cues[2][1]} vs ${sec.toFixed(2)}`);
  await page.screenshot({ path: path.join(SHOTS, 'PC-narration.png'), fullPage: true });

  const m = await ctx.newPage(); await m.setViewportSize({ width: 390, height: 844 });
  await m.goto(URL); await m.click('#tab-narr'); await m.waitForTimeout(400);
  ok(await m.evaluate(() => document.documentElement.scrollWidth) === 390, '폰 폭 가로 넘침 없음');
  await m.screenshot({ path: path.join(SHOTS, '폰-narration.png'), fullPage: true });

  ok(errors.length === 0, '페이지·콘솔 오류 없음', errors.join(' | '));
  await browser.close(); server.close();
  console.log(`\n결과: 통과 ${pass} / 실패 ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('중단:', e.message.split('\n')[0]); process.exit(1); });
