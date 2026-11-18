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
