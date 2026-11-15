"""Render the share images (og/og-<lang>.jpg, 1200x630) and the site icons (icons/) with the GULZA engine.
usage: python tools/make_social.py [base_url]   (default http://localhost:8765/ — serve the repo root first)
Each image is a real GULZA frame (noir style, one oversized line in the page's language) with the name and the
tagline on a band at the bottom. Re-run after a style or wording change."""
import asyncio, base64, os, sys, unicodedata
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
# folder, hero line, tagline
PAGES = {
    'ko': ('', '글자가 움직이면', '무료 모션 자막 제작기 · SRT / LRC → MP4'),
    'ja': ('ja/', '文字が動き出す', '無料のモーション字幕メーカー · SRT / LRC → MP4'),
    'en': ('en/', 'Letters in motion', 'Free motion caption maker · SRT / LRC → MP4'),
    'zh-hant': ('zh-hant/', '讓文字動起來', '免費動態字幕製作工具 · SRT / LRC → MP4'),
    'zh-hans': ('zh-hans/', '让文字动起来', '免费动态字幕制作工具 · SRT / LRC → MP4'),
    'id': ('id/', 'Huruf bergerak', 'Pembuat teks bergerak gratis · SRT / LRC → MP4'),
    'vi': ('vi/', 'Chữ chuyển động', 'Tạo phụ đề chuyển động miễn phí · SRT / LRC → MP4'),
}
RENDER = r"""async ([hero, tagline]) => {
  const proj = Object.assign(J.defaultProject(), { lyrics: hero, style: 'noir', aspect: '16:9', seed: 7,
    overrides: { 0: { single: true, layout: 'center', enter: 'cut', exit: 'cut', hold: 'still', decor: ['brackets', 'rings'] } } });
  proj.fx = Object.assign({}, proj.fx, { glitch: 0, chroma: 0.55, texture: 0.6, decor: 0.6, flash: false, hud: 'off' });
  const plan = J.plan(proj, null);
  await J.ensureFonts(hero, J.fontsOfPlan(plan));
  await document.fonts.ready;
  const src = document.createElement('canvas'); src.width = 1920; src.height = 1080;
  const c = plan.cuts[0], t = c.start + c.dur * 0.55;
  new J.Renderer().frame(src.getContext('2d'), plan, t, { scale: 1, fast: false, noHud: true });
  const out = document.createElement('canvas'); out.width = 1200; out.height = 630;
  const x = out.getContext('2d');
  // the whole frame (16:9 trimmed to 1.91:1, the line sits a little above the middle), then a band for the name
  x.drawImage(src, 0, 72, 1920, 1008, 0, 0, 1200, 630);
  const g = x.createLinearGradient(0, 430, 0, 630); g.addColorStop(0, 'rgba(12,12,14,0)'); g.addColorStop(0.55, 'rgba(12,12,14,0.92)'); g.addColorStop(1, 'rgba(12,12,14,0.98)');
  x.fillStyle = g; x.fillRect(0, 430, 1200, 200);
  const brand = '900 64px "Zen Old Mincho", "Noto Serif JP", serif';
  await document.fonts.load(brand, 'GULZA');
  x.font = brand; x.textBaseline = 'alphabetic';
  x.fillStyle = 'rgba(22,244,212,0.85)'; x.fillText('GULZA', 58, 566);
  x.fillStyle = 'rgba(245,165,12,0.9)'; x.fillText('GULZA', 64, 569);
  x.fillStyle = '#ece7e1'; x.fillText('GULZA', 61, 567);
  const w = x.measureText('GULZA').width;
  x.font = '600 26px "Segoe UI", "Malgun Gothic", "Yu Gothic UI", "Microsoft JhengHei UI", "Microsoft YaHei UI", sans-serif';
  x.fillStyle = '#ece7e1'; x.fillText(tagline, 61 + w + 28, 560);
  x.fillStyle = '#f5a50c'; x.fillRect(61, 588, 120, 4);
  return out.toDataURL('image/jpeg', 0.88).split(',')[1];
}"""
ICON = r"""(size) => {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), r = size * 0.18;
  x.fillStyle = '#0c0c0e'; x.beginPath(); x.roundRect(0, 0, size, size, r); x.fill();
  x.font = `900 ${Math.round(size * 0.5)}px "Zen Old Mincho", "Noto Serif JP", serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const cx = size / 2, cy = size * 0.54, o = Math.max(1, size * 0.035);
  x.fillStyle = 'rgba(22,244,212,0.9)'; x.fillText('GZ', cx - o, cy - o * 0.5);
  x.fillStyle = 'rgba(245,165,12,0.95)'; x.fillText('GZ', cx + o, cy + o * 0.5);
  x.fillStyle = '#ece7e1'; x.fillText('GZ', cx, cy);
  return c.toDataURL('image/png').split(',')[1];
}"""

async def main():
    os.makedirs(os.path.join(ROOT, 'og'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'icons'), exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width': 1280, 'height': 800})
        for lang, (folder, hero, tagline) in PAGES.items():
            await pg.goto(BASE + folder + 'index.html', wait_until='networkidle')
            await pg.wait_for_timeout(800)
            data = await pg.evaluate(RENDER, [unicodedata.normalize('NFC', hero), unicodedata.normalize('NFC', tagline)])
            open(os.path.join(ROOT, 'og', f'og-{lang}.jpg'), 'wb').write(base64.b64decode(data))
            print('og', lang)
        await pg.goto(BASE + 'index.html', wait_until='networkidle')
        await pg.evaluate('document.fonts.load(\'900 96px "Zen Old Mincho"\', "GZ")')
        await pg.wait_for_timeout(500)
        for name, size in (('favicon-48.png', 48), ('favicon-192.png', 192), ('apple-touch-icon.png', 180)):
            data = await pg.evaluate(ICON, size)
            open(os.path.join(ROOT, 'icons', name), 'wb').write(base64.b64decode(data))
            print('icon', name)
        await b.close()

asyncio.run(main())
