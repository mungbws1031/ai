const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

async function withApp(fn) {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  page.setDefaultTimeout(4000);
  try { await fn(page); assert.deepStrictEqual(page.__errors, []); } finally { await browser.close(); }
}

const LEVELS = ["계란 프라이 할 줄 알면 OK", "라면 끓일 줄 알면 OK", "한두 번 해 보면 OK"];

test("dishes.js가 불러와지고 형식이 맞다", () => withApp(async page => {
  const list = await page.evaluate(() => HOME_DISHES);
  assert.ok(list.length >= 2);
  const cats = ["rice", "soup", "stir", "side", "noodle", "snack", "egg", "western"];
  for (const h of list) {
    assert.ok(h.name && h.emoji && h.time, h.name);
    assert.ok([1, 2, 3].includes(h.level), h.name);
    assert.ok(cats.includes(h.cat), h.name);
    assert.ok(Array.isArray(h.tools) && h.tools.length, h.name);
    assert.ok(Array.isArray(h.alias) && typeof h.kid === "boolean" && typeof h.kidTip === "string", h.name);
    assert.ok(Array.isArray(h.ing) && h.ing.length, h.name);
    for (const i of h.ing) assert.ok(i.n && ((i.a > 0 && i.u) || i.t), h.name + " " + i.n);
    assert.ok(h.steps.length >= 3, h.name);
    for (const s of h.steps) assert.ok(s.length >= 8, h.name + ": " + s);
  }
}));

test("이름은 앱 전체에서 중복 없다", () => withApp(async page => {
  // 맛 카드 요리는 여러 맛에 같은 요리가 있을 수 있고 RECIPES를 가리키기도 하므로, 요리 사전 이름이 기존과 겹치지 않는지 본다
  const r = await page.evaluate(() => {
    const old = new Set([...Object.values(TASTE_DISHES).flat().map(d => d.name), ...RECIPES.map(r => r.name)]);
    const home = HOME_DISHES.map(h => h.name);
    return { dupHome: home.length - new Set(home).size, clash: home.filter(n => old.has(n)), recipeDup: RECIPES.length - new Set(RECIPES.map(r => r.name)).size };
  });
  assert.deepStrictEqual(r, { dupHome: 0, clash: [], recipeDup: 0 });
}));

test("된장찌개·김볶밥·김치 볶음밥·된찌로 찾힌다", () => withApp(async page => {
  for (const q of ["된장찌개", "김볶밥", "김치 볶음밥", "된찌"]) {
    await page.fill("#dishSearch", q);
    const names = await page.$$eval("#dishResults .df-item", b => b.map(x => x.dataset.dish));
    const want = q.includes("된") ? "된장찌개" : "김치볶음밥";
    assert.ok(names.includes(want), q + " -> " + names.join(","));
  }
}));

test("만드는 법에 안심 정보·아이 팁, 4인분이면 양 두 배", () => withApp(async page => {
  await page.fill("#dishSearch", "된장찌개");
  await page.click('#dishResults [data-dish="된장찌개"]');
  const meta = await page.innerText("#dishSheet .howto-meta");
  assert.ok(meta.includes(LEVELS[1]) && meta.includes("분"), meta);
  assert.ok((await page.innerText("#dishSheet .howto-kid")).includes("👶 아이랑 먹는다면"));
  const first = async () => page.$eval("#dishSheet .howto-ing li b", b => parseFloat(b.textContent));
  const a2 = await first();
  await page.click('#dishSheet [data-serv="4"]');
  assert.strictEqual(await first(), a2 * 2);
}));

test("1인분 숟가락 양은 0.5 단위, 0이면 약간", () => withApp(async page => {
  const q = await page.evaluate(() => homeLines({ ing: [{ n: "간장", a: 0.5, u: "큰술" }, { n: "후추", a: 0.2, u: "작은술" }] }, 1).map(l => l.qty));
  assert.deepStrictEqual(q, ["0.5큰술", "약간"]);
}));

test("장바구니에 담으면 같은 재료 합침", () => withApp(async page => {
  for (const n of ["된장찌개", "김치볶음밥"]) {
    await page.evaluate(n => openHowTo(n), n);
    await page.click("#dishSheet .dish-add");
  }
  const cart = await page.evaluate(() => loadCart().filter(i => i.name === "다진마늘"));
  assert.strictEqual(cart.length, 1);
  assert.strictEqual(cart[0].unit, "큰술");
  assert.ok(cart[0].amt > 1);
}));

test("없는 요리는 인터넷 찾기 버튼", () => withApp(async page => {
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); }; });
  await page.fill("#dishSearch", "랍스터테르미도르");
  assert.ok((await page.innerText("#dishResults")).includes("아직 이 요리는 없어요. 비슷한 요리를 골라 보거나, 인터넷에서 레시피를 찾아볼 수 있어요."));
  await page.click("#dishResults .df-web");
  const url = await page.evaluate(() => window.__opened[0]);
  assert.ok(url.includes("10000recipe.com") && url.includes(encodeURIComponent("랍스터테르미도르")), url);
}));

test("👶 아이가 잘 먹는 바로가기", () => withApp(async page => {
  await page.click("#dishResults .df-kid");
  assert.ok((await page.innerText("#dishResults .df-head")).includes("👶 아이가 잘 먹는 요리"));
  const names = await page.$$eval("#dishResults .df-item", b => b.map(x => x.dataset.dish));
  assert.ok(names.length >= 1);
  const bad = await page.evaluate(ns => ns.filter(n => !HOME_DISHES.find(h => h.name === n && h.kid)), names);
  assert.deepStrictEqual(bad, []);
}));

test("placeholder·sub 문구", () => withApp(async page => {
  assert.strictEqual(await page.getAttribute("#dishSearch", "placeholder"), "뭐 해 먹을까요? 요리 이름이나 재료를 쳐 보세요");
  assert.strictEqual((await page.innerText("#view-sense .hd .sub")).trim(), "처음이어도 괜찮아요. 하나씩 같이 해요");
}));
