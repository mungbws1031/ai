const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

async function withApp(fn) {
  const { browser, page } = await openApp({});
  try { await fn(page); } finally { await browser.close(); }
}
const IDS = ["pa_oil","oil_tteokbokki","maepdan","dan_jjan","chodding","honey_butter","fire_wok","eolkeun","mala","chojang"];

test("10개 맛 모두 요리가 2~3개, recipe는 RECIPES에 존재, main에 unit", () => withApp(async page => {
  const bad = await page.evaluate(ids => {
    const out = [];
    for (const id of ids) {
      const ds = TASTE_DISHES[id];
      if (!ds || ds.length < 2 || ds.length > 3) out.push(id + ":len");
      for (const d of ds || []) {
        if (d.recipe) { if (!RECIPES.some(r => r.name === d.recipe)) out.push(id + ":" + d.recipe); }
        else {
          if (!d.cat || !d.gPerServing) out.push(id + ":" + d.name + ":cat");
          if (!d.main || !d.main.length || d.main.some(m => !m.unit || !(m.per1 > 0))) out.push(id + ":" + d.name + ":main");
        }
      }
    }
    return out;
  }, IDS);
  assert.deepStrictEqual(bad, []);
}));

test("기름떡볶이 2인분 = 떡 400g + 고춧가루 포함, 물 없음", () => withApp(async page => {
  const lines = await page.evaluate(() => dishLines("oil_tteokbokki", TASTE_DISHES.oil_tteokbokki[0], 2));
  assert.ok(lines.some(l => l.name === "떡볶이 떡" && l.qty === "400g"));
  assert.ok(lines.some(l => l.name === "고춧가루"));
  assert.ok(!lines.some(l => l.name === "물"));
}));

test("인분을 두 배로 하면 주재료 양도 두 배", () => withApp(async page => {
  const lines = await page.evaluate(() => dishLines("oil_tteokbokki", TASTE_DISHES.oil_tteokbokki[0], 4));
  assert.ok(lines.some(l => l.name === "떡볶이 떡" && l.qty === "800g"));
}));

test("레시피 재사용 요리는 레시피 양념 문구를 그대로 쓴다", () => withApp(async page => {
  const r = await page.evaluate(() => {
    const d = TASTE_DISHES.pa_oil.find(x => x.recipe === "계란볶음밥");
    const names = dishLines("pa_oil", d, 2).map(l => l.name);
    const exp = RECIPES.find(x => x.name === "계란볶음밥").ing.map(i => splitIngLine(i).name);
    const four = dishLines("pa_oil", d, 4);
    return { names, exp, four };
  });
  assert.deepStrictEqual(r.names, r.exp);
  assert.deepStrictEqual(r.four.find(l => l.name === "계란").qty, "4개");
  assert.deepStrictEqual(r.four.find(l => l.name === "소금·후추").qty, "");
}));

test("재료 줄 분리: 수식어 제거, 숫자+단위만 스케일", () => withApp(async page => {
  const r = await page.evaluate(() => ({
    a: splitIngLine("따뜻한 밥 1공기"), b: splitIngLine("당근·시금치 약간"), c: splitIngLine("대파"),
    d: scaleQty("1.5공기", 2), e: scaleQty("약간", 2), f: scaleQty("2~3큰술", 2), g: scaleQty("1/2개", 2), h: scaleQty("2컵(400ml)", 2)
  }));
  assert.deepStrictEqual(r.a, { name: "밥", qty: "1공기" });
  assert.deepStrictEqual(r.b, { name: "당근·시금치", qty: "약간" });
  assert.deepStrictEqual(r.c, { name: "대파", qty: "" });
  assert.strictEqual(r.d, "3공기"); assert.strictEqual(r.e, "약간"); assert.strictEqual(r.f, "2~3큰술");
  assert.strictEqual(r.g, "1개"); assert.strictEqual(r.h, "2컵(400ml)");
}));
