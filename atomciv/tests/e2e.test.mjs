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

async function fresh(viewport = { width: 1024, height: 768 }, init) {
  const ctx = await browser.newContext({ viewport, hasTouch: false });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(PAGE);
  await page.click('[data-tab=lab]');
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
