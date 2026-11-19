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
  assert.deepStrictEqual(r.four.find(l => l.name === "계란").qty, "8개"); // 계란볶음밥은 1인분 레시피(serves:1)
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
  assert.strictEqual(r.g, "1개"); assert.strictEqual(r.h, "4컵(800ml)");
}));

test("저장된 식단이 있어도 로드 시 오류 없고 장바구니 담기 버튼이 나온다", async () => {
  const { browser, page } = await openApp({ storage: { et_meal_plan: JSON.stringify({ mon: { d: "떡볶이" }, sat: { l: "계란볶음밥" } }) } });
  try {
    assert.deepStrictEqual(page.__errors, []);
    const n = await page.evaluate(() => document.querySelectorAll("#mealShop #mealToCart").length);
    assert.ok(n >= 1);
  } finally { await browser.close(); }
});

test("모든 요리 2인분 줄 이름은 중복 없음", () => withApp(async page => {
  const dup = await page.evaluate(() => {
    const o = [];
    for (const id in TASTE_DISHES) for (const d of TASTE_DISHES[id]) {
      const n = dishLines(id, d, 2).map(l => l.name);
      if (new Set(n).size !== n.length) o.push(id + "/" + d.name);
    }
    return o;
  });
  assert.deepStrictEqual(dup, []);
}));

test("계산된 양념량이 초보자에게 현실적 (지방 30g, 기타 40g 이하)", () => withApp(async page => {
  const bad = await page.evaluate(() => {
    const FAT = ["버터", "식용유", "참기름", "올리브오일"], o = [];
    for (const id in TASTE_DISHES) for (const d of TASTE_DISHES[id]) {
      if (d.recipe) continue;
      const mains = d.main.map(m => m.name);
      for (const l of dishLines(id, d, 2)) {
        const m = l.qty.match(/^(\d+(?:\.\d+)?)g$/); if (!m) continue;
        const a = parseFloat(m[1]);
        if (l.name === "물" || l.name === "육수") continue;
        if (FAT.includes(l.name) ? a > 30 : (!mains.includes(l.name) && a > 40)) o.push(d.name + " " + l.name + " " + l.qty);
      }
    }
    return o;
  });
  assert.deepStrictEqual(bad, []);
}));

test("1인분 레시피(계란볶음밥)는 2인분으로 담으면 2공기·4개", () => withApp(async page => {
  const r = await page.evaluate(() => {
    const d = TASTE_DISHES.pa_oil.find(x => x.recipe === "계란볶음밥");
    return { two: dishLines("pa_oil", d, 2), one: dishLines("pa_oil", d, 1), four: dishLines("pa_oil", d, 4) };
  });
  assert.strictEqual(r.two.find(l => l.name === "계란").qty, "4개");
  assert.strictEqual(r.two.find(l => l.name === "찬밥").qty, "2공기");
  assert.strictEqual(r.one.find(l => l.name === "계란").qty, "2개");
  assert.strictEqual(r.four.find(l => l.name === "계란").qty, "8개");
}));

test("참치마요덮밥도 1인분 기준: 2인분 = 밥 2공기, 참치캔 2개", () => withApp(async page => {
  const lines = await page.evaluate(() => {
    const d = Object.values(TASTE_DISHES).flat().find(x => x.recipe === "참치마요덮밥");
    return dishLines("x", d, 2);
  });
  assert.strictEqual(lines.find(l => l.name === "밥").qty, "2공기");
  assert.strictEqual(lines.find(l => l.name === "참치캔").qty, "2개");
}));

test("2인분 레시피(떡볶이)는 2인분 그대로, 4인분이면 두 배 (괄호 속 숫자도)", () => withApp(async page => {
  const r = await page.evaluate(() => {
    const d = Object.values(TASTE_DISHES).flat().find(x => x.recipe === "떡볶이");
    return { two: dishLines("oil_tteokbokki", d, 2), four: dishLines("oil_tteokbokki", d, 4),
      s2: scaleQty("2컵(400ml)", 2), s1: scaleQty("2컵(400ml)", 1), sh: scaleQty("2컵(400ml)", 0.5), g: scaleQty("1/2개(400g)", 2) };
  });
  assert.strictEqual(r.two.find(l => l.name === "떡").qty, "300g");
  assert.strictEqual(r.four.find(l => l.name === "떡").qty, "600g");
  assert.strictEqual(r.s2, "4컵(800ml)"); assert.strictEqual(r.s1, "2컵(400ml)"); assert.strictEqual(r.sh, "1컵(200ml)");
  assert.strictEqual(r.g, "1개(800g)");
}));

test("식단 담기: 1인분 레시피는 2인분으로, 2인분 레시피는 그대로", () => withApp(async page => {
  const r = await page.evaluate(() => {
    localStorage.removeItem("et_cart"); mealToCart(["계란볶음밥"]);
    const egg = loadCart().map(x => x.name + ":" + fmtQty(x));
    localStorage.removeItem("et_cart"); mealToCart(["김밥"]);
    const gb = loadCart().map(x => x.name + ":" + fmtQty(x));
    return { egg, gb };
  });
  assert.ok(r.egg.includes("계란:4개"), r.egg.join());
  assert.ok(r.egg.includes("찬밥:2공기"), r.egg.join());
  assert.ok(r.gb.includes("계란:2개") && r.gb.includes("밥:1.5공기"), r.gb.join());
}));

test("splitIngLine: 괄호 부분은 이름에서 뺀다", () => withApp(async page => {
  const r = await page.evaluate(() => ({
    a: splitIngLine("드레싱(흑임자 2T·간장 1T·식초 1T·참기름 1T·설탕 1t·다진 마늘 1/2t)"),
    b: splitIngLine("머스터드(선택)"), c: splitIngLine("쌀(아르보리오) 1컵"), d: splitIngLine("마늘 6쪽(편썰기)"),
  }));
  assert.strictEqual(r.a.name, "드레싱");
  assert.strictEqual(r.b.name, "머스터드");
  assert.deepStrictEqual(r.c, { name: "쌀", qty: "1컵" });
  assert.deepStrictEqual(r.d, { name: "마늘", qty: "6쪽(편썰기)" });
}));

test("물·생수는 장바구니에 담지 않는다 (요리 담기, 식단 담기 모두)", () => withApp(async page => {
  const r = await page.evaluate(() => {
    const d = Object.values(TASTE_DISHES).flat().find(x => x.recipe === "떡볶이");
    const viaDish = dishLines("oil_tteokbokki", d, 2).map(l => l.name);
    localStorage.removeItem("et_cart"); mealToCart(["떡볶이", "미소장국", "흑임자 두부 샐러드"]);
    return { viaDish, cart: loadCart().map(x => x.name) };
  });
  assert.ok(!r.viaDish.includes("물"));
  assert.ok(!r.cart.includes("물") && !r.cart.includes("생수"));
  assert.ok(r.cart.includes("떡") && r.cart.includes("드레싱"));
  assert.ok(!r.cart.some(n => n.includes("(")), r.cart.join());
}));
