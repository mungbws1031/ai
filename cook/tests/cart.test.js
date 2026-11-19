const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

async function withApp(opts, fn) {
  const { browser, page } = await openApp(opts);
  try { await fn(page); } finally { await browser.close(); }
}

test("같은 재료·같은 단위는 합친다", () => withApp({}, async page => {
  const r = await page.evaluate(() => {
    addToCart([{ name: "대파", qty: "1대" }], "기름떡볶이");
    addToCart([{ name: "대파", qty: "1/2대" }], "파기름 볶음밥");
    const buy = cartView().buy;
    return { buy, q: fmtQty(buy[0]) };
  });
  assert.deepStrictEqual(r.buy, [{ name: "대파", amt: 1.5, unit: "대", from: ["기름떡볶이", "파기름 볶음밥"] }]);
  assert.strictEqual(r.q, "1.5대");
}));

test("단위가 다르면 들어온 순서대로 이어 붙인다", () => withApp({}, async page => {
  const q = await page.evaluate(() => {
    addToCart([{ name: "간장", qty: "2큰술" }], "a");
    addToCart([{ name: "간장", qty: "15g" }], "b");
    return fmtQty(cartView().buy[0]);
  });
  assert.strictEqual(q, "2큰술 + 15g");
}));

test("냉장고 이름이 장바구니 이름을 포함하면 집에 있음", () => withApp(
  { storage: { et_fridge: JSON.stringify([{ name: "대파 한 단", bought: "2026-11-18", days: 14 }]) } },
  async page => { assert.strictEqual(await page.evaluate(() => isHome("대파")), true); }));

test("짧은 냉장고 이름은 긴 재료를 덮지 않는다", () => withApp(
  { storage: { et_fridge: JSON.stringify([{ name: "파", bought: "2026-11-18", days: 14 }]) } },
  async page => { assert.strictEqual(await page.evaluate(() => isHome("대파")), false); }));

test("집에 있어요 체크는 home 칸으로 간다", () => withApp({}, async page => {
  const r = await page.evaluate(() => {
    addToCart([{ name: "간장", qty: "2큰술" }], "a");
    setHome("간장", true);
    const v = cartView();
    return { home: v.home.map(x => x.name), buy: v.buy.map(x => x.name) };
  });
  assert.deepStrictEqual(r, { home: ["간장"], buy: [] });
}));

test("다시 열어도 남아 있다", () => withApp({}, async page => {
  await page.evaluate(() => { addToCart([{ name: "간장", qty: "2큰술" }], "a"); setHome("소금", true); });
  await page.reload();
  const r = await page.evaluate(() => ({ n: loadCart().length, home: isHome("소금") }));
  assert.deepStrictEqual(r, { n: 1, home: true });
}));

test("깨진 저장값이면 빈 장바구니", () => withApp({ storage: { et_cart: "{oops" } }, async page => {
  assert.deepStrictEqual(await page.evaluate(() => loadCart()), []);
  assert.deepStrictEqual(page.__errors, []);
}));

test("parseQty", () => withApp({}, async page => {
  const r = await page.evaluate(() => ["400g", "1.5대", "1/2대", "2큰술 1작은술", ""].map(parseQty));
  assert.deepStrictEqual(r, [
    { amt: 400, unit: "g" }, { amt: 1.5, unit: "대" }, { amt: 0.5, unit: "대" },
    { amt: null, unit: "", text: "2큰술 1작은술" }, { amt: null, unit: "", text: "" },
  ]);
}));

const FRS = names => ({ et_fridge: JSON.stringify(names.map(name => ({ name, bought: "2026-11-18", days: 14 }))) });
const FR = names => ({ storage: FRS(names) });

test("냉장고 이름 매칭: 같은 이름·단어만 덮는다", () => withApp(
  FR(["대파 한 단", "순두부", "오이고추", "해산물", "닭다리살", "파"]),
  async page => {
    const r = await page.evaluate(() => ({
      daepa: isHome("대파"), dubu: isHome("두부"), oi: isHome("오이"), mul: isHome("물"), pa: isHome("대파") && false,
      exact: isHome("닭다리살"), soondubu: isHome("순두부"),
    }));
    assert.strictEqual(r.daepa, true);
    assert.strictEqual(r.dubu, false);
    assert.strictEqual(r.oi, false);
    assert.strictEqual(r.mul, false);
    assert.strictEqual(r.exact, true);
    assert.strictEqual(r.soondubu, true);
  }));

test("냉장고 이름 매칭: 이름이 공백 낀 재료도 단어 단위로", () => withApp(
  FR(["떡볶이 떡 한 봉", "양파"]),
  async page => {
    assert.strictEqual(await page.evaluate(() => isHome("떡볶이 떡")), true);
    assert.strictEqual(await page.evaluate(() => isHome("양")), false);
  }));

test("et_need는 냉장고 매칭만 되돌리고, 명시적 집에 있어요는 유지된다", () => withApp(
  { storage: { ...FRS(["대파 한 단"]), et_need: JSON.stringify(["대파"]), et_home: JSON.stringify(["간장"]) } },
  async page => {
    assert.strictEqual(await page.evaluate(() => isHome("대파")), false);
    assert.strictEqual(await page.evaluate(() => isHome("간장")), true);
    assert.strictEqual(await page.evaluate(() => { setHome("대파", true); return isHome("대파"); }), true);
  }));

test("removeFromCart / clearCart 는 해당 et_need 항목을 지운다", () => withApp(
  { storage: { et_need: JSON.stringify(["대파", "양파", "다른것"]) } }, async page => {
    const r = await page.evaluate(() => {
      addToCart([{ name: "대파", qty: "1대" }, { name: "양파", qty: "1개" }], "x");
      removeFromCart("대파"); const a = loadNeed().slice();
      clearCart(); const b = loadNeed().slice();
      return { a, b };
    });
    assert.deepStrictEqual(r.a, ["양파", "다른것"]);
    assert.deepStrictEqual(r.b, ["다른것"]);
  }));

test("깨진 냉장고 저장값(비배열)이어도 오류 없이 로드된다", () => withApp({ storage: { et_fridge: "{}" } }, async page => {
  assert.deepStrictEqual(await page.evaluate(() => loadFridge()), []);
  assert.deepStrictEqual(await page.evaluate(() => (localStorage.setItem("et_fridge", '"x"'), loadFridge())), []);
  assert.deepStrictEqual(page.__errors, []);
}));
