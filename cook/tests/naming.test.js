const { test } = require("node:test");
const assert = require("node:assert");
const { openApp } = require("./helpers");

const BANNED = /백종원|류수영|이연복|최강록|고든 ?램지|마켓컬리|허니콤보|본죽|엽기떡볶이/;
test("화면에 쓰이는 데이터에 금지 표현이 없다", async () => {
  const { browser, page } = await openApp();
  try {
    const texts = await page.evaluate(() => JSON.stringify([
      STYLES.map(s => [s.name, s.desc]), RECIPES.map(r => [r.name, r.tip, r.desc]),
      SAUCES.map(s => [s.name, s.desc]), TASTE_WORDS.map(w => [w.nm, w.desc]),
    ]));
    assert.doesNotMatch(texts, BANNED);
    assert.doesNotMatch(await page.evaluate(() => document.body.innerText), BANNED);
  } finally {
    await browser.close();
  }
});
test("옛 소스 이름 즐겨찾기가 새 이름으로 이어진다", async () => {
  const { browser, page } = await openApp({ storage: { et_fav_sauces: JSON.stringify(["허니콤보", "쌈장"]) } });
  try {
    assert.deepStrictEqual(await page.evaluate(() => loadFavSauce()), ["허니갈릭 간장치킨", "쌈장"]);
    assert.deepStrictEqual(JSON.parse(await page.evaluate(() => localStorage.getItem("et_fav_sauces"))), ["허니갈릭 간장치킨", "쌈장"]);
  } finally {
    await browser.close();
  }
});

test("저장한 배합의 옛 스타일 이름이 새 이름으로 이어진다", async () => {
  const entry = { id: "r0", title: "t", createdAt: "2026.01.01", categoryName: "볶음", styleName: "백종원식 대중 한식",
    foodWeightG: 300, zon: null, ingredients: [{ name: "간장", amountG: 5, spoon: "1큰술" }], rating: 0, memo: "" };
  const { browser, page } = await openApp({ storage: { electronic_tongue_saved_recipes: JSON.stringify([entry]) } });
  try {
    assert.strictEqual(await page.evaluate(() => loadSaved()[0].styleName), "밥도둑 대중 한식");
    assert.strictEqual(JSON.parse(await page.evaluate(() => localStorage.getItem("electronic_tongue_saved_recipes")))[0].styleName, "밥도둑 대중 한식");
    await page.evaluate(() => renderSaved());
    const txt = await page.evaluate(() => document.getElementById("savedList").innerText);
    assert.match(txt, /밥도둑 대중 한식/);
    assert.doesNotMatch(txt, /백종원|류수영|이연복|최강록|고든 ?램지/);
  } finally {
    await browser.close();
  }
});
test("소스 이름이 분류·제품 표에 모두 연결된다", async () => {
  const { browser, page } = await openApp();
  try {
    const r = await page.evaluate(() => ({
      noCat: SAUCES.map(s => s.name).filter(n => !(n in SAUCE_CAT)),
      badProd: Object.keys(SAUCE_PROD).filter(k => !SAUCES.some(s => s.name === k)),
    }));
    assert.deepStrictEqual(r, { noCat: [], badProd: [] });
  } finally {
    await browser.close();
  }
});

test("저장한 배합의 제목이 옛 스타일 이름으로 시작하면 새 이름으로 이어진다", async () => {
  const mk = (id, title) => ({ id, title, createdAt: "2026.01.01", categoryName: "볶음", styleName: "백종원식 대중 한식",
    foodWeightG: 300, zon: null, ingredients: [], rating: 0, memo: "" });
  const arr = [mk("a", "백종원식 대중 한식 볶음"), mk("b", "우리집 볶음 (백종원식 대중 한식)"), mk("c", "내가 정한 이름")];
  const { browser, page } = await openApp({ storage: { electronic_tongue_saved_recipes: JSON.stringify(arr) } });
  try {
    assert.deepStrictEqual(await page.evaluate(() => loadSaved().map(e => e.title)),
      ["밥도둑 대중 한식 볶음", "우리집 볶음 (백종원식 대중 한식)", "내가 정한 이름"]);
    assert.strictEqual(JSON.parse(await page.evaluate(() => localStorage.getItem("electronic_tongue_saved_recipes")))[0].title, "밥도둑 대중 한식 볶음");
  } finally {
    await browser.close();
  }
});
