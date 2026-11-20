const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { openApp } = require("./helpers");

// 사용자에게 보이는 말에 전문용어·옛 이름이 남지 않았는지 확인한다.
const BANNED = /셰프 미강|味江|味|요똥|존맛|조절좌|GOLDEN ZONE|황금 균형|Na⁺|글루탐산|이노신산|캡사이신|배합 시뮬레이터|5축|Taste Engine|TASTE ENGINE|Electronic Tongue|산미|산도|염도|지방감|시너지|Weekly Plan|Shopping Cart|Privacy Policy|시뮬레이터/i;

// 화면에 보이는 글자 + 접근성/입력 안내 속성을 모은다.
const collect = page => page.evaluate(() => {
  const attrs = [...document.querySelectorAll("[aria-label],[placeholder],[title],[alt]")]
    .map(e => ["aria-label", "placeholder", "title", "alt"].map(a => e.getAttribute(a) || "").join(" "));
  return document.body.innerText + "\n" + attrs.join("\n");
});

test("모든 화면에 옛 이름·전문용어가 없다", async () => {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  page.setDefaultTimeout(4000);
  try {
    const views = await page.$$eval(".view", vs => vs.map(v => v.id.replace(/^view-/, "")));
    assert.ok(views.length >= 10, "화면 수: " + views.length);
    const texts = {};
    for (const v of views) {
      await page.evaluate(id => showView(id), v);
      texts[v] = await collect(page);
    }
    // 눌러야 나오는 결과 영역들
    await page.evaluate(() => showView("calc"));
    await page.click("#calcBtn");
    texts.calcResult = await collect(page);
    await page.evaluate(() => showView("fix"));
    const clickAll = async (sel, key) => {
      const count = await page.locator(sel).count();
      for (let i = 0; i < count; i++) {
        await page.locator(sel).nth(i).click();
        texts[key + i] = await collect(page);
      }
    };
    await clickAll("#fixChips > *", "fix");
    await page.evaluate(() => showView("sauce"));
    await clickAll("#sauceChips > *", "sauce");
    await page.evaluate(() => showView("sense"));
    const cards = await page.locator("#senseGrid .scard").count();
    for (let i = 0; i < cards; i++) {
      await page.evaluate(() => showView("sense"));
      await page.locator("#senseGrid .scard").nth(i).click();
      texts["sense" + i] = await collect(page);
    }
    // 맛 그래프: 여러 슬라이더 상태 (딱 좋은 맛 / 짜게 / 맵게 / 달게 / 시니 / 싱겁게)
    await page.evaluate(() => showView("explore"));
    const setSliders = vals => page.evaluate(vals => {
      document.querySelectorAll("#sliders input[type=range]").forEach((el, i) => {
        el.value = vals[i]; el.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }, vals);
    let n = 0;
    for (const vals of [[6, 4, 1, 8, 1], [1, 0, 0, 0, 0], [10, 0, 0, 0, 0], [5, 10, 0, 3, 0], [5, 2, 0, 3, 10], [5, 2, 9, 3, 0], [4, 1, 0, 1, 0], [3, 0, 0, 5, 0]]) {
      await setSliders(vals);
      texts["explore" + n++] = await collect(page);
    }
    // 딱 좋은 맛(황금 구간) 상태: 감칠맛 겹치기를 최대로
    await page.evaluate(() => {
      const r = document.getElementById("synRange"); r.value = 1; r.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await setSliders([3, 2, 2, 6, 0]);
    texts.exploreGold = await collect(page);
    assert.ok(texts.exploreGold.includes("딱 좋은 맛"), "딱 좋은 맛 상태에 도달해야 함");
    const bad = Object.entries(texts).filter(([, t]) => BANNED.test(t)).map(([k, t]) => k + ": " + t.match(BANNED)[0]);
    assert.deepStrictEqual(bad, []);
    assert.deepStrictEqual(page.__errors, []);
  } finally { await browser.close(); }
});

test("맛 그래프 화면에 '맛 점수'가 있고 제목은 맛 그래프", async () => {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  page.setDefaultTimeout(4000);
  try {
    await page.evaluate(() => showView("explore"));
    const t = await page.locator("#view-explore").innerText();
    assert.ok(t.includes("맛 점수"));
    assert.ok(t.includes("맛 그래프"));
    assert.ok(t.includes("맛 조절"));
    assert.ok(t.includes("감칠맛 겹치기"));
  } finally { await browser.close(); }
});

test("document.title 과 manifest 는 전자혀이고 옛 말이 없다", async () => {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  try {
    const title = await page.title();
    assert.ok(title.includes("전자혀"), title);
    assert.ok(!BANNED.test(title), title);
    const desc = await page.$eval('meta[name="description"]', m => m.content);
    assert.ok(!BANNED.test(desc), desc);
  } finally { await browser.close(); }
  const raw = fs.readFileSync(path.join(__dirname, "..", "manifest.webmanifest"), "utf8");
  const m = JSON.parse(raw);
  assert.ok(m.name.includes("전자혀"));
  assert.ok(!BANNED.test(raw), raw);
});

test("개인정보처리방침 페이지에도 옛 말·영어 머리말이 없다", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "privacy.html"), "utf8");
  const text = html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
  assert.ok(!BANNED.test(text), "금지어: " + (text.match(BANNED) || [])[0]);
});

test("맛 카드와 맛 설명에 영어 부제가 없다", async () => {
  const { browser, page } = await openApp({ device: "Pixel 7" });
  page.setDefaultTimeout(4000);
  try {
    const grid = await page.locator("#senseGrid").innerText();
    assert.ok(!/[A-Za-z]{3,}/.test(grid), "카드 영어: " + (grid.match(/[A-Za-z]{3,}/) || [])[0]);
    await page.locator("#senseGrid .scard").first().click();
    const d = await page.locator("#senseDetail").innerText();
    assert.ok(!/[A-Za-z]{3,}/.test(d), "설명 영어: " + (d.match(/[A-Za-z]{3,}/) || [])[0]);
  } finally { await browser.close(); }
});
