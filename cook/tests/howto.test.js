const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

async function withApp(fn) {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  page.setDefaultTimeout(4000);
  try { await fn(page); assert.deepStrictEqual(page.__errors, []); } finally { await browser.close(); }
}

test("맛 카드의 모든 요리에 조리 순서가 3단계 이상 있다", () => withApp(async page => {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const sid in TASTE_DISHES) for (const d of TASTE_DISHES[sid]) {
      const st = dishSteps(d).steps;
      if (!Array.isArray(st) || st.length < 3 || st.some(t => typeof t !== "string" || t.length < 8)) out.push(sid + "/" + d.name);
    }
    return out;
  });
  assert.deepStrictEqual(bad, []);
}));

test("요리 고르기 → 만드는 법: 재료 양과 순서가 보이고, 인분이 반영된다", () => withApp(async page => {
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-opt >> nth=0");
  await page.click('#dishSheet [data-serv="4"]');
  await page.click("#dishSheet .dish-how");
  const t = await page.innerText("#dishSheet");
  assert.ok(t.includes("기름떡볶이 · 4인분"), t);
  assert.ok(t.includes("800g"), "떡 4인분 = 800g: " + t);
  assert.ok(await page.locator("#dishSheet .howto-steps li").count() >= 3);
  // 목록으로 돌아가기, 그리고 만드는 법 화면에서 바로 담기
  await page.click("#dishSheet .dish-back");
  assert.ok((await page.innerText("#dishSheet")).includes("어떤 요리를 만들까요?"));
  await page.click("#dishSheet .dish-how");
  await page.click("#dishSheet .dish-add");
  await page.click('.nav button[data-view="cart"]');
  assert.ok((await page.innerText("#cartList")).includes("800g"));
}));

test("레시피에 연결된 요리(떡볶이)도 만드는 법이 나온다", () => withApp(async page => {
  const n = await page.evaluate(() => { const f = findDish("떡볶이"); return dishSteps(f.dish).steps.length; });
  assert.ok(n >= 3);
}));

test("장바구니에서 담은 요리의 만드는 법을 다시 열 수 있고, 담을 때 고른 인분을 기억한다", () => withApp(async page => {
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-opt >> nth=0");
  await page.click('#dishSheet [data-serv="1"]');
  await page.click("#dishSheet .dish-add");
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartCook button[data-cook="기름떡볶이"]');
  const t = await page.innerText("#dishSheet");
  assert.ok(t.includes("기름떡볶이 · 1인분"), t);
  assert.ok(t.includes("200g"), t);
  await page.click("#dishSheet .dish-close");
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
}));

test("빈 장바구니에는 만드는 법 줄이 없다", () => withApp(async page => {
  await page.click('.nav button[data-view="cart"]');
  assert.strictEqual((await page.innerText("#cartCook")).trim(), "");
}));
