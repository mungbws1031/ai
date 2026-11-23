const { test } = require("node:test");
const assert = require("node:assert");
const { openApp, engineSnapshot } = require("./helpers");
const baseline = require("./fixtures/engine-baseline.json");

test("계산 엔진 출력이 기준과 같다", async () => {
  const { browser, page } = await openApp();
  try {
    assert.deepStrictEqual(await engineSnapshot(page), baseline);
    assert.deepStrictEqual(page.__errors, []);
  } finally {
    await browser.close();
  }
});
