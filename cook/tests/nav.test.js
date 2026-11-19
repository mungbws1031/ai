const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

const DEVICE = "Pixel 7";
async function withApp(opts, fn) {
  const { browser, page } = await openApp({ device: DEVICE, ...opts });
  page.setDefaultTimeout(4000);
  try { await fn(page); assert.deepStrictEqual(page.__errors, []); } finally { await browser.close(); }
}
async function goMore(page, viewId) {
  await page.click('.nav button[data-view="more"]');
  await page.click(`#view-more [data-go="${viewId}"]`);
}
const onTab = page => page.evaluate(() => [...document.querySelectorAll(".nav button.on")].map(b => b.dataset.view));
const isActive = (page, id) => page.evaluate(i => document.getElementById("view-" + i).classList.contains("active"), id);

test("탭은 4개이고 순서·문구가 맞다", () => withApp({}, async page => {
  const t = await page.$$eval(".nav button", bs => bs.map(b => b.innerText.replace(/\s+/g, "")));
  assert.deepStrictEqual(t, ["🍽️맛고르기", "🛒장바구니", "🧮계산", "☰더보기"]);
  const v = await page.$$eval(".nav button", bs => bs.map(b => b.dataset.view));
  assert.deepStrictEqual(v, ["sense", "cart", "calc", "more"]);
}));

test("첫 화면은 맛 고르기", () => withApp({}, async page => {
  assert.ok(await isActive(page, "sense"));
  assert.deepStrictEqual(await onTab(page), ["sense"]);
}));

test("더보기 7항목이 각 화면으로 간다", () => withApp({}, async page => {
  const ids = ["recipe", "sauce", "meal", "fridge", "fix", "saved", "explore"];
  assert.deepStrictEqual(await page.evaluate(() => MORE_VIEWS), ids);
  await page.click('.nav button[data-view="more"]');
  assert.deepStrictEqual(await page.$$eval("#view-more [data-go]", bs => bs.map(b => b.dataset.go)), ids);
  for (const id of ids) {
    await goMore(page, id);
    assert.ok(await isActive(page, id), id);
    assert.deepStrictEqual(await onTab(page), ["more"], id);
    const back = page.locator("#moreBack");
    assert.ok(await back.isVisible(), id);
    assert.ok((await back.innerText()).includes("더보기"));
    await back.click();
    assert.ok(await isActive(page, "more"), id);
    assert.strictEqual(await back.isVisible(), false);
  }
}));

test("더보기 밖 화면에서는 ← 더보기 줄이 없다", () => withApp({}, async page => {
  for (const v of ["sense", "cart", "calc", "more"]) {
    await page.click(`.nav button[data-view="${v}"]`);
    assert.strictEqual(await page.locator("#moreBack").isVisible(), false, v);
  }
}));

test("goSauce 뒤 더보기 탭 강조", () => withApp({}, async page => {
  await page.evaluate(() => goSauce(SAUCES[0].name));
  assert.deepStrictEqual(await onTab(page), ["more"]);
  assert.ok(await isActive(page, "sauce"));
}));

test("빈 장바구니 배지 숨김 / 담으면 숫자", () => withApp({}, async page => {
  assert.strictEqual(await page.locator("#cartCount").isVisible(), false);
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 담기");
  await page.click("#dishSheet .dish-opt >> nth=0");
  await page.click("#dishSheet .dish-add");
  assert.ok(await page.locator("#cartCount").isVisible());
  assert.ok(Number(await page.innerText("#cartCount")) > 0);
}));

test("떠 있는 장바구니 버튼 없음", () => withApp({}, async page => {
  assert.strictEqual(await page.locator("#cartFab").count(), 0);
}));

test("360px 가로 스크롤 없음", async () => {
  const { browser, page } = await openApp();
  try {
    await page.setViewportSize({ width: 360, height: 740 });
    for (const v of ["sense", "cart", "calc", "more"]) {
      await page.click(`.nav button[data-view="${v}"]`);
      const r = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert.ok(r[0] <= r[1], v + JSON.stringify(r));
    }
    const clipped = await page.$$eval(".nav button .tx", els => els.filter(e => e.scrollWidth > e.clientWidth).length);
    assert.strictEqual(clipped, 0);
  } finally { await browser.close(); }
});

test("탭·더보기 항목 접근 이름", () => withApp({}, async page => {
  assert.ok(await page.getByRole("button", { name: "더보기" }).count() >= 1);
  await page.click('.nav button[data-view="more"]');
  assert.ok(await page.getByRole("button", { name: /냉장고/ }).count() >= 1);
}));
