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

test('H-O-O-O-H follows the rules but is unknown', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['H', 'O', 'O', 'O', 'H'], bonds: [[0, 1], [1, 2], [2, 3], [3, 4]] }),
    [{ status: 'unknown', key: 'H2O3' }]);
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
    train: A.matchRecipe(['steel', 'wheel', 'steam_engine'], false),
    lime: A.matchRecipe(['limestone'], true),
    cement: A.matchRecipe(['clay', 'quicklime'], true),
    concrete: A.matchRecipe(['H2O', 'O2Si', 'cement'], false),
    eras: A.ERAS.length,
    idx: A.eraIndex(['fire', 'stone_axe', 'charcoal', 'pottery', 'copper', 'tin', 'bronze', 'iron', 'glass']),
    missionTargets: A.MISSIONS.map(m => m.target),
  }));
  assert.equal(r.steam, 'steam'); assert.equal(r.steel, 'steel'); assert.equal(r.engine, 'steam_engine');
  assert.equal(r.train, 'train'); assert.equal(r.lime, 'quicklime'); assert.equal(r.cement, 'cement');
  assert.equal(r.concrete, 'concrete'); assert.equal(r.eras, 7); assert.equal(r.idx, 3);
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
    const unknown = A.importSave(JSON.stringify({ app: 'atomciv', version: 1, state: { found: ['H2O', 'time_machine'] } }));
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
    const inv = Object.keys(A.ITEMS).filter(k => !A.ITEMS[k].raw && !A.ITEMS[k].build);
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

test('electric era: recipes, eras, tiles', async () => {
  const r = await run(A => ({
    salt: A.matchRecipe(['H2O', 'ClNa'], false),
    zinc: A.matchRecipe(['charcoal', 'zinc_ore'], true),
    wire: A.matchRecipe(['copper'], false),
    battery: A.matchRecipe(['salt_water', 'zinc', 'copper'], false),
    bulb: A.matchRecipe(['battery', 'wire', 'glass'], false),
    motor: A.matchRecipe(['wire', 'battery', 'lodestone'], false),
    gen: A.matchRecipe(['steam_engine', 'wire', 'lodestone'], false),
    eras: A.ERAS.map(e => e.id),
    last: A.ERAS.find(e => e.id === 'electric').goal,
  }));
  assert.equal(r.salt, 'salt_water'); assert.equal(r.zinc, 'zinc'); assert.equal(r.wire, 'wire');
  assert.equal(r.battery, 'battery'); assert.equal(r.bulb, 'bulb'); assert.equal(r.motor, 'motor'); assert.equal(r.gen, 'generator');
  assert.deepEqual(r.eras.slice(0, 5), ['stone', 'bronze', 'iron', 'industry', 'electric']);
  assert.deepEqual(r.last, ['battery', 'bulb', 'motor', 'generator']);
});

test('information era: recipes and eras', async () => {
  const r = await run(A => ({
    silicon: A.matchRecipe(['coal', 'O2Si'], true),
    chip: A.matchRecipe(['wire', 'silicon'], true),
    computer: A.matchRecipe(['chip', 'glass', 'battery'], false),
    radio: A.matchRecipe(['wire', 'battery', 'wire'], false),
    plastic: A.matchRecipe(['oil'], true),
    phone: A.matchRecipe(['plastic', 'radio', 'computer'], false),
    internet: A.matchRecipe(['radio', 'computer', 'wire'], false),
    eras: A.ERAS.map(e => e.id),
    last: A.ERAS.find(e => e.id === 'info'),
  }));
  assert.equal(r.silicon, 'silicon'); assert.equal(r.chip, 'chip'); assert.equal(r.computer, 'computer');
  assert.equal(r.radio, 'radio'); assert.equal(r.plastic, 'plastic'); assert.equal(r.phone, 'phone'); assert.equal(r.internet, 'internet');
  assert.deepEqual(r.eras.slice(0, 6), ['stone', 'bronze', 'iron', 'industry', 'electric', 'info']);
  assert.deepEqual(r.last.goal, ['chip', 'computer', 'phone', 'internet']);
  assert.deepEqual(r.last.raws, ['oil']);
});

test('no two recipes share the same ingredients and heat', async () => {
  const dup = await run(A => {
    const seen = {}, out = [];
    for (const r of A.RECIPES) { const k = [...r.inputs].sort().join('+') + (r.heat ? '🔥' : ''); if (seen[k]) out.push(k); seen[k] = 1; }
    return out;
  });
  assert.deepEqual(dup, []);
});

test('modern era: recipes, eras, bigger island', async () => {
  const r = await run(A => ({
    solar: A.matchRecipe(['glass', 'wire', 'silicon'], false),
    al: A.matchRecipe(['generator', 'aluminum_ore'], true),
    fuel: A.matchRecipe(['generator', 'H2O'], false),
    rocket: A.matchRecipe(['computer', 'rocket_fuel', 'aluminum'], false),
    sat: A.matchRecipe(['radio', 'solar_cell', 'rocket'], false),
    car: A.matchRecipe(['plastic', 'battery', 'motor'], false),
    wind: A.matchRecipe(['plastic', 'aluminum', 'generator'], false),
    eras: A.ERAS.map(e => e.id),
    last: A.ERAS[A.ERAS.length - 1],
    radius: A.MAP_RADIUS,
    h2Ingredient: A.RECIPES.some(x => x.inputs.includes('H2') || x.inputs.includes('O2')),
  }));
  assert.equal(r.solar, 'solar_cell'); assert.equal(r.al, 'aluminum'); assert.equal(r.fuel, 'rocket_fuel');
  assert.equal(r.rocket, 'rocket'); assert.equal(r.sat, 'satellite'); assert.equal(r.car, 'electric_car'); assert.equal(r.wind, 'wind_turbine');
  assert.deepEqual(r.eras, ['stone', 'bronze', 'iron', 'industry', 'electric', 'info', 'modern']);
  assert.deepEqual(r.last.goal, ['solar_cell', 'electric_car', 'rocket', 'satellite']);
  assert.deepEqual(r.last.raws, ['aluminum_ore']);
  assert.equal(r.radius, 8);
  assert.equal(r.h2Ingredient, false, 'first-mission molecules should not fall into the bowl');
});

test('new atoms F, S, Mg with the right hands and atomic numbers', async () => {
  const a = await run(A => ({ F: A.ATOMS.F, S: A.ATOMS.S, Mg: A.ATOMS.Mg }));
  assert.equal(a.F.hands, 1); assert.equal(a.F.z, 9);
  assert.equal(a.S.hands, 2); assert.equal(a.S.z, 16);
  assert.equal(a.Mg.hands, 2); assert.equal(a.Mg.z, 12);
});

test('new molecules are recognised', async () => {
  const cases = [
    [{ atoms: ['S', 'H', 'H'], bonds: [[0, 1], [0, 2]] }, 'H2S'],
    [{ atoms: ['H', 'F'], bonds: [[0, 1]] }, 'FH'],
    [{ atoms: ['F', 'F'], bonds: [[0, 1]] }, 'F2'],
    [{ atoms: ['Na', 'F'], bonds: [[0, 1]] }, 'FNa'],
    [{ atoms: ['Mg', 'O'], bonds: [[0, 1], [0, 1]] }, 'MgO'],
    [{ atoms: ['Cl', 'Mg', 'Cl'], bonds: [[0, 1], [1, 2]] }, 'Cl2Mg'],
    [{ atoms: ['H', 'O', 'O', 'H'], bonds: [[0, 1], [1, 2], [2, 3]] }, 'H2O2'],
    [{ atoms: ['C', 'C', 'H', 'H', 'H', 'H'], bonds: [[0, 1], [0, 1], [0, 2], [0, 3], [1, 4], [1, 5]] }, 'C2H4'],
    [{ atoms: ['C', 'C', 'H', 'H'], bonds: [[0, 1], [0, 1], [0, 1], [0, 2], [1, 3]] }, 'C2H2'],
    [{ atoms: ['N', 'N', 'H', 'H', 'H', 'H'], bonds: [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5]] }, 'H4N2'],
    [{ atoms: ['C', 'C', 'O', 'H', 'H', 'H', 'H', 'H', 'H'], bonds: [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8]] }, 'C2H6O'],
    [{ atoms: ['C', 'C', 'C', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'], bonds: [[0, 1], [1, 2], [0, 3], [0, 4], [0, 5], [1, 6], [1, 7], [2, 8], [2, 9], [2, 10]] }, 'C3H8'],
  ];
  for (const [spec, key] of cases) assert.deepEqual(await judgeOf(spec), [{ status: 'known', key }], key);
});

test('every known molecule has a display formula, emoji and why', async () => {
  const bad = await run(A => Object.entries(A.MOLECULES).filter(([, m]) => !m.formula || !m.emoji || !m.why || !m.name).map(([k]) => k));
  assert.deepEqual(bad, []);
});

test('train needs a steam engine, wheels and steel rails', async () => {
  const r = await run(A => ({
    wheel: A.matchRecipe(['steel'], true),
    train: A.matchRecipe(['wheel', 'steel', 'steam_engine'], false),
    oldTrain: A.matchRecipe(['steam_engine', 'steel'], false),
    missions: A.MISSIONS.map(m => m.target),
  }));
  assert.equal(r.wheel, 'wheel');
  assert.equal(r.train, 'train');
  assert.equal(r.oldTrain, null);
  assert.ok(r.missions.indexOf('wheel') < r.missions.indexOf('train'));
});

test('hintText lists every ingredient of the mission', async () => {
  const r = await run(A => ({
    train: A.hintText(A.MISSIONS.find(m => m.target === 'train')),
    iron: A.hintText(A.MISSIONS.find(m => m.target === 'iron')),
    water: A.hintText(A.MISSIONS.find(m => m.target === 'H2O')),
  }));
  for (const w of ['증기기관', '바퀴', '강철']) assert.match(r.train, new RegExp(w));
  assert.match(r.iron, /철광석/); assert.match(r.iron, /숯/); assert.match(r.iron, /불/);
  assert.match(r.water, /H/); assert.match(r.water, /O/); assert.match(r.water, /2/);
});

test('more atoms: K, Ca, P, I, He, Ne', async () => {
  const a = await run(A => ['K', 'Ca', 'P', 'I', 'He', 'Ne'].map(s => [s, A.ATOMS[s] && A.ATOMS[s].hands, A.ATOMS[s] && A.ATOMS[s].z]));
  assert.deepEqual(a, [['K', 1, 19], ['Ca', 2, 20], ['P', 3, 15], ['I', 1, 53], ['He', 0, 2], ['Ne', 0, 10]]);
});

test('noble gases are complete on their own; other lone atoms are not', async () => {
  assert.deepEqual(await judgeOf({ atoms: ['He'], bonds: [] }), [{ status: 'known', key: 'He' }]);
  assert.deepEqual(await judgeOf({ atoms: ['Ne'], bonds: [] }), [{ status: 'known', key: 'Ne' }]);
  assert.equal((await judgeOf({ atoms: ['H'], bonds: [] }))[0].status, 'incomplete');
});

test('molecules with the new atoms', async () => {
  const cases = [
    [{ atoms: ['K', 'Cl'], bonds: [[0, 1]] }, 'ClK'],
    [{ atoms: ['K', 'I'], bonds: [[0, 1]] }, 'IK'],
    [{ atoms: ['Ca', 'O'], bonds: [[0, 1], [0, 1]] }, 'CaO'],
    [{ atoms: ['Cl', 'Ca', 'Cl'], bonds: [[0, 1], [1, 2]] }, 'CaCl2'],
    [{ atoms: ['F', 'Ca', 'F'], bonds: [[0, 1], [1, 2]] }, 'CaF2'],
    [{ atoms: ['I', 'I'], bonds: [[0, 1]] }, 'I2'],
    [{ atoms: ['P', 'P', 'P', 'P'], bonds: [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]] }, 'P4'],
  ];
  for (const [spec, key] of cases) assert.deepEqual(await judgeOf(spec), [{ status: 'known', key }], key);
});

test('combineTray treats fire in the bowl as heat', async () => {
  const r = await run(A => ({
    charcoal: A.combineTray(['wood', 'fire']),
    noFire: A.combineTray(['wood']),
    glass: A.combineTray(['fire', 'O2Si']),
    fireOnly: A.combineTray(['fire']),
    makeFire: A.combineTray(['wood', 'flint']),
  }));
  assert.equal(r.charcoal, 'charcoal'); assert.equal(r.noFire, null); assert.equal(r.glass, 'glass');
  assert.equal(r.fireOnly, null); assert.equal(r.makeFire, 'fire');
});

test('more everyday molecules are recognised', async () => {
  // [원자 목록, 결합 목록(같은 쌍 반복 = 이중결합), 기대하는 이름 일부]
  const cases = [
    [['C', 'H', 'H', 'H', 'O', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4], [4, 5]], '메탄올'],
    [['C', 'H', 'O', 'O', 'H'], [[0, 1], [0, 2], [0, 2], [0, 3], [3, 4]], '폼산'],
    [['C', 'C', 'H', 'H', 'H', 'O', 'O', 'H'], [[0, 1], [0, 2], [0, 3], [0, 4], [1, 5], [1, 5], [1, 6], [6, 7]], '아세트산'],
    [['C', 'O', 'N', 'N', 'H', 'H', 'H', 'H'], [[0, 1], [0, 1], [0, 2], [0, 3], [2, 4], [2, 5], [3, 6], [3, 7]], '요소'],
    [['C', 'C', 'C', 'C', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
      [[0, 1], [1, 2], [2, 3], [0, 4], [0, 5], [0, 6], [1, 7], [1, 8], [2, 9], [2, 10], [3, 11], [3, 12], [3, 13]], '부테인'],
    [['Na', 'O', 'H'], [[0, 1], [1, 2]], '수산화나트륨'],
    [['Ca', 'O', 'H', 'O', 'H'], [[0, 1], [1, 2], [0, 3], [3, 4]], '수산화칼슘'],
    [['Mg', 'O', 'H', 'O', 'H'], [[0, 1], [1, 2], [0, 3], [3, 4]], '수산화마그네슘'],
    [['H', 'O', 'Cl'], [[0, 1], [1, 2]], '차아염소산'],
    [['Na', 'O', 'Cl'], [[0, 1], [1, 2]], '락스'],
    [['N', 'H', 'H', 'C', 'H', 'H', 'C', 'O', 'O', 'H'], [[0, 1], [0, 2], [0, 3], [3, 4], [3, 5], [3, 6], [6, 7], [6, 7], [6, 8], [8, 9]], '글리신'],
    [['Ca', 'O', 'O', 'C', 'O'], [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 4]], '탄산칼슘'],
    [['Na', 'O', 'C', 'O', 'O', 'H'], [[0, 1], [1, 2], [2, 3], [2, 3], [2, 4], [4, 5]], '탄산수소나트륨'],
    [['H', 'O', 'C', 'O', 'O', 'H'], [[0, 1], [1, 2], [2, 3], [2, 3], [2, 4], [4, 5]], '탄산'],
  ];
  for (const [atoms, bonds, name] of cases) {
    const r = await run((A, s) => {
      let g = { atoms: s.atoms.map((sym, i) => ({ id: 'a' + i, sym })), bonds: [] };
      for (const [x, y] of s.bonds) g = A.addBond(g, 'a' + x, 'a' + y);
      return A.judge(g).map(j => ({ status: j.status, name: j.molecule && j.molecule.name }));
    }, { atoms, bonds });
    assert.equal(r.length, 1, name);
    assert.equal(r[0].status, 'known', name);
    assert.match(r[0].name, new RegExp(name), name);
  }
});

test('new molecules feed real inventions, each taught right before', async () => {
  const r = await run(A => ({
    cave: A.matchRecipe(['CCaO3', 'charcoal'], false),
    mortar: A.matchRecipe(['CaH2O2', 'O2Si', 'H2O'], false),
    soda: A.matchRecipe(['CH2O3', 'glass'], false),
    lamp: A.matchRecipe(['CH4O', 'glass'], false),
    lighter: A.matchRecipe(['C4H10', 'steel', 'flint'], false),
    ext: A.matchRecipe(['CHNaO3', 'C2H4O2', 'steel'], false),
    water: A.matchRecipe(['ClHO', 'H2O'], false),
    fert: A.matchRecipe(['CH4N2O', 'H2O'], false),
    missions: A.MISSIONS.map(m => m.target),
  }));
  const pairs = { cave_painting: ['CCaO3'], mortar: ['CaH2O2'], soda_drink: ['CH2O3'], alcohol_lamp: ['CH4O'],
    lighter: ['C4H10'], extinguisher: ['CHNaO3', 'C2H4O2'], clean_water: ['ClHO'], fertilizer: ['CH4N2O'] };
  assert.deepEqual([r.cave, r.mortar, r.soda, r.lamp, r.lighter, r.ext, r.water, r.fert],
    ['cave_painting', 'mortar', 'soda_drink', 'alcohol_lamp', 'lighter', 'extinguisher', 'clean_water', 'fertilizer']);
  for (const [item, mols] of Object.entries(pairs)) {
    const i = r.missions.indexOf(item);
    assert.ok(i > 0, item);
    for (const m of mols) { const j = r.missions.indexOf(m); assert.ok(j >= 0 && j < i, `${m} before ${item}`); }
  }
});

test('reaction order: molecules made from molecules in the bowl', async () => {
  const r = await run(A => ({
    caoh: A.matchRecipe(['CaO', 'H2O'], false),
    caco3: A.matchRecipe(['CaH2O2', 'CO2'], false),
    h2co3: A.matchRecipe(['CO2', 'H2O'], false),
    soda: A.matchRecipe(['HNaO', 'CO2'], false),
    hocl: A.matchRecipe(['Cl2', 'H2O'], false),
    bleach: A.matchRecipe(['HNaO', 'Cl2'], false),
    urea: A.matchRecipe(['H3N', 'CO2'], true),
    mgoh: A.matchRecipe(['MgO', 'H2O'], false),
    cl2: A.MOLECULES.Cl2 && A.MOLECULES.Cl2.name,
    m: A.MISSIONS.map(x => x.target),
    hint: A.hintText(A.MISSIONS.find(x => x.target === 'CCaO3')),
  }));
  assert.deepEqual([r.caoh, r.caco3, r.h2co3, r.soda, r.hocl, r.bleach, r.urea, r.mgoh],
    ['CaH2O2', 'CCaO3', 'CH2O3', 'CHNaO3', 'ClHO', 'ClNaO', 'CH4N2O', 'H2MgO2']);
  assert.match(r.cl2, /염소/);
  const before = (a, b) => assert.ok(r.m.indexOf(a) >= 0 && r.m.indexOf(a) < r.m.indexOf(b), `${a} before ${b}`);
  before('CaO', 'CaH2O2'); before('CaH2O2', 'CCaO3'); before('CCaO3', 'cave_painting');
  before('HNaO', 'CHNaO3'); before('Cl2', 'ClHO'); before('H3N', 'CH4N2O');
  assert.match(r.hint, /수산화칼슘/); assert.match(r.hint, /이산화탄소/);
});

test('difficulty mode: old saves are normal, files keep the mode', async () => {
  const r = await run(A => ({
    old: A.modeOf({ found: [] }),
    back: A.importSave(A.exportSave({ found: ['H2O'], mode: 'hard' })).mode,
    junk: A.importSave(JSON.stringify({ app: 'atomciv', version: 1, state: { found: [], mode: 'god' } })).mode,
  }));
  assert.equal(r.old, 'normal'); assert.equal(r.back, 'hard'); assert.equal(A_ok(r.junk), true);
});
function A_ok(m) { return m === undefined || m === 'normal'; }

test('every mission can be done in order: ingredients come from earlier missions or unlocked raws', async () => {
  const bad = await run(A => {
    const found = [], out = [];
    for (const m of A.MISSIONS) {
      const r = A.ITEMS[m.target] ? A.RECIPES.find(x => x.output === m.target) : null;
      if (r) {
        const raws = A.ERAS.slice(0, A.eraIndex(found) + 1).flatMap(e => e.raws);
        for (const id of r.inputs) if (!found.includes(id) && !raws.includes(id)) out.push(`${m.target} needs ${id}`);
        if (r.heat && !found.includes('fire')) out.push(`${m.target} needs fire`);
      }
      found.push(m.target);
    }
    return out;
  });
  assert.deepEqual(bad, []);
});

test('content pack: 40 more inventions, each with a mission', async () => {
  const r = await run(A => ({
    inventions: Object.keys(A.ITEMS).filter(k => !A.ITEMS[k].raw).length,
    missions: A.MISSIONS.length,
    infoAndLater: A.MISSIONS.map(m => m.target).slice(A.MISSIONS.findIndex(m => m.target === 'silicon')).length,
    noMission: Object.keys(A.ITEMS).filter(k => !A.ITEMS[k].raw && !A.MISSIONS.some(m => m.target === k)),
  }));
  assert.ok(r.inventions >= 86, `inventions ${r.inventions}`);
  assert.deepEqual(r.noMission.filter(k => k !== 'steam'), []);
  assert.ok(r.infoAndLater >= 40, `info+modern missions ${r.infoAndLater}`);
});

test('buildings: 21 of them, and played in mission order every one has a place to stand', async () => {
  const r = await run(A => {
    const builds = Object.keys(A.ITEMS).filter(k => A.ITEMS[k].build);
    const found = [], placed = {}, stuck = [];
    for (const m of A.MISSIONS) {
      found.push(m.target);
      if (A.ITEMS[m.target] && A.ITEMS[m.target].build) {
        const sites = A.validSites(m.target, found, placed);
        if (!sites.length) stuck.push(m.target); else placed[m.target] = sites[0];
      }
    }
    return { n: builds.length, missing: builds.filter(b => !A.MISSIONS.some(m => m.target === b)), stuck,
      noTile: builds.filter(b => A.MAP_TILES[b]) };
  });
  assert.equal(r.n, 21);
  assert.deepEqual(r.missing, []);
  assert.deepEqual(r.stuck, []);
  assert.deepEqual(r.noTile, [], 'buildings have no fixed tile');
});

test('buildings: a bridge on water extends the border, a farm changes the terrain', async () => {
  const r = await run(A => {
    const all = A.MISSIONS.map(m => m.target);
    const found = all.slice(0, all.indexOf('bridge') + 1); // 다리를 처음 만들었을 때
    const bridgeSite = A.validSites('bridge', found, {})[0];
    const before = A.territory(found, {}).owned.size;
    const after = A.territory(found, { bridge: bridgeSite }).owned.size;
    const farmSite = A.validSites('farm', found, {})[0];
    return { bridgeTerrain: A.terrainAt(bridgeSite[0], bridgeSite[1], {}), grew: after > before,
      farmBefore: A.terrainAt(farmSite[0], farmSite[1], {}), farmAfter: A.terrainAt(farmSite[0], farmSite[1], { farm: farmSite }) };
  });
  assert.equal(r.bridgeTerrain, 'water');
  assert.ok(r.grew, 'territory grows across the water');
  assert.ok(['grass', 'plains'].includes(r.farmBefore));
  assert.equal(r.farmAfter, 'farm');
});

test('buildings: placements survive the save file', async () => {
  const r = await run(A => A.importSave(A.exportSave({ found: ['hut'], placed: { hut: [2, 2], bogus: [0, 0] } })).placed);
  assert.deepEqual(r, { hut: [2, 2] });
});

test('review: the dam lake never floods a tile that holds an invention or building', async () => {
  const r = await run(A => {
    const found = A.MISSIONS.map(m => m.target);
    const dam = A.validSites('dam', found, {})[0];
    const near = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([dq, dr]) => [dam[0] + dq, dam[1] + dr]);
    const spot = near.find(t => ['grass', 'plains'].includes(A.terrainAt(t[0], t[1], {})) && !Object.values(A.MAP_TILES).some(x => x[0] === t[0] && x[1] === t[1]));
    return { spot, terr: spot && A.terrainAt(spot[0], spot[1], { dam, hut: spot }) };
  });
  assert.ok(r.spot, 'found a grass tile next to the dam');
  assert.notEqual(r.terr, 'water');
});

test('review: hard-mode hint counts survive the save file', async () => {
  const r = await run(A => A.importSave(A.exportSave({ found: ['H2'], mode: 'hard', hintUsed: { H2O: 3, junk: 'x' } })).hintUsed);
  assert.deepEqual(r, { H2O: 3 });
});
