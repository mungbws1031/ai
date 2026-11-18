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
