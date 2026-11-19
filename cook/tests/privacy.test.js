const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { openApp, pageUrl, loadPlaywright } = require("./helpers");

const DEVICE = "Pixel 7";

test("개인정보처리방침 페이지 내용", async () => {
  const { browser, page } = await openApp({ device: DEVICE });
  try {
    await page.goto(pageUrl("privacy.html"));
    assert.strictEqual((await page.innerText("h1")).trim(), "개인정보처리방침");
    const body = await page.innerText("body");
    assert.ok(body.includes("수집하지 않"), body);
    assert.ok(body.includes("2026-11-18"));
    // 출시 전에는 자리표시자, 이메일을 넣은 뒤에는 실제 이메일 — 둘 다 통과해야 CI 가 막히지 않는다
    assert.match(body, /문의[^\n]*?(\S+@\S+\.\S+|\{\{CONTACT_EMAIL\}\})/);
    assert.ok(body.includes("쿠팡 파트너스") || body.includes("제휴"));
    assert.ok(body.includes("삭제"));
    assert.ok(body.includes("Google Fonts"), body);
    assert.ok(body.includes("외부 연결"), body);
    assert.strictEqual(await page.getAttribute('a[href="./index.html"]', "href"), "./index.html");
    assert.deepStrictEqual(page.__errors, []);
  } finally { await browser.close(); }
});

test("모바일 폭(360px)에서 가로 스크롤이 없다", async () => {
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await context.newPage();
  try {
    await page.goto(pageUrl("privacy.html"));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, "overflow " + overflow);
  } finally { await browser.close(); }
});

test("저장 탭 하단에 개인정보처리방침 링크가 있다", async () => {
  const { browser, page } = await openApp({ device: DEVICE });
  try {
    await page.click('.nav button[data-view="more"]');
    await page.click('#view-more [data-go="saved"]');
    const link = page.locator('#view-saved a[href="./privacy.html"]');
    assert.strictEqual(await link.count(), 1);
    assert.strictEqual((await link.innerText()).trim(), "개인정보처리방침");
    assert.strictEqual(await link.getAttribute("target"), null);
  } finally { await browser.close(); }
});

test("서비스워커 캐시에 privacy.html이 들어가고 버전이 올라갔다", () => {
  const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
  assert.ok(sw.includes('"./privacy.html"'));
  assert.ok(sw.includes('const CACHE = "jeonjahyeo-v7"'));
});
