import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(path.join(here, '..', 'index.html')).href;

let browser;
const PHONE = { width: 412, height: 915 };
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

async function fresh(viewport = { width: 1024, height: 768 }, init, stayOnStart = false) {
  const ctx = await browser.newContext({ viewport, hasTouch: false });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  if (!stayOnStart) await page.click('[data-tab=lab]');
  return { ctx, page, errors };
}

const center = async (page, sel) => {
  const b = await page.locator(sel).boundingBox();
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
async function drag(page, fromSel, toSel) {
  const a = await center(page, fromSel), b = await center(page, toSel);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
}
// ids of bench atoms with a given symbol, in creation order
const benchIds = (page, sym) => page.$$eval(`#bench .atom[data-sym=${sym}]`, els => els.map(e => e.dataset.id));

async function makeWater(page) {
  await page.click('[data-atom=H]');
  await page.click('[data-atom=H]');
  await page.click('[data-atom=O]');
  const [h1, h2] = await benchIds(page, 'H');
  const [o] = await benchIds(page, 'O');
  await drag(page, `.atom[data-id="${h1}"]`, `.atom[data-id="${o}"]`);
  await drag(page, `.atom[data-id="${h2}"]`, `.atom[data-id="${o}"]`);
}

test('tapping drawer atoms places them on the bench', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=H]');
  await page.click('[data-atom=H]');
  await page.click('[data-atom=O]');
  assert.equal(await page.locator('#bench .atom').count(), 3);
  await ctx.close();
});

test('making water shows a card, lands in dex and survives reload', async () => {
  const { ctx, page, errors } = await fresh();
  await makeWater(page);
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card'), /물/);
  await page.click('#card-ok');
  await page.click('[data-tab=dex]');
  assert.equal(await page.locator('.dex-item[data-key=H2O]').count(), 1);
  await page.reload();
  await page.click('[data-tab=dex]');
  assert.equal(await page.locator('.dex-item[data-key=H2O]').count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('blocked localStorage still renders the game without errors', async () => {
  const block = () => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  };
  const { ctx, page, errors } = await fresh(undefined, block);
  assert.ok(await page.locator('[data-atom=H]').isVisible());
  await makeWater(page);
  await page.waitForSelector('#card:not([hidden])');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('wood + flint on the tray combine into fire', async () => {
  const { ctx, page, errors } = await fresh();
  assert.equal(await page.locator('#drawer [data-item=iron_ore]').count(), 0);
  assert.equal(await page.locator('#heat-btn').count(), 0, 'no separate fire button');
  assert.equal(await page.locator('#drawer [data-item=fire]').count(), 0);
  await page.click('#drawer [data-item=wood]');
  await page.click('#drawer [data-item=flint]');
  assert.equal(await page.locator('#tray [data-item]').count(), 2);
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card'), /불/);
  await page.click('#card-ok');
  assert.equal(await page.locator('#drawer [data-item=fire]').count(), 1);
  assert.equal(await page.locator('#tray [data-item]').count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('a wrong combination gives no penalty and keeps the tray', async () => {
  const { ctx, page } = await fresh();
  await page.click('#drawer [data-item=clay]');
  await page.click('#combine-btn');
  assert.ok(await page.locator('#card').isHidden());
  assert.equal(await page.locator('#tray [data-item]').count(), 1);
  await ctx.close();
});

test('first run starts on the hydrogen mission; hint glows; mission advances', async () => {
  const { ctx, page, errors } = await fresh(undefined, undefined, true);
  assert.equal(await page.getAttribute('[data-tab=mission]', 'aria-current'), 'true');
  assert.match(await page.textContent('#mission-text'), /수소/);
  await page.click('#hint-btn');
  assert.equal(await page.locator('[data-atom=H].glow').count(), 1);
  await page.click('[data-atom=H]');
  await page.click('[data-atom=H]');
  const [a, b] = await benchIds(page, 'H');
  await drag(page, `.atom[data-id="${a}"]`, `.atom[data-id="${b}"]`);
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.match(await page.textContent('#mission-text'), /물/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('tech map and village reflect progress', async () => {
  const { ctx, page } = await fresh();
  assert.equal(await page.getAttribute('#village', 'data-era'), 'stone');
  await page.click('[data-tab=map]');
  assert.equal(await page.getAttribute('.map-node[data-id=fire]', 'data-lit'), 'false');
  await page.click('#panel-close');
  await page.click('#drawer [data-item=wood]');
  await page.click('#drawer [data-item=flint]');
  await page.click('#combine-btn');
  await page.click('#card-ok');
  await page.click('[data-tab=map]');
  assert.equal(await page.getAttribute('.map-node[data-id=fire]', 'data-lit'), 'true');
  await ctx.close();
});

test('portrait tablet has no horizontal scroll and drawer does not cover bench', async () => {
  const { ctx, page } = await fresh({ width: 768, height: 1024 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 768));
  const bench = await page.locator('#bench').boundingBox();
  const drawer = await page.locator('#drawer').boundingBox();
  assert.ok(bench.y + bench.height <= drawer.y + 1, 'bench above drawer');
  assert.ok(bench.height > 300);
  await ctx.close();
});

const nearlyStone = () => localStorage.setItem('atomciv.v1', JSON.stringify(
  { found: ['H2', 'H2O', 'O2', 'CO2', 'CH4', 'H3N', 'ClNa', 'O2Si', 'fire', 'stone_axe', 'charcoal'], missionIdx: 0, muted: true }));

test('finishing an era shows the new-era card without the science prefix', async () => {
  const { ctx, page } = await fresh(undefined, nearlyStone);
  await page.click('#drawer [data-item=clay]');
  await page.click('#drawer [data-item=H2O]');
  await page.click('#drawer [data-item=fire]');
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.ok(await page.locator('#card').isVisible(), 'era card visible');
  assert.match(await page.textContent('#card-name'), /청동기시대/);
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('#card-why'), '::before').content);
  assert.equal(before, 'none');
  await ctx.close();
});

test('a second pointer does not hijack an atom drag', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=O]');
  const id = (await benchIds(page, 'O'))[0];
  const moved = await page.evaluate((id) => {
    const svg = document.querySelector('#bench'), g = svg.querySelector(`.atom[data-id="${id}"]`);
    const r = g.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2;
    const ev = (type, pid, cx, cy, target) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: pid, clientX: cx, clientY: cy, isPrimary: pid === 1 }));
    ev('pointerdown', 1, x, y, g);
    const sr = svg.getBoundingClientRect();
    ev('pointermove', 2, sr.x + 5, sr.y + 5, svg);
    ev('pointerup', 2, sr.x + 5, sr.y + 5, svg);
    ev('pointerup', 1, x, y, svg);
    const r2 = svg.querySelector(`.atom[data-id="${id}"]`).getBoundingClientRect();
    return Math.hypot(r2.x - r.x, r2.y - r.y);
  }, id);
  assert.ok(moved < 2, `atom moved ${moved}px`);
  await ctx.close();
});

test('an atom dropped on the tray is pushed back into open bench space', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=O]');
  const id = (await benchIds(page, 'O'))[0];
  await drag(page, `.atom[data-id="${id}"]`, '#tray');
  const a = await page.locator(`.atom[data-id="${id}"]`).boundingBox();
  const t = await page.locator('#tray').boundingBox();
  const cy = a.y + a.height / 2, cx = a.x + a.width / 2;
  assert.ok(!(cx > t.x && cx < t.x + t.width && cy > t.y && cy < t.y + t.height), 'atom center outside tray');
  await ctx.close();
});

test('hint on a molecule mission tells the child to drag atoms together', async () => {
  const { ctx, page } = await fresh(undefined, undefined, true);
  await page.click('#hint-btn');
  assert.match(await page.textContent('#toast'), /끌어/);
  await ctx.close();
});

test('full sodium toast uses 은, not 는', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=Na]'); await page.click('[data-atom=O]'); await page.click('[data-atom=H]');
  const [na] = await benchIds(page, 'Na'); const [o] = await benchIds(page, 'O'); const [h] = await benchIds(page, 'H');
  await drag(page, `.atom[data-id="${na}"]`, `.atom[data-id="${o}"]`);
  await drag(page, `.atom[data-id="${na}"]`, `.atom[data-id="${h}"]`);
  assert.match(await page.textContent('#toast'), /나트륨은 손이 꽉 찼어/);
  await ctx.close();
});

test('salt is drawn as an ionic bond with charges', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=Na]'); await page.click('[data-atom=Cl]');
  const [na] = await benchIds(page, 'Na'); const [cl] = await benchIds(page, 'Cl');
  await drag(page, `.atom[data-id="${na}"]`, `.atom[data-id="${cl}"]`);
  assert.equal(await page.locator('#bench .bond.ionic').count(), 1);
  assert.equal(await page.textContent(`.atom[data-id="${na}"] .charge`), '+');
  assert.equal(await page.textContent(`.atom[data-id="${cl}"] .charge`), '−');
  await ctx.close();
});

test('every mission text fits on one line in portrait', async () => {
  const { ctx, page } = await fresh({ width: 768, height: 1024 }, undefined, true);
  const targets = await page.evaluate(() => window.AtomCiv.MISSIONS.map(m => m.target));
  const wrapped = [];
  for (let i = 0; i < targets.length; i++) {
    await page.evaluate((found) => {
      localStorage.setItem('atomciv.v1', JSON.stringify({ found, missionIdx: 0, muted: true }));
    }, targets.slice(0, i));
    await page.reload();
    const r = await page.evaluate(() => {
      const e = document.querySelector('#mission-text');
      const rg = document.createRange(); rg.selectNodeContents(e);
      const tops = new Set([...rg.getClientRects()].map(x => Math.round(x.top)));
      return { lines: tops.size, t: e.textContent };
    });
    if (r.lines > 1) wrapped.push(r.t);
  }
  assert.deepEqual(wrapped, []);
  await ctx.close();
});

test('after a first O-O bond the child is told to connect again for a double bond', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=O]'); await page.click('[data-atom=O]');
  const [a, b] = await benchIds(page, 'O');
  await drag(page, `.atom[data-id="${a}"]`, `.atom[data-id="${b}"]`);
  assert.match(await page.textContent('#toast'), /한 번 더/);
  await drag(page, `.atom[data-id="${a}"]`, `.atom[data-id="${b}"]`);
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card-name'), /산소/);
  await ctx.close();
});

test('C: water made on the bench drops into the tray; plain H2 does not', async () => {
  const { ctx, page } = await fresh();
  await makeWater(page);
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.equal(await page.locator('#tray [data-item=H2O]').count(), 1);
  await page.click('[data-atom=H]'); await page.click('[data-atom=H]');
  const hs = await benchIds(page, 'H');
  await drag(page, `.atom[data-id="${hs[0]}"]`, `.atom[data-id="${hs[1]}"]`);
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.equal(await page.locator('#tray [data-item=H2]').count(), 0);
  assert.equal(await page.locator('#tray [data-item]').count(), 1);
  await ctx.close();
});

test('empty bowl stays hidden until an ingredient is dragged or added', async () => {
  const { ctx, page } = await fresh(PHONE);
  assert.ok(await page.locator('#mixer').isHidden(), 'hidden when empty');
  assert.equal(await page.locator('#tray-empty').count(), 0, 'no drag-here text');
  await page.locator('#drawer [data-item=wood]').scrollIntoViewIfNeeded();
  const a = await center(page, '#drawer [data-item=wood]');
  await page.mouse.move(a.x, a.y); await page.mouse.down();
  await page.mouse.move(a.x, a.y - 120, { steps: 5 });
  assert.ok(await page.locator('#mixer').isVisible(), 'shows while dragging');
  await page.mouse.up();
  assert.ok(await page.locator('#mixer').isHidden(), 'hides again when nothing was dropped');
  await page.click('#drawer [data-item=wood]');
  assert.ok(await page.locator('#mixer').isVisible(), 'shows with an ingredient');
  await ctx.close();
});

test('A: the first ingredient mission opens a one-time tray intro card', async () => {
  const molecules = () => { if (!localStorage.getItem('atomciv.v1')) localStorage.setItem('atomciv.v1', JSON.stringify(
    { found: ['H2', 'H2O', 'O2', 'CO2', 'CH4', 'H3N', 'ClNa', 'O2Si'], missionIdx: 0, muted: true })); };
  const { ctx, page } = await fresh(undefined, molecules, true);
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card'), /그릇/);
  await page.click('#card-ok');
  // 새로고침 대신 저장값을 직접 확인한다: Chromium은 localStorage를 디스크에 늦게 써서,
  // 곧바로 새로고침하면 옛 값을 읽는 일이 가끔 있다 (테스트에서만 생기는 타이밍 문제).
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('atomciv.v1')));
  assert.equal(saved.trayIntro, true, 'intro remembered so it is shown only once');
  await ctx.close();
});

const ironDone = ['H2', 'H2O', 'O2', 'CO2', 'CH4', 'H3N', 'ClNa', 'O2Si', 'fire', 'stone_axe', 'charcoal', 'pottery', 'copper', 'tin', 'bronze', 'iron', 'glass'];

test('industry era opens with coal and limestone and a new village', async () => {
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:${JSON.stringify(ironDone)},missionIdx:0,muted:true,trayIntro:true}))`;
  const { ctx, page } = await fresh(undefined, init);
  assert.equal(await page.locator('#drawer [data-item=coal]').count(), 1);
  assert.equal(await page.locator('#drawer [data-item=limestone]').count(), 1);
  assert.equal(await page.getAttribute('#village', 'data-era'), 'industry');
  await ctx.close();
});

test('finishing the industry era opens the electric era', async () => {
  const found = [...ironDone, 'steam', 'steel', 'steam_engine', 'wheel', 'quicklime', 'cement', 'concrete'];
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:${JSON.stringify(found)},missionIdx:0,muted:true,trayIntro:true,allDone:true}))`;
  const { ctx, page } = await fresh(undefined, init);
  for (const id of ['steam_engine', 'wheel', 'steel']) await page.click(`#drawer [data-item=${id}]`);
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.ok(await page.locator('#card').isVisible());
  assert.match(await page.textContent('#card-name'), /전기시대가 열렸어/);
  assert.equal(await page.locator('#drawer [data-item=lodestone]').count(), 1);
  await ctx.close();
});

const electricAlmost = [...ironDone, 'steam', 'steel', 'steam_engine', 'train', 'quicklime', 'cement', 'concrete',
  'salt_water', 'zinc', 'wire', 'battery', 'bulb', 'motor'];

test('finishing the electric era opens the information era', async () => {
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:${JSON.stringify(electricAlmost)},missionIdx:0,muted:true,trayIntro:true,endingEras:4}))`;
  const { ctx, page } = await fresh(undefined, init);
  for (const id of ['lodestone', 'wire', 'steam_engine']) await page.click(`#drawer [data-item=${id}]`);
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.ok(await page.locator('#card').isVisible());
  assert.match(await page.textContent('#card-name'), /정보시대가 열렸어/);
  assert.equal(await page.locator('#drawer [data-item=oil]').count(), 1);
  await ctx.close();
});

const infoAlmost = [...electricAlmost, 'generator', 'silicon', 'chip', 'computer', 'radio', 'plastic', 'phone'];

test('finishing the information era opens the modern era', async () => {
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:${JSON.stringify(infoAlmost)},missionIdx:0,muted:true,trayIntro:true,endingEras:5}))`;
  const { ctx, page } = await fresh(undefined, init);
  for (const id of ['computer', 'wire', 'radio']) await page.click(`#drawer [data-item=${id}]`);
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.ok(await page.locator('#card').isVisible());
  assert.match(await page.textContent('#card-name'), /현대가 열렸어/);
  assert.equal(await page.locator('#drawer [data-item=aluminum_ore]').count(), 1);
  await ctx.close();
});

test('finishing the modern era shows the ending card', async () => {
  const found = [...infoAlmost, 'internet', 'solar_cell', 'aluminum', 'rocket_fuel', 'rocket', 'electric_car', 'wind_turbine'];
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:${JSON.stringify(found)},missionIdx:0,muted:true,trayIntro:true,endingEras:6}))`;
  const { ctx, page } = await fresh(undefined, init);
  for (const id of ['rocket', 'solar_cell', 'radio']) await page.click(`#drawer [data-item=${id}]`);
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.ok(await page.locator('#card').isVisible());
  assert.match(await page.textContent('#card-name'), /현대까지 완성/);
  await ctx.close();
});

test('save to a file, start over, then load it back', async () => {
  const { ctx, page } = await fresh();
  await makeWater(page);
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  await page.click('#save-menu');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save-file')]);
  assert.match(dl.suggestedFilename(), /atomciv.*\.json$/);
  const savedPath = await dl.path();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('[data-tab=dex]');
  assert.equal(await page.locator('.dex-item[data-key=H2O]').count(), 0);
  await page.click('#panel-close');
  await page.click('#save-menu');
  await page.setInputFiles('#load-file', savedPath);
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card'), /불러왔어/);
  await page.click('#card-ok');
  await page.click('[data-tab=dex]');
  assert.equal(await page.locator('.dex-item[data-key=H2O]').count(), 1);
  await ctx.close();
});

test('loading a wrong file shows a friendly message and keeps progress', async () => {
  const { ctx, page } = await fresh();
  await page.click('#save-menu');
  await page.setInputFiles('#load-file', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('nope') });
  await page.waitForFunction(() => document.querySelector('#toast').classList.contains('show'));
  assert.match(await page.textContent('#toast'), /불러올 수 없/);
  await ctx.close();
});

for (const vp of [{ width: 1024, height: 768 }, { width: 768, height: 1024 }]) {
  test(`mixing bowl sits in the middle of the bench (${vp.width}x${vp.height}) with buttons below`, async () => {
    const { ctx, page } = await fresh(vp);
    for (const id of ['wood', 'flint', 'clay', 'wood', 'flint', 'clay']) await page.click(`#drawer [data-item=${id}]`);
    assert.equal(await page.locator('#tray [data-item]').count(), 6);
    const bench = await page.locator('#bench').boundingBox();
    const tray = await page.locator('#tray').boundingBox();
    const combine = await page.locator('#combine-btn').boundingBox();
    const clear = await page.locator('#clear-btn').boundingBox();
    const cx = tray.x + tray.width / 2, cy = tray.y + tray.height / 2;
    assert.ok(Math.abs(cx - (bench.x + bench.width / 2)) < bench.width * 0.08, 'centered horizontally');
    assert.ok(Math.abs(cy - (bench.y + bench.height / 2)) < bench.height * 0.15, 'centered vertically');
    assert.ok(combine.y >= tray.y + tray.height - 1, 'buttons below the bowl');
    const hit = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    assert.ok(!hit(tray, clear) && !hit(combine, clear));
    assert.ok(tray.x >= bench.x && tray.x + tray.width <= bench.x + bench.width, 'bowl fits on screen');
    await ctx.close();
  });
}

test('drag ingredients from the drawer into the bowl, and drag one back out', async () => {
  const { ctx, page } = await fresh();
  await drag(page, '#drawer [data-item=wood]', '#tray');
  await drag(page, '#drawer [data-item=flint]', '#tray');
  assert.equal(await page.locator('#tray [data-item]').count(), 2);
  await drag(page, '#tray [data-item=wood]', '#drawer > h3:first-child');
  assert.equal(await page.locator('#tray [data-item]').count(), 1);
  assert.equal(await page.locator('#tray [data-item=flint]').count(), 1);
  await ctx.close();
});

test('territory map: hex island with fog, borders grow, tapping a building opens its card', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-tab=map]');
  assert.ok(await page.locator('#panel .hex').count() > 50);
  assert.ok(await page.locator('#panel .hex.fog').count() > 0);
  const owned0 = await page.locator('#panel .hex.owned').count();
  assert.match(await page.textContent('#map-info'), /7칸/);
  await page.click('#panel-close');
  await page.click('#drawer [data-item=wood]'); await page.click('#drawer [data-item=flint]');
  await page.click('#combine-btn'); await page.click('#card-ok');
  await page.click('[data-tab=map]');
  assert.ok(await page.locator('#panel .hex.owned').count() > owned0);
  assert.ok(await page.locator('#panel .border-edge').count() > 0);
  await page.click('.map-node[data-id=fire]');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card-name'), /불/);
  await ctx.close();
});


test('phone: atoms never appear under the mixing bowl', async () => {
  const { ctx, page } = await fresh(PHONE);
  for (let i = 0; i < 6; i++) await page.click('[data-atom=H]');
  const box = await page.locator('#mixer').boundingBox();
  const bench = await page.locator('#bench').boundingBox();
  const centers = await page.$$eval('#bench .atom', els => els.map(e => { const r = e.querySelector('.body > circle:last-of-type') || e; const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }));
  for (const [x, y] of centers) {
    assert.ok(!(x > box.x && x < box.x + box.width && y > box.y && y < box.y + box.height), `atom at ${x},${y} under bowl`);
    assert.ok(y > bench.y && y < bench.y + bench.height, 'atom on the bench');
  }
  await ctx.close();
});

test('phone: empty bowl is compact and the hint button is small', async () => {
  const { ctx, page } = await fresh(PHONE, undefined, true);
  const tray = await page.locator('#tray').boundingBox();
  const bench = await page.locator('#bench').boundingBox();
  assert.ok(tray.width < bench.width * 0.6, `bowl width ${tray.width} of ${bench.width}`);
  assert.ok(tray.height <= 80, `bowl height ${tray.height}`);
  const hint = await page.locator('#hint-btn').boundingBox();
  assert.ok(hint.width <= 64, `hint width ${hint.width}`);
  await ctx.close();
});

test('magnesium oxide is drawn as ionic with 2+ and 2- charges', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=Mg]'); await page.click('[data-atom=O]');
  const [mg] = await benchIds(page, 'Mg'); const [o] = await benchIds(page, 'O');
  await drag(page, `.atom[data-id="${mg}"]`, `.atom[data-id="${o}"]`);
  await drag(page, `.atom[data-id="${mg}"]`, `.atom[data-id="${o}"]`);
  assert.equal(await page.locator('#bench .bond.ionic').count(), 1);
  assert.equal(await page.textContent(`.atom[data-id="${mg}"] .charge`), '2+');
  assert.equal(await page.textContent(`.atom[data-id="${o}"] .charge`), '2−');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card-name'), /산화마그네슘/);
  await ctx.close();
});

test('hint button spells out the ingredients', async () => {
  const { ctx, page } = await fresh(undefined, undefined, true);
  await page.click('#hint-btn');
  assert.match(await page.textContent('#toast'), /H/);
  await ctx.close();
});

test('putting helium on the bench discovers it right away', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=He]');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card-name'), /헬륨/);
  await ctx.close();
});

test('calcium oxide shows 2+ and 2- charges', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=Ca]'); await page.click('[data-atom=O]');
  const [ca] = await benchIds(page, 'Ca'); const [o] = await benchIds(page, 'O');
  await drag(page, `.atom[data-id="${ca}"]`, `.atom[data-id="${o}"]`);
  await drag(page, `.atom[data-id="${ca}"]`, `.atom[data-id="${o}"]`);
  assert.equal(await page.textContent(`.atom[data-id="${ca}"] .charge`), '2+');
  await ctx.close();
});

test('fire from the drawer acts as heat: wood + fire makes charcoal', async () => {
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:['fire'],missionIdx:0,muted:true,trayIntro:true}))`;
  const { ctx, page } = await fresh(undefined, init);
  await page.click('#drawer [data-item=wood]');
  await page.click('#drawer [data-item=fire]');
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card-name'), /숯/);
  await ctx.close();
});

test('wood alone hints that fire is needed', async () => {
  const init = `if(!localStorage.getItem('atomciv.v1'))localStorage.setItem('atomciv.v1',JSON.stringify({found:['fire'],missionIdx:0,muted:true,trayIntro:true}))`;
  const { ctx, page } = await fresh(undefined, init);
  await page.click('#drawer [data-item=wood]');
  await page.click('#combine-btn');
  assert.match(await page.textContent('#toast'), /불/);
  await ctx.close();
});

test('sodium hydroxide shows O with a 1- charge (it got one electron)', async () => {
  const { ctx, page } = await fresh();
  await page.click('[data-atom=Na]'); await page.click('[data-atom=O]');
  const [na] = await benchIds(page, 'Na'); const [o] = await benchIds(page, 'O');
  await drag(page, `.atom[data-id="${na}"]`, `.atom[data-id="${o}"]`);
  assert.equal(await page.textContent(`.atom[data-id="${o}"] .charge`), '−');
  assert.equal(await page.textContent(`.atom[data-id="${na}"] .charge`), '+');
  await ctx.close();
});

test('bowl reaction: CO2 + water makes carbonic acid with a molecule card', async () => {
  const init = () => { if (!localStorage.getItem('atomciv.v1')) localStorage.setItem('atomciv.v1', JSON.stringify({ found: ['CO2', 'H2O', 'fire', 'stone_axe', 'charcoal', 'pottery'], muted: true, trayIntro: true, mode: 'normal' })); };
  const { ctx, page, errors } = await fresh(undefined, init);
  await page.click('#drawer [data-item=CO2]'); await page.click('#drawer [data-item=H2O]');
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card-name'), /탄산/);
  assert.match(await page.textContent('#card-formula'), /H₂CO₃/);
  await page.click('#card-ok');
  const found = await page.evaluate(() => JSON.parse(localStorage.getItem('atomciv.v1')).found);
  assert.ok(found.includes('CH2O3'));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('CO2 made during its own mission does not jump into the bowl', async () => {
  const init = () => { if (!localStorage.getItem('atomciv.v1')) localStorage.setItem('atomciv.v1', JSON.stringify({ found: ['H2', 'H2O', 'O2'], muted: true, mode: 'normal' })); };
  const { ctx, page } = await fresh(undefined, init);
  for (const s of ['O', 'C', 'O']) await page.click(`[data-atom=${s}]`);
  const [o1, o2] = await benchIds(page, 'O'); const [c] = await benchIds(page, 'C');
  for (const [x, y] of [[o1, c], [o1, c], [o2, c], [o2, c]]) await drag(page, `.atom[data-id="${x}"]`, `.atom[data-id="${y}"]`);
  await page.waitForSelector('#card:not([hidden])');
  await page.click('#card-ok');
  assert.equal(await page.locator('#tray [data-item]').count(), 0);
  await ctx.close();
});
