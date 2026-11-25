const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

async function withApp(fn) {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  page.setDefaultTimeout(4000);
  try { await fn(page); assert.deepStrictEqual(page.__errors, []); } finally { await browser.close(); }
}

test("첫 화면에 요리 찾기 칸과 '처음이라면' 추천 요리가 보인다", () => withApp(async page => {
  assert.ok(await page.isVisible("#dishSearch"));
  const t = await page.innerText("#dishResults");
  assert.ok(t.includes("처음이라면"), t);
  assert.ok(await page.locator("#dishResults .df-item").count() >= 5);
}));

test("요리 이름으로 찾아 한 번에 만드는 법을 연다", () => withApp(async page => {
  await page.fill("#dishSearch", "떡볶이");
  const names = await page.$$eval("#dishResults .df-item", b => b.map(x => x.dataset.dish));
  assert.ok(names.includes("기름떡볶이") && names.includes("떡볶이"), names.join(","));
  await page.click('#dishResults [data-dish="기름떡볶이"]');
  const t = await page.innerText("#dishSheet");
  assert.ok(t.includes("기름떡볶이 · 2인분") && t.includes("만드는 법"), t);
  // 인분 바꾸기
  await page.click('#dishSheet [data-serv="4"]');
  assert.ok((await page.innerText("#dishSheet")).includes("기름떡볶이 · 4인분"));
  // 바로 담기
  await page.click("#dishSheet .dish-add");
  await page.click('.nav button[data-view="cart"]');
  assert.ok((await page.innerText("#cartList")).includes("800g"));
}));

test("재료로 찾으면 그 재료가 들어간 요리가 나온다 (맛 카드 요리 + 요리 레시피)", () => withApp(async page => {
  await page.fill("#dishSearch", "닭");
  const names = await page.$$eval("#dishResults .df-item", b => b.map(x => x.dataset.dish));
  assert.ok(names.includes("간장 닭조림") && names.includes("달콤 닭강정"), names.join(","));
  await page.fill("#dishSearch", "계란");
  const n2 = await page.$$eval("#dishResults .df-item", b => b.map(x => x.dataset.dish));
  assert.ok(n2.includes("계란볶음밥"), n2.join(","));
  // 요리 레시피 쪽 요리도 만드는 법(요리 모드 포함)으로 열린다
  await page.click('#dishResults [data-dish="계란볶음밥"]');
  await page.click("#dishSheet .dish-cook");
  assert.ok((await page.innerText("#dishSheet .cook-prog")).includes("계란볶음밥"));
}));

test("없는 요리는 안내 문구를 보여 준다", () => withApp(async page => {
  await page.fill("#dishSearch", "랍스터테르미도르");
  assert.ok((await page.innerText("#dishResults")).includes("아직 이 요리는 없어요"));
}));

test("맛 카드 상세의 요리 이름도 바로 만드는 법으로 열린다", () => withApp(async page => {
  const name = await page.evaluate(() => { for (const w of TASTE_WORDS) for (const d of w.dishes) if (findDish(d)) return [TASTE_WORDS.indexOf(w), d]; return null; });
  assert.ok(name, "맛 카드 요리 중 만드는 법이 있는 요리");
  await page.locator("#senseGrid .scard").nth(name[0]).click();
  await page.click(`#senseDetail .sd-dish-chip:has-text("${name[1]}")`);
  assert.ok((await page.innerText("#dishSheet")).includes(name[1]));
}));
