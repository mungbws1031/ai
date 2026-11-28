const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { openApp, loadPlaywright } = require("./helpers");

async function withApp(fn, opts = {}) {
  const { browser, page } = await openApp({ device: "Pixel 7", ...opts });
  page.setDefaultTimeout(4000);
  try { await fn(page); assert.deepStrictEqual(page.__errors, []); } finally { await browser.close(); }
}

async function startCook(page, name) {
  await page.fill("#dishSearch", name);
  await page.click(`#dishResults [data-dish="${name}"]`);
  await page.click("#dishSheet .dish-cook");
}
async function passPrep(page) {
  for (const c of await page.locator("#dishSheet .cook-prep input").all()) await c.check();
  await page.click('#dishSheet [data-ck="prepdone"]');
}
/* 요리 모드에서 단계마다 '이 단계에 쓰는 양념' 칸 글자를 모은다 */
async function seasPerStep(page, name) {
  await startCook(page, name);
  await passPrep(page);
  const steps = await page.evaluate(n => dishSteps(findDish(n).dish).steps, name);
  const out = [];
  for (let i = 0; i < steps.length; i++) {
    out.push((await page.locator("#dishSheet .cook-seas").count()) ? await page.innerText("#dishSheet .cook-seas") : "");
    if (i < steps.length - 1) await page.click('#dishSheet [data-ck="next"]');
  }
  return { steps, out };
}
async function toDone(page, name) {
  await startCook(page, name);
  await passPrep(page);
  const n = await page.evaluate(n => dishSteps(findDish(n).dish).steps.length, name);
  for (let i = 0; i < n; i++) await page.click('#dishSheet [data-ck="next"]');
}

/* 1. dishes.js 를 못 불러와도 앱이 멈추지 않는다 (index.html 만 다른 폴더에 복사해서 연다) */
test("dishes.js 를 못 불러와도 오류 없이 찾기·만드는 법이 된다", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cook-nodishes-"));
  fs.copyFileSync(path.join(__dirname, "..", "index.html"), path.join(dir, "index.html"));
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch();
  try {
    const page = await (await browser.newContext(pw.devices["Pixel 7"])).newPage();
    page.setDefaultTimeout(4000);
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    await page.goto(pathToFileURL(path.join(dir, "index.html")).href);
    assert.strictEqual(await page.evaluate(() => typeof HOME_DISHES), "undefined");
    assert.ok(await page.isVisible("#todayPick"));
    await page.fill("#dishSearch", "기름떡볶이");
    await page.click('#dishResults [data-dish="기름떡볶이"]');
    assert.ok((await page.innerText("#dishSheet")).includes("기름떡볶이 · 2인분"));
    await page.click("#dishSheet .dish-close");
    assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
    assert.deepStrictEqual(errors, []);
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});

/* 2. 양념 칸: 처음 쓰는 단계에만, 낱말로만, 쌀·밥·면은 빼고 */
test("된장찌개: 마지막 '싱거우면 된장을 더해요' 단계에는 된장 전체 양이 다시 나오지 않는다", () => withApp(async page => {
  const { steps, out } = await seasPerStep(page, "된장찌개");
  const first = steps.findIndex(t => t.includes("된장"));
  assert.ok(out[first].includes("된장"), out.join(" | "));
  steps.forEach((t, i) => { if (i > first) assert.ok(!out[i].includes("된장"), i + ": " + out[i]); });
  assert.strictEqual(out.join(" ").split("된장 ").length - 1, 1, out.join(" | "));
}));

test("떡국: 계란물 단계에는 물이 나오지 않고, 물은 물 붓는 단계에 한 번만", () => withApp(async page => {
  const { steps, out } = await seasPerStep(page, "떡국");
  const egg = steps.findIndex(t => t.includes("계란물"));
  assert.ok(egg >= 0);
  assert.ok(!/(^|\n|\s)물\s/.test(out[egg]), out[egg]);
  const pour = steps.findIndex(t => t.includes("물을 붓"));
  assert.ok(/물\s*5컵/.test(out[pour]), out[pour]);
}));

test("콩나물밥: 쌀은 양념 칸에 없고, 물은 '재료의 물'을 넣는 단계에 나오며 인분에 맞춰진다 (씻는 단계 X)", () => withApp(async page => {
  const { steps, out } = await seasPerStep(page, "콩나물밥");
  assert.ok(out.every(t => !t.includes("쌀")), out.join(" | "));
  const put = steps.findIndex(t => t.includes("재료의 물"));
  assert.ok(put > 0 && /물\s*160ml/.test(out[put]), out.join(" | "));
  assert.ok(!/물\s/.test(out[0]), out[0]);
  assert.ok(!steps.join(" ").includes("0.8컵"), "단계 문장에 고정된 물 양이 없어야 인분에 맞춰진다");
  const w = await page.evaluate(() => [1, 2, 4].map(n => homeLines(findDish("콩나물밥").dish.home, n).find(l => l.name === "물").qty));
  assert.deepStrictEqual(w, ["80ml", "160ml", "320ml"]);
}));

test("stepMentions: 국물·핏물·계란물·전분물·조물조물·물기·물엿은 '물'이 아니다", () => withApp(async page => {
  const r = await page.evaluate(() => [
    "국물 맛을 봐요", "핏물을 빼요", "계란물을 부어요", "전분물을 넣어요", "조물조물 무쳐요", "물기를 빼요", "물엿을 넣어요", "흐르는 물에 씻어요",
    "물을 붓고 끓여요", "물·간장·설탕을 섞어요", "물과 다시팩을 넣어요", "된장을 풀어요", "국간장을 넣어요",
  ].map(t => stepMentions(t, t.includes("된장") ? "된장" : t.includes("국간장") ? "간장" : "물")));
  assert.deepStrictEqual(r, [false, false, false, false, false, false, false, false, true, true, true, true, false]);
}));

/* 5. 잘 먹었어요 → 🏆 목록이 바로 갱신 */
test("😋 잘 먹었어요를 누른 즉시 (검색어를 지우지 않아도) 빈 검색 목록이 갱신된다", () => withApp(async page => {
  await toDone(page, "된장찌개");
  await page.evaluate(() => { $("dishSearch").value = ""; });
  await page.click('#dishSheet [data-kid="good"]');
  assert.ok((await page.innerText("#dishResults")).includes("🏆 우리 집 성공 요리"));
}));

/* 6. 망가진 아이 반응 기록이 있어도 시작할 때 멈추지 않는다 */
test("cj_kid_log 가 망가져 있어도 오류 없이 시작하고, 숫자 문자열은 숫자로 바꾼다", () => withApp(async page => {
  const t = await page.innerText("#dishResults");
  assert.ok(!t.includes("처음이라면"), t);
  assert.ok(t.includes("🏆 우리 집 성공 요리") && t.includes("김치볶음밥") && t.includes("잘 먹은 2번"), t);
  const log = await page.evaluate(() => loadKidLog());
  assert.deepStrictEqual(Object.keys(log), ["김치볶음밥"]);
  await page.evaluate(() => logKid("된장찌개", "good"));
  assert.strictEqual(await page.evaluate(() => loadKidLog()["된장찌개"].good), 1);
}, { storage: { cj_kid_log: JSON.stringify({ "된장찌개": null, x: "y", arr: [1], "김치볶음밥": { good: "2", meh: 1, no: 0, last: 5 } }) } }));

/* 7. 한 번 요리에 아이 반응은 한 번만 기록 */
test("😢 안 먹었어요 뒤 마지막 단계로 갔다 와도 반응 버튼이 다시 나오지 않는다 (두 번 기록 X)", () => withApp(async page => {
  await toDone(page, "된장찌개");
  await page.click('#dishSheet [data-kid="no"]');
  assert.strictEqual(await page.locator("#dishSheet [data-kid]").count(), 0);
  await page.click('#dishSheet [data-ck="back"]');
  await page.click('#dishSheet [data-ck="next"]');
  assert.strictEqual(await page.locator("#dishSheet [data-kid]").count(), 0);
  assert.ok((await page.innerText("#cookKid")).includes("속상하셨죠"));
  assert.strictEqual(await page.evaluate(() => loadKidLog()["된장찌개"].no), 1);
}));

/* 8. 준비 체크도 숟가락 양 먼저 (맛 카드 요리) */
test("준비 체크: 맛 카드 요리는 만드는 법처럼 숟가락 양을 먼저 보여 준다", () => withApp(async page => {
  await startCook(page, "기름떡볶이");
  const want = await page.evaluate(() => { const f = findDish("기름떡볶이"); return dishLines(f.styleId, f.dish, 2).map(l => l.spoon || l.qty); });
  const got = await page.$$eval("#dishSheet .cook-prep small", s => s.map(x => x.textContent));
  assert.deepStrictEqual(got, want);
  assert.ok(got.some(q => /큰술|작은술/.test(q)), got.join(","));
}));

/* 9. 개·대·모 등은 0.5 단위, 0.25 미만은 약간 */
test("개·대·모·마리·장·공기·봉은 0.5 단위, 아주 적으면 '약간'", () => withApp(async page => {
  const r = await page.evaluate(() => homeLines({ ing: [
    { n: "대파", a: 0.3, u: "대" }, { n: "계란", a: 0.1, u: "개" }, { n: "두부", a: 0.5, u: "모" },
    { n: "밥", a: 3, u: "공기" }, { n: "김", a: 1, u: "장" }, { n: "고기", a: 200, u: "g" },
  ] }, 1).map(l => l.qty));
  assert.deepStrictEqual(r, ["약간", "약간", "0.5모", "1.5공기", "0.5장", "100g"]);
  const r2 = await page.evaluate(() => homeLines({ ing: [{ n: "대파", a: 0.3, u: "대" }] }, 2)[0].qty);
  assert.strictEqual(r2, "0.5대");
}));

/* 10. 빈 검색 화면에는 추천 목록이 없다 (추천은 '오늘 뭐 먹을까요?' 카드가 맡는다) */
test("빈 검색에는 '처음이라면' 목록 없이 👶 버튼만 있다", () => withApp(async page => {
  assert.strictEqual(await page.locator("#dishResults .df-item").count(), 0);
  assert.ok(await page.isVisible("#dishResults .df-kid"));
}));

/* 11. 뒤로가기는 열린 시트만 닫는다 */
test("만드는 법이 열려 있을 때 뒤로가기 → 시트만 닫히고 맛 고르기 화면에 남는다", () => withApp(async page => {
  await page.fill("#dishSearch", "된장찌개");
  await page.click('#dishResults [data-dish="된장찌개"]');
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 1);
  await page.goBack();
  await page.waitForTimeout(100);
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
  assert.ok(await page.evaluate(() => $("view-sense").classList.contains("active")));
  assert.ok(page.url().endsWith("index.html"));
}));

test("요리 모드에서 뒤로가기 → 요리 모드가 끝나고 시트가 닫힌다", () => withApp(async page => {
  await startCook(page, "된장찌개");
  await passPrep(page);
  await page.goBack();
  await page.waitForTimeout(100);
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
  assert.strictEqual(await page.evaluate(() => _cook), null);
  assert.ok(await page.evaluate(() => $("view-sense").classList.contains("active")));
}));

test("버튼으로 닫으면 시트 기록만 되감고 화면은 그대로 (히스토리가 쌓이지 않는다)", () => withApp(async page => {
  const before = await page.evaluate(() => history.length);
  await page.fill("#dishSearch", "된장찌개");
  await page.click('#dishResults [data-dish="된장찌개"]');
  await page.click("#dishSheet .dish-close");
  await page.waitForTimeout(150);
  assert.ok(await page.evaluate(() => $("view-sense").classList.contains("active")));
  assert.strictEqual(await page.inputValue("#dishSearch"), "된장찌개");
  assert.ok(!(await page.evaluate(() => history.state && history.state.sheet)));
  // 다시 열고 닫아도 같은 자리
  await page.click('#dishResults [data-dish="된장찌개"]');
  await page.click("#dishSheet .dish-close");
  await page.waitForTimeout(150);
  assert.ok(await page.evaluate(() => $("view-sense").classList.contains("active")));
  assert.ok(await page.evaluate(() => history.length) <= before + 1);
}));

test("더보기 화면(요리 레시피)에서 연 요리 모드도 뒤로가기는 시트만 닫고, 한 번 더 뒤로가기하면 더보기", () => withApp(async page => {
  await page.click('.nav button[data-view="more"]');
  await page.click('#view-more [data-go="recipe"]');
  const card = page.locator('#recipeList .rc[data-name="떡볶이"]');
  await card.locator(".rch").click();
  await card.locator(".rc-cook").click();
  await page.goBack();
  await page.waitForTimeout(100);
  assert.strictEqual(await page.locator("#dishSheet.show").count(), 0);
  assert.ok(await page.evaluate(() => $("view-recipe").classList.contains("active")));
  await page.goBack();
  await page.waitForTimeout(100);
  assert.ok(await page.evaluate(() => $("view-more").classList.contains("active")));
}));
