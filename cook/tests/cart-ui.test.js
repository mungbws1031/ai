const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

const DEVICE = "Pixel 7";
async function withApp(opts, fn) {
  const { browser, page } = await openApp({ device: DEVICE, ...opts });
  page.setDefaultTimeout(4000);
  try { await fn(page); assert.deepStrictEqual(page.__errors, []); } finally { await browser.close(); }
}

async function addOilTteokbokki(page) {
  await page.click('.nav button[data-view="sense"]');
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 담기");
  await page.click("#dishSheet .dish-opt >> nth=0");
  await page.click('#dishSheet [data-serv="2"]');
  await page.click("#dishSheet .dish-add");
}

test("감성 카드 → 요리 고르기 → 담기 → 장바구니에 떡", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.waitForSelector("#cartFab", { state: "visible" });
  const n = Number(await page.innerText("#cartCount"));
  assert.ok(n > 0);
  await page.click("#cartFab");
  const txt = await page.innerText("#cartList");
  assert.ok(txt.includes("떡볶이 떡"), txt);
  assert.ok(txt.includes("400g"), txt);
  assert.strictEqual(await page.isVisible("#cartFab"), false);
}));

test("집에 있어요를 누르면 아래 칸으로 내려간다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click("#cartFab");
  await page.click('#cartList .cart-row:has-text("고춧가루") [data-act="home"]');
  assert.ok((await page.innerText("#cartHome")).includes("고춧가루"));
  assert.ok(!(await page.innerText("#cartList")).includes("고춧가루"));
  await page.click('#cartHome [data-name="고춧가루"]');
  assert.ok((await page.innerText("#cartList")).includes("고춧가루"));
}));

test("샀어요를 누르면 목록에서 빠지고 비우기도 된다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click("#cartFab");
  await page.click('#cartList .cart-row:has-text("떡볶이 떡") [data-act="bought"]');
  assert.ok(!(await page.innerText("#cartList")).includes("떡볶이 떡"));
  page.on("dialog", d => d.accept());
  await page.click("#cartClear");
  assert.strictEqual(await page.evaluate(() => loadCart().length), 0);
}));

test("새로고침해도 장바구니가 남는다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.reload();
  await page.click("#cartFab");
  assert.ok((await page.innerText("#cartList")).includes("떡볶이 떡"));
}));

test("식단 탭 담기 버튼", () => withApp({ storage: { et_meal_plan: JSON.stringify({ mon: { d: "김밥" } }) } }, async page => {
  await page.click('.nav button[data-view="meal"]');
  await page.click("#mealShop button");
  await page.click("#cartFab");
  assert.ok((await page.innerText("#cartList")).includes("김밥김"));
}));

test("계산 탭에도 담기 버튼이 있다", () => withApp({}, async page => {
  await page.click('.nav button[data-view="calc"]');
  await page.click("#styleChips .chip:has-text('기름떡볶이')");
  await page.click("#styleCartBtn");
  assert.ok(await page.isVisible("#dishSheet"));
}));

test("재료 양이 빈 줄은 이름만 보인다", () => withApp({}, async page => {
  await page.evaluate(() => { addToCart([{ name: "후추", qty: "" }], "x"); showCart(); });
  const row = await page.innerText('#cartList .cart-row:has-text("후추")');
  assert.ok(!/·\s*$|\+\s*$/.test(row.split("\n")[0].trim()));
}));

test("모바일 폭에서 가로 스크롤이 없다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click("#cartFab");
  const r = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(r[0] <= r[1], JSON.stringify(r));
}));
