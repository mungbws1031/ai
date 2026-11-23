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
  await page.click("text=살 재료 · 만드는 법");
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

/* ── 히스토리 (뒤로가기) ── */
test("더보기 → 냉장고 → 뒤로가기 → 더보기 화면", () => withApp({}, async page => {
  await goMore(page, "fridge");
  assert.ok(await isActive(page, "fridge"));
  await page.goBack();
  assert.ok(await isActive(page, "more"));
  assert.deepStrictEqual(await onTab(page), ["more"]);
  assert.strictEqual(await page.locator("#moreBack").isVisible(), false);
  assert.ok(page.url().endsWith("index.html"));
}));

test("← 더보기 버튼은 히스토리를 되감고, 이어서 뒤로가기해도 루프 없음", () => withApp({}, async page => {
  await goMore(page, "fridge");
  await page.click("#moreBack");
  assert.ok(await isActive(page, "more"));
  await page.goBack().catch(() => {});
  await page.waitForTimeout(150);
  const act = await page.evaluate(() => [...document.querySelectorAll(".view.active")].map(v => v.id));
  assert.ok(!act.includes("view-fridge"), act.join());
}));

test("탭 이동은 히스토리를 쌓지 않는다", () => withApp({}, async page => {
  const before = await page.evaluate(() => history.length);
  for (const v of ["cart", "calc", "sense", "more", "cart", "calc"]) await page.click(`.nav button[data-view="${v}"]`);
  assert.strictEqual(await page.evaluate(() => history.length), before);
}));

test("더보기 화면 간 연결(goSauce)도 뒤로가기로 돌아온다", () => withApp({}, async page => {
  await goMore(page, "recipe");
  await page.evaluate(() => goSauce(SAUCES[0].name));
  assert.ok(await isActive(page, "sauce"));
  await page.goBack();
  assert.ok(await isActive(page, "recipe"));
  await page.goBack();
  assert.ok(await isActive(page, "more"));
}));

test("앱 안 문구에 없어진 탭 이름이 없다", () => withApp({}, async page => {
  const re = /(탐색|요리|소스|식단|냉장|보정|저장|감성) 탭/;
  const html = await page.evaluate(() => document.documentElement.innerHTML + "\n" + [...document.scripts].map(s => s.textContent).join("\n"));
  assert.ok(!re.test(html), (html.match(re) || [])[0]);
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "index.html"), "utf8");
  assert.ok(!re.test(src));
  assert.ok(src.includes("더보기 › 요리 레시피"));
  await page.evaluate(() => { saveCart([]); });
  await goMore(page, "saved");
  assert.ok((await page.innerText("#view-saved")).includes("더보기 › 요리 레시피"));
}));

test("맛 고르기 화면 제목", () => withApp({}, async page => {
  assert.strictEqual((await page.innerText("#view-sense .hd .name")).trim(), "맛 고르기");
}));

test("배지는 살 것 개수, 집에 있는 건 제외, aria-label 동기화", () => withApp({}, async page => {
  const b = page.locator("#cartCount");
  assert.strictEqual(await b.isVisible(), false);
  await page.evaluate(() => { addToCart([{ name: "간장", qty: "1병" }, { name: "대파", qty: "1단" }], "x"); updateCartBadge(); });
  assert.strictEqual((await b.innerText()).trim(), "2");
  assert.strictEqual(await b.getAttribute("aria-label"), "살 재료 2개");
  assert.ok(await page.getByLabel("살 재료 2개").count() >= 1);
  await page.evaluate(() => { setHome("간장", true); updateCartBadge(); });
  assert.strictEqual((await b.innerText()).trim(), "1");
  assert.strictEqual(await b.getAttribute("aria-label"), "살 재료 1개");
  await page.click('.nav button[data-view="cart"]');
  assert.ok((await page.innerText("#cartSum")).includes("1개"));
  await page.evaluate(() => { setHome("대파", true); updateCartBadge(); });
  assert.strictEqual(await b.isVisible(), false);
}));
