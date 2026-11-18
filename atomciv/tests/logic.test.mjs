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
