import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const PAGE = pathToFileURL(path.join(here, '..', 'index.html')).href;

let browser, page;
before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
  await page.goto(PAGE);
});
after(async () => { await browser.close(); });

// Run fn(AtomCiv, arg) inside the page.
const run = (fn, arg) => page.evaluate(([src, a]) => {
  const f = new Function('A', 'arg', `return (${src})(A, arg);`);
  return f(window.AtomCiv, a);
}, [fn.toString(), arg]);

const judgeOf = (spec) => run((A, s) => {
  let g = { atoms: s.atoms.map((sym, i) => ({ id: 'a' + i, sym })), bonds: [] };
  for (const [x, y] of s.bonds) g = A.addBond(g, 'a' + x, 'a' + y);
  return A.judge(g).map(r => ({ status: r.status, key: r.key }));
}, spec);

test('formulaKey sorts alphabetically with counts', async () => {
  assert.equal(await run(A => A.formulaKey(['H', 'O', 'H'])), 'H2O');
  assert.equal(await run(A => A.formulaKey(['Na', 'Cl'])), 'ClNa');
});

test('H-O-H is water', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['H', 'O', 'H'], bonds: [[0, 1], [1, 2]] }),
    [{ status: 'known', key: 'H2O' }]);
});

test('O=O is oxygen, O-O is incomplete', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['O', 'O'], bonds: [[0, 1], [0, 1]] }),
    [{ status: 'known', key: 'O2' }]);
  assert.deepEqual((await judgeOf({ atoms: ['O', 'O'], bonds: [[0, 1]] }))[0].status, 'incomplete');
});

test('O=C=O and O=Si=O', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['O', 'C', 'O'], bonds: [[0, 1], [0, 1], [1, 2], [1, 2]] }),
    [{ status: 'known', key: 'CO2' }]);
  assert.deepEqual(await judgeOf({ atoms: ['O', 'Si', 'O'], bonds: [[0, 1], [0, 1], [1, 2], [1, 2]] }),
    [{ status: 'known', key: 'O2Si' }]);
});

test('N≡N is nitrogen; 4th bond on same pair is refused', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['N', 'N'], bonds: [[0, 1], [0, 1], [0, 1]] }),
    [{ status: 'known', key: 'N2' }]);
  const ok = await run(A => {
    let g = { atoms: [{ id: 'x', sym: 'C' }, { id: 'y', sym: 'C' }], bonds: [] };
    g = A.addBond(A.addBond(A.addBond(g, 'x', 'y'), 'x', 'y'), 'x', 'y');
    return A.canBond(g, 'x', 'y');
  });
  assert.equal(ok, false);
});

test('two separate H-H groups judged separately', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['H', 'H', 'H', 'H'], bonds: [[0, 1], [2, 3]] }),
    [{ status: 'known', key: 'H2' }, { status: 'known', key: 'H2' }]);
});

test('H-O-O-H follows the rules but is unknown', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['H', 'O', 'O', 'H'], bonds: [[0, 1], [1, 2], [2, 3]] }),
    [{ status: 'unknown', key: 'H2O2' }]);
});

test('full atom cannot bond', async () => {
  const ok = await run(A => {
    let g = { atoms: [{ id: 'h', sym: 'H' }, { id: 'o', sym: 'O' }, { id: 'h2', sym: 'H' }], bonds: [] };
    g = A.addBond(g, 'h', 'o');
    return A.canBond(g, 'h', 'h2');
  });
  assert.equal(ok, false);
});

test('known molecules: methane, ammonia, salt, HCl', async () => {
  assert.equal((await judgeOf({ atoms: ['C', 'H', 'H', 'H', 'H'], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] }))[0].key, 'CH4');
  assert.equal((await judgeOf({ atoms: ['N', 'H', 'H', 'H'], bonds: [[0, 1], [0, 2], [0, 3]] }))[0].key, 'H3N');
  assert.deepEqual(await judgeOf({ atoms: ['Na', 'Cl'], bonds: [[0, 1]] }), [{ status: 'known', key: 'ClNa' }]);
  assert.deepEqual(await judgeOf({ atoms: ['H', 'Cl'], bonds: [[0, 1]] }), [{ status: 'known', key: 'ClH' }]);
});

test('recipes ignore order and respect heat', async () => {
  assert.equal(await run(A => A.matchRecipe(['charcoal', 'iron_ore'], true)), 'iron');
  assert.equal(await run(A => A.matchRecipe(['iron_ore', 'charcoal'], false)), null);
  assert.equal(await run(A => A.matchRecipe(['wood', 'flint'], false)), 'fire');
  assert.equal(await run(A => A.matchRecipe(['flint', 'wood', 'flint'], false)), 'stone_axe');
  assert.equal(await run(A => A.matchRecipe(['H2O', 'clay'], true)), 'pottery');
  assert.equal(await run(A => A.matchRecipe(['O2Si'], true)), 'glass');
  assert.equal(await run(A => A.matchRecipe(['wood'], false)), null);
});

test('eraIndex advances when an era goal is complete', async () => {
  assert.equal(await run(A => A.eraIndex([])), 0);
  assert.equal(await run(A => A.eraIndex(['fire', 'stone_axe', 'charcoal', 'pottery'])), 1);
  assert.equal(await run(A => A.eraIndex(['fire', 'stone_axe', 'charcoal', 'pottery', 'copper', 'tin', 'bronze'])), 2);
});

test('every recipe output and input is a known item or molecule', async () => {
  const bad = await run(A => A.RECIPES.flatMap(r => [r.output, ...r.inputs])
    .filter(id => !A.ITEMS[id] && !A.MOLECULES[id]));
  assert.deepEqual(bad, []);
});

test('review fixes: science texts are not misleading', async () => {
  const t = await run(A => ({ fire: A.ITEMS.fire.why, o2: A.MOLECULES.O2.why, h2: A.MOLECULES.H2.why, axe: A.MISSIONS.find(m => m.target === 'stone_axe').text }));
  assert.match(t.fire, /황철석/);
  assert.doesNotMatch(t.o2, /공기야/);
  assert.match(t.h2, /원소/);
  assert.match(t.axe, /두 개/);
});

test('service worker fetches pages network-first so updates reach tablets', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.match(src, /mode === "navigate"/);
});

test('topic particle follows the final consonant (은/는)', async () => {
  assert.equal(await run(A => A.topic('나트륨')), '나트륨은');
  assert.equal(await run(A => A.topic('수소')), '수소는');
  assert.equal(await run(A => A.topic('질소')), '질소는');
  assert.equal(await run(A => A.topic('산소')), '산소는');
  assert.equal(await run(A => A.topic('탄소')), '탄소는');
  assert.equal(await run(A => A.topic('염소')), '염소는');
  assert.equal(await run(A => A.topic('규소')), '규소는');
});

test('oxygen mission says to connect twice', async () => {
  assert.match(await run(A => A.MISSIONS.find(m => m.target === 'O2').text), /두 번/);
});

test('industry era: recipes, era index, missions', async () => {
  const r = await run(A => ({
    steam: A.matchRecipe(['H2O'], true),
    steel: A.matchRecipe(['coal', 'iron'], true),
    engine: A.matchRecipe(['steam', 'steel'], false),
    train: A.matchRecipe(['steel', 'steam_engine'], false),
    lime: A.matchRecipe(['limestone'], true),
    cement: A.matchRecipe(['clay', 'quicklime'], true),
    concrete: A.matchRecipe(['H2O', 'O2Si', 'cement'], false),
    eras: A.ERAS.length,
    idx: A.eraIndex(['fire', 'stone_axe', 'charcoal', 'pottery', 'copper', 'tin', 'bronze', 'iron', 'glass']),
    missionTargets: A.MISSIONS.map(m => m.target),
  }));
  assert.equal(r.steam, 'steam'); assert.equal(r.steel, 'steel'); assert.equal(r.engine, 'steam_engine');
  assert.equal(r.train, 'train'); assert.equal(r.lime, 'quicklime'); assert.equal(r.cement, 'cement');
  assert.equal(r.concrete, 'concrete'); assert.equal(r.eras, 4); assert.equal(r.idx, 3);
  for (const t of ['steam', 'steel', 'steam_engine', 'train', 'quicklime', 'cement', 'concrete']) assert.ok(r.missionTargets.includes(t), t);
});

test('every mission target is reachable from recipes or molecules', async () => {
  const bad = await run(A => A.MISSIONS.map(m => m.target).filter(t => !A.MOLECULES[t] && !A.RECIPES.some(r => r.output === t)));
  assert.deepEqual(bad, []);
});

test('save file round-trips and rejects junk', async () => {
  const r = await run(A => {
    const text = A.exportSave({ found: ['H2O', 'fire'], missionIdx: 0, muted: true, trayIntro: true });
    const back = A.importSave(text);
    const junk = A.importSave('hello');
    const other = A.importSave(JSON.stringify({ app: 'other', found: ['H2O'] }));
    const unknown = A.importSave(JSON.stringify({ app: 'atomciv', version: 1, state: { found: ['H2O', 'rocket'] } }));
    return { hasApp: JSON.parse(text).app, back, junk, other, unknown };
  });
  assert.equal(r.hasApp, 'atomciv');
  assert.deepEqual(r.back.found, ['H2O', 'fire']);
  assert.equal(r.back.muted, true);
  assert.equal(r.junk, null);
  assert.equal(r.other, null);
  assert.deepEqual(r.unknown.found, ['H2O']);
});

test('hex map: every invention has its own tile and territory grows with discoveries', async () => {
  const r = await run(A => {
    const inv = Object.keys(A.ITEMS).filter(k => !A.ITEMS[k].raw);
    const keys = inv.map(k => A.MAP_TILES[k] && A.MAP_TILES[k].join(','));
    const t0 = A.territory([]), t1 = A.territory(['fire']);
    const fireKey = A.MAP_TILES.fire.join(',');
    return {
      missing: inv.filter(k => !A.MAP_TILES[k]),
      unique: new Set(keys).size === keys.length,
      inRange: inv.every(k => A.hexDist(A.MAP_TILES[k], [0, 0]) <= A.MAP_RADIUS - 1),
      owned0: t0.owned.size, owned1: t1.owned.size, fireOwned: t1.owned.has(fireKey),
      fireFoggedAtStart: !t0.visible.has(A.MAP_TILES.copper.join(',')),
      visibleBiggerThanOwned: t0.visible.size > t0.owned.size,
    };
  });
  assert.deepEqual(r.missing, []);
  assert.ok(r.unique, 'unique tiles');
  assert.ok(r.inRange, 'inside the island');
  assert.equal(r.owned0, 7);
  assert.ok(r.owned1 > r.owned0);
  assert.ok(r.fireOwned);
  assert.ok(r.fireFoggedAtStart);
  assert.ok(r.visibleBiggerThanOwned);
});
