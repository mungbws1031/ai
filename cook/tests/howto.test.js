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

test("단계 문장에서 타이머 시간을 읽는다", () => withApp(async page => {
  const r = await page.evaluate(() => [stepTimerSec("중불에서 3~4분, 노릇해질 때까지"), stepTimerSec("30초 더 볶아요"), stepTimerSec("양념을 섞어요"), stepTimerSec("15분 졸여요")]);
  assert.deepStrictEqual(r, [180, 30, 0, 900]);
}));

test("만드는 법 재료에 저울 없이 쓸 숟가락 양이 함께 나온다", () => withApp(async page => {
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-how");
  const t = await page.innerText("#dishSheet .howto-ing");
  assert.ok(/큰술|작은술/.test(t), t);
  assert.ok(t.includes("400g"), "주재료는 g/개 그대로: " + t);
}));

test("요리 모드: 한 단계씩 넘기고, 타이머가 끝나면 알리고, 마지막에 맛보기 처방이 나온다", () => withApp(async page => {
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-how");
  await page.click("#dishSheet .dish-cook");
  assert.ok((await page.innerText("#dishSheet .cook-prog")).includes("1 / 5"));
  assert.ok(await page.isDisabled('#dishSheet [data-ck="prev"]'));
  // 1단계 "5분 불리고" → 타이머 버튼
  assert.ok((await page.innerText("#dishSheet .cook-timer")).includes("5:00"));
  await page.click('#dishSheet [data-ck="next"]');
  await page.click('#dishSheet [data-ck="next"]');
  assert.ok((await page.innerText("#dishSheet .cook-prog")).includes("3 / 5"));
  await page.click('#dishSheet [data-ck="timer"]');
  assert.ok((await page.innerText("#dishSheet .cook-timer")).includes("남음"));
  await page.evaluate(() => { _cook.left = 1; });
  await page.waitForFunction(() => document.getElementById("toastMsg").textContent.includes("시간 됐어요"));
  // 이전으로 갔다가 끝까지
  await page.click('#dishSheet [data-ck="prev"]');
  assert.ok((await page.innerText("#dishSheet .cook-prog")).includes("2 / 5"));
  for (let i = 0; i < 4; i++) await page.click('#dishSheet [data-ck="next"]');
  assert.ok((await page.innerText("#dishSheet")).includes("이제 맛을 보세요"));
  await page.click('#dishSheet [data-fix="too_salty"]');
  assert.ok((await page.innerText("#cookFix")).includes("처방"));
  await page.click('#dishSheet [data-ck="good"]');
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
  assert.strictEqual(await page.evaluate(() => _cook), null);
}));

test("요리 모드에서 '← 만드는 법'으로 돌아가고, 장바구니에서 연 요리도 요리 모드가 된다", () => withApp(async page => {
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-how");
  await page.click("#dishSheet .dish-cook");
  await page.click('#dishSheet [data-ck="exit"]');
  assert.ok((await page.innerText("#dishSheet")).includes("만드는 법"));
  await page.click("#dishSheet .dish-add");
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartCook button[data-cook="기름떡볶이"]');
  await page.click("#dishSheet .dish-cook");
  assert.ok((await page.innerText("#dishSheet .cook-prog")).includes("1 / 5"));
  await page.click('#dishSheet [data-ck="exit"]');
  assert.ok((await page.innerText("#dishSheet")).includes("기름떡볶이 · 2인분"));
}));

test("요리 레시피 카드에서도 요리 모드를 시작할 수 있다", () => withApp(async page => {
  await page.click('.nav button[data-view="more"]');
  await page.click('#view-more [data-go="recipe"]');
  const card = page.locator('#recipeList .rc[data-name="떡볶이"]');
  await card.locator(".rch").click();
  await card.locator(".rc-cook").click();
  assert.ok((await page.innerText("#dishSheet .cook-prog")).includes("떡볶이"));
  await page.click('#dishSheet [data-ck="exit"]');
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
}));

test("양념 섞는 단계는 식용유를 빼라고 하고, 요리 모드에서 양념 양을 바로 보여 준다", () => withApp(async page => {
  const st = await page.evaluate(() => dishSteps(findDish("기름떡볶이").dish).steps[1]);
  assert.ok(st.includes("식용유는 빼고"), st);
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-how");
  await page.click("#dishSheet .dish-cook");
  assert.strictEqual(await page.locator("#dishSheet .cook-seas").count(), 0, "1단계엔 양념 목록 없음");
  await page.click('#dishSheet [data-ck="next"]');
  const t = await page.innerText("#dishSheet .cook-seas");
  assert.ok(t.includes("간장") && /큰술|작은술/.test(t), t);
  assert.ok(!t.includes("식용유"), t);
}));
