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
  assert.ok(await page.locator('#heat-btn').isDisabled());
  await page.click('#drawer [data-item=wood]');
  await page.click('#drawer [data-item=flint]');
  assert.equal(await page.locator('#tray [data-item]').count(), 2);
  await page.click('#combine-btn');
  await page.waitForSelector('#card:not([hidden])');
  assert.match(await page.textContent('#card'), /불/);
  await page.click('#card-ok');
  assert.ok(await page.locator('#heat-btn').isEnabled());
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
  await page.click('#heat-btn');
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
