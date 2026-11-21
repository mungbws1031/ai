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

async function addOilTteokbokki(page) {
  await page.click('.nav button[data-view="sense"]');
  await page.click(".scard:has-text('기름떡볶이맛')");
  await page.click("text=살 재료 · 만드는 법");
  await page.click("#dishSheet .dish-opt >> nth=0");
  await page.click('#dishSheet [data-serv="2"]');
  await page.click("#dishSheet .dish-add");
}

test("감성 카드 → 요리 고르기 → 담기 → 장바구니에 떡", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.waitForSelector("#cartCount", { state: "visible" });
  const n = Number(await page.innerText("#cartCount"));
  assert.ok(n > 0);
  await page.click('.nav button[data-view="cart"]');
  const txt = await page.innerText("#cartList");
  assert.ok(txt.includes("떡볶이 떡"), txt);
  assert.ok(txt.includes("400g"), txt);
  assert.strictEqual(await page.getAttribute('.nav button[data-view="cart"]', "class"), "on");
}));

test("집에 있어요를 누르면 아래 칸으로 내려간다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartList .cart-row:has-text("고춧가루") [data-act="home"]');
  assert.ok((await page.innerText("#cartHome")).includes("고춧가루"));
  assert.ok(!(await page.innerText("#cartList")).includes("고춧가루"));
  await page.click('#cartHome [data-name="고춧가루"]');
  assert.ok((await page.innerText("#cartList")).includes("고춧가루"));
}));

test("샀어요를 누르면 목록에서 빠지고 비우기도 된다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartList .cart-row:has-text("떡볶이 떡") [data-act="bought"]');
  assert.ok(!(await page.innerText("#cartList")).includes("떡볶이 떡"));
  page.on("dialog", d => d.accept());
  await page.click("#cartClear");
  assert.strictEqual(await page.evaluate(() => loadCart().length), 0);
}));

test("새로고침해도 장바구니가 남는다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.reload();
  await page.click('.nav button[data-view="cart"]');
  assert.ok((await page.innerText("#cartList")).includes("떡볶이 떡"));
}));

test("식단 탭 담기 버튼", () => withApp({ storage: { et_meal_plan: JSON.stringify({ mon: { d: "김밥" } }) } }, async page => {
  await goMore(page, "meal");
  await page.click("#mealShop button");
  await page.click('.nav button[data-view="cart"]');
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
  await page.click('.nav button[data-view="cart"]');
  const r = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  assert.ok(r[0] <= r[1], JSON.stringify(r));
}));

test("식단 담기 버튼을 두 번 눌러도 양이 두 배가 되지 않는다", () => withApp({ storage: { et_meal_plan: JSON.stringify({ mon: { d: "김밥" } }) } }, async page => {
  await goMore(page, "meal");
  await page.click("#mealShop button");
  const once = await page.evaluate(() => JSON.stringify(loadCart()));
  await page.click("#mealShop button");
  assert.strictEqual(await page.evaluate(() => JSON.stringify(loadCart())), once);
  assert.ok((await page.innerText("#toastMsg")).includes("이미"));
}));

test("냉장고 때문에 집에 있는 재료는 냉장고에 있음으로 표시된다", () => withApp({ storage: { et_fridge: JSON.stringify([{ name: "대파 1단", bought: "2026-11-18", days: 7 }]) } }, async page => {
  await page.evaluate(() => { addToCart([{ name: "대파", qty: "1대" }], "x"); showCart(); });
  assert.ok((await page.innerText("#cartHome")).includes("냉장고에 있음"));
}));

test("이름에 따옴표가 있어도 샀어요가 동작한다", () => withApp({}, async page => {
  await page.evaluate(() => { addToCart([{ name: 'a"b\'c', qty: "1개" }], "x"); showCart(); });
  await page.click('#cartList [data-act="bought"]');
  assert.strictEqual(await page.evaluate(() => loadCart().length), 0);
}));

/* ── Task 6: 구매 링크 · 고지 · 공유 · 앱 분기 ── */
const NATIVE_INIT = () => {
  window.Capacitor = { isNativePlatform: () => true, Plugins: {} };
  window.__opens = [];
  window.open = (...a) => { window.__opens.push(a); return null; };
};
const TTEOK_URL = "https://www.coupang.com/np/search?q=%EB%96%A1%EB%B3%B6%EC%9D%B4%20%EB%96%A1";

test("구매 버튼 링크는 검색 URL이고 고지 문구는 없다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  const btn = page.locator('#cartList .cart-row:has-text("떡볶이 떡") .cart-buy a, #cartList .cart-row:has-text("떡볶이 떡") .cart-buy button').first();
  assert.strictEqual((await btn.innerText()).trim(), "구매 →");
  const href = await btn.evaluate(el => el.getAttribute("href") || el.dataset.url);
  assert.strictEqual(href, TTEOK_URL);
  const body = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll("body *:not(script):not(style)")].map(e=>e.children.length?"":e.textContent).join(" "));
  assert.ok(!body.includes("쿠팡 파트너스") && !body.includes("수수료"));
}));

test("affiliate=true면 고지 문구가 장바구니 상단에 보인다", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  await page.evaluate(() => { SHOP_CONFIG.affiliate = true; renderCart(); });
  const first = await page.evaluate(() => document.querySelector("#view-cart").children[0].innerText);
  const disc = await page.evaluate(() => SHOP_CONFIG.disclosure);
  assert.ok(first.includes(disc), first);
  assert.ok(await page.locator("#view-cart .shop-disclosure").isVisible());
  await page.evaluate(() => { SHOP_CONFIG.affiliate = false; renderCart(); });
  assert.ok(!(await page.innerText("#view-cart")).includes("파트너스"));
}));

test("공유 문구 형식", () => withApp({}, async page => {
  await addOilTteokbokki(page);
  await page.evaluate(() => { addToCart([{ name: "후추", qty: "" }], "x"); });
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartList .cart-row:has-text("고춧가루") [data-act="home"]');
  const t = await page.evaluate(() => cartShareText());
  const lines = t.split("\n");
  assert.strictEqual(lines[0], "🛒 전자혀 장보기");
  assert.ok(lines.includes("□ 떡볶이 떡 400g"), t);
  assert.ok(lines.includes("□ 후추"), t);
  assert.ok(lines.every(l => !/ $/.test(l)), t);
  assert.strictEqual(lines[lines.length - 1], "(집에 있음: 고춧가루)");
  assert.ok(!t.includes("□ 고춧가루"));
  // 집에 있음이 없으면 마지막 줄 생략
  await page.click('#cartHome [data-name="고춧가루"]');
  const t2 = await page.evaluate(() => cartShareText());
  assert.ok(!t2.includes("집에 있음"), t2);
}));

test("공유: navigator.share → 클립보드 폴백", () => withApp({}, async page => {
  await page.addInitScript(() => {
    window.__shared = []; window.__copied = [];
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async t => { window.__copied.push(t); } }, configurable: true });
    Object.defineProperty(navigator, "share", { value: async d => { window.__shared.push(d); }, configurable: true });
  });
  await page.reload();
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  await page.click("#cartShare");
  const shared = await page.evaluate(() => window.__shared);
  assert.strictEqual(shared.length, 1);
  assert.strictEqual(shared[0].title, "장보기 목록");
  assert.ok(shared[0].text.startsWith("🛒 전자혀 장보기"));
  await page.evaluate(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await page.click("#cartShare");
  assert.ok((await page.evaluate(() => window.__copied))[0].startsWith("🛒 전자혀 장보기"));
  assert.ok((await page.innerText("#toastMsg")).includes("복사했어요"));
}));

test("네이티브 흉내일 때 구매 버튼은 _system으로 연다", () => withApp({}, async page => {
  await page.addInitScript(NATIVE_INIT);
  await page.reload();
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartList .cart-row:has-text("떡볶이 떡") .cart-buy >> text=구매');
  const opens = await page.evaluate(() => window.__opens);
  assert.deepStrictEqual(opens, [[TTEOK_URL, "_system"]]);
}));

test("웹에서는 구매 버튼이 _blank noopener로 연다", () => withApp({}, async page => {
  await page.addInitScript(() => { window.__opens = []; window.open = (...a) => { window.__opens.push(a); return null; }; });
  await page.reload();
  await addOilTteokbokki(page);
  await page.click('.nav button[data-view="cart"]');
  await page.click('#cartList .cart-row:has-text("떡볶이 떡") .cart-buy >> text=구매');
  assert.deepStrictEqual(await page.evaluate(() => window.__opens), [[TTEOK_URL, "_blank", "noopener"]]);
}));

test("네이티브 흉내일 때 SW 등록 안 함·알림 버튼 숨김", () => withApp({}, async page => {
  await page.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, Plugins: {} };
    window.__swReg = 0;
    const sw = navigator.serviceWorker || {};
    sw.register = () => { window.__swReg++; return Promise.resolve(); };
    try { Object.defineProperty(navigator, "serviceWorker", { value: sw, configurable: true }); } catch (e) {}
  });
  await page.reload();
  await page.waitForLoadState("load");
  await page.waitForTimeout(300);
  assert.strictEqual(await page.evaluate(() => window.__swReg), 0);
  await goMore(page, "fridge");
  assert.strictEqual(await page.locator("#frNotif").isVisible(), false);
}));

test("냉장고 때문에 집에 있는 재료는 눌러서 사야 해요로 되돌릴 수 있다", () => withApp({ storage: { et_fridge: JSON.stringify([{ name: "대파 한 단", bought: "2026-11-18", days: 7 }]) } }, async page => {
  await page.evaluate(() => { addToCart([{ name: "대파", qty: "1대" }], "x"); showCart(); });
  const btn = page.locator("#cartHome button[data-need]");
  assert.strictEqual((await btn.innerText()).trim(), "🧊 대파 · 냉장고에 있음 (눌러서 사야 해요)");
  await btn.click();
  assert.deepStrictEqual(await page.evaluate(() => loadNeed()), ["대파"]);
  assert.ok((await page.innerText("#cartList")).includes("대파"));
  assert.strictEqual(await page.locator("#cartHome button[data-need]").count(), 0);
  // 샀어요로 지우면 되돌림 기록도 사라진다
  await page.click('#cartList [data-act="bought"]');
  assert.deepStrictEqual(await page.evaluate(() => loadNeed()), []);
}));

test("냉장고 저장값이 {} 여도 로드 오류 없이 장바구니 버튼이 동작한다", () => withApp({ storage: { et_fridge: "{}" } }, async page => {
  await page.evaluate(() => { addToCart([{ name: "간장", qty: "1병" }], "x"); updateCartBadge(); });
  assert.ok(await page.locator("#cartCount").isVisible());
  await page.click('.nav button[data-view="cart"]');
  assert.ok((await page.innerText("#cartList")).includes("간장"));
}));

test("구매 → 터치 영역이 44px 이상이다", () => withApp({}, async page => {
  await page.evaluate(() => { addToCart([{ name: "간장", qty: "1병" }], "x"); showCart(); });
  const h = await page.evaluate(() => document.querySelector("#cartList .cart-buy a").offsetHeight);
  assert.ok(h >= 44, "height " + h);
}));

test("제휴 고지는 장바구니를 스크롤해도 화면 위에 붙어 있다", () => withApp({}, async page => {
  await page.evaluate(() => {
    SHOP_CONFIG.affiliate = true;
    addToCart(Array.from({ length: 25 }, (_, i) => ({ name: "재료" + i, qty: "1개" })), "x"); showCart();
  });
  assert.strictEqual(await page.evaluate(() => getComputedStyle(document.getElementById("shopDisclosure")).position), "sticky");
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForTimeout(400);
  const top = await page.evaluate(() => document.getElementById("shopDisclosure").getBoundingClientRect().top);
  assert.ok(Math.abs(top) <= 1, "top " + top);
}));
