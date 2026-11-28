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
const q = (page) => page.innerText("#todayPick");
async function answer(page, who, time, spicy) {
  await page.click(`#todayPick [data-today-who="${who}"]`);
  await page.click(`#todayPick [data-today-time="${time}"]`);
  if (spicy !== undefined) await page.click(`#todayPick [data-today-spicy="${spicy}"]`);
}
const dishName = (page) => page.getAttribute("#todayPick .today-dish", "data-name");

test("dishMinutes: 분·시간·별도", () => withApp(async page => {
  const r = await page.evaluate(() => ["25분", "1시간 10분", "1시간", "40분 (핏물 빼기 1시간·재우기 2시간 별도)"].map(dishMinutes));
  assert.deepStrictEqual(r, [25, 70, 60, Infinity]);
}));

test("첫 화면 맨 위에 카드와 첫 질문, '처음이라면' 목록은 없다", () => withApp(async page => {
  const [ty, sy] = await page.evaluate(() => [$("todayPick").getBoundingClientRect().top, $("dishSearch").getBoundingClientRect().top]);
  assert.ok(ty < sy, ty + " " + sy);
  const t = await q(page);
  assert.ok(t.includes("오늘 뭐 먹을까요?") && t.includes("오늘 누구랑 먹어요?"), t);
  for (const l of ["👶 아이랑", "🙋 혼자", "👨‍👩‍👧 가족 다"]) assert.ok(t.includes(l), t);
  assert.ok(!(await page.innerText("#view-sense")).includes("처음이라면"));
}));

test("아이랑이면 매운 질문 없이 바로 추천, 후보 전체가 kid이고 안 매움 (가짜 매운 kid 요리 주입)", () => withApp(async page => {
  await page.click('#todayPick [data-today-who="kid"]');
  assert.ok((await q(page)).includes("시간은 얼마나 있어요?"));
  await page.click('#todayPick [data-today-time="30"]');
  const t = await q(page);
  assert.ok(t.includes("오늘은 이거 어때요?") && !t.includes("매운 거 괜찮아요?"), t);
  const d = await page.evaluate(() => $("todayPick").querySelector(".today-dish").dataset.name);
  const tip = await page.evaluate(n => HOME.find(h => h.name === n).kidTip, d);
  if (tip) assert.ok(t.includes(tip), t);
  const r = await page.evaluate(() => {
    HOME.push({ name: "가짜매운", emoji: "x", alias: [], cat: "x", time: "10분", level: 1, tools: ["냄비"], kid: true, kidTip: "", ing: [{ n: "고추장", a: 1, u: "큰술" }], steps: ["a"] });
    const bad = [], seen = [];
    for (const who of ["kid", "solo"]) for (const spicy of [false]) {
      const shown = [];
      for (let i = 0; i < HOME.length; i++) {
        const p = pickToday({ who, time: 0, spicy }, shown).dish;
        if (!p || (who === "kid" && !p.kid) || isSpicyHome(p) || p.name === "가짜매운") bad.push(who + ":" + (p && p.name));
        if (p) { shown.push(p.name); seen.push(p.name); }
      }
    }
    HOME.pop();
    return { bad, seen: seen.length };
  });
  assert.deepStrictEqual(r.bad, []);
  assert.ok(r.seen > 10, String(r.seen));
}));

test("혼자·가족이면 매운 질문이 나오고 답하면 결과", () => withApp(async page => {
  await page.click('#todayPick [data-today-who="solo"]');
  await page.click('#todayPick [data-today-time="15"]');
  assert.ok((await q(page)).includes("매운 거 괜찮아요?"));
  await page.click('#todayPick [data-today-spicy="0"]');
  assert.ok((await q(page)).includes("오늘은 이거 어때요?"));
}));

test("15분이면 후보 전체가 15분 이하", () => withApp(async page => {
  const r = await page.evaluate(() => {
    const bad = [], shown = []; let n = 0;
    for (let i = 0; i < HOME.length; i++) {
      const p = pickToday({ who: "solo", time: 15, spicy: true }, shown);
      if (!p.dish || p.relaxed || dishMinutes(p.dish.time) > 15) { if (p.dish) bad.push(p.dish.time); break; }
      shown.push(p.dish.name); n++;
    }
    return { bad, n };
  });
  assert.deepStrictEqual(r.bad, []);
  assert.ok(r.n >= 3, String(r.n));
}));

test("안 먹었다고 기록한 요리는 같은 난이도에 다른 요리가 있으면 첫 추천이 아니다", () => withApp(async page => {
  const r = await page.evaluate(() => {
    const lvl = HOME.filter(h => h.level === 1 && h.kid);
    const target = lvl[0].name; logKid(target, "no");
    let first = 0;
    for (let i = 0; i < 40; i++) if (pickToday({ who: "kid", time: 0, spicy: false }, []).dish.name === target) first++;
    return { lvl: lvl.length, first };
  });
  assert.ok(r.lvl > 1);
  assert.strictEqual(r.first, 0);
}));

test("망가진 cj_today_last({who:'constructor'})는 무시하고 오류 없다", () => withApp(async page => {
  assert.ok(!(await q(page)).includes("지난번처럼"));
}, { storage: { cj_today_last: JSON.stringify({ who: "constructor", time: "toString" }) } }));

test("다른 거 보기: 중복 없음, 다 돌면 다시 돈다", () => withApp(async page => {
  await answer(page, "family", 0, 1);
  const names = [await dishName(page)];
  for (let i = 0; i < 5; i++) { await page.click('#todayPick [data-today="next"]'); names.push(await dishName(page)); }
  assert.strictEqual(new Set(names).size, 6, names.join(","));
  const n = await page.evaluate(() => HOME.length);
  for (let i = 0; i < n + 2; i++) await page.click('#todayPick [data-today="next"]');
  assert.ok((await q(page)).includes("오늘은 이거 어때요?"));
}));

test("처음부터: 첫 질문으로 돌아간다", () => withApp(async page => {
  await answer(page, "solo", 30, 0);
  await page.click('#todayPick [data-today="reset"]');
  assert.ok((await q(page)).includes("오늘 누구랑 먹어요?"));
}));

test("이걸로 할게요 → 혼자는 1인분, 가족은 4인분으로 만드는 법", () => withApp(async page => {
  await answer(page, "solo", 0, 1);
  await page.click('#todayPick [data-today="go"]');
  assert.ok((await page.innerText("#dishSheet")).includes(" · 1인분"));
  await page.click("#dishSheet .dish-close");
  await page.click('#todayPick [data-today="reset"]');
  await answer(page, "family", 0, 1);
  await page.click('#todayPick [data-today="go"]');
  assert.ok((await page.innerText("#dishSheet")).includes(" · 4인분"));
}));

test("조건 완화: 맞는 요리가 없으면 시간 조건을 없애고 안내", () => withApp(async page => {
  const r = await page.evaluate(() => {
    HOME.length = 0;
    HOME.push({ name: "오래요리", emoji: "🍲", alias: [], cat: "x", time: "40분 (재우기 2시간 별도)", level: 2, tools: ["냄비"], kid: false, kidTip: "", ing: [{ n: "물", a: 1, u: "컵" }], steps: ["끓여요"] });
    const p = pickToday({ who: "solo", time: 15, spicy: true }, []);
    return { name: p.dish && p.dish.name, relaxed: p.relaxed };
  });
  assert.deepStrictEqual(r, { name: "오래요리", relaxed: true });
  await answer(page, "solo", 15, 1);
  assert.ok((await q(page)).includes("조건을 조금 넓혀서 골랐어요"));
}));

test("지난번처럼: 다시 열면 한 번에 결과", () => withApp(async page => {
  await answer(page, "kid", 30);
  assert.ok((await q(page)).includes("오늘은 이거 어때요?"));
  await page.reload();
  const t = await q(page);
  assert.ok(t.includes("지난번처럼(아이랑 · 30분) 바로 골라 줘"), t);
  await page.click('#todayPick [data-today="again"]');
  assert.ok((await q(page)).includes("오늘은 이거 어때요?"));
}));

test("저장소가 막혀도 동작한다", () => withApp(async page => {
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("no"); }; });
  await answer(page, "solo", 30, 0);
  assert.ok((await q(page)).includes("오늘은 이거 어때요?"));
}));

test("dishes.js 없어도 카드가 오류 없이 안내를 보여 준다", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cook-today-nodishes-"));
  fs.copyFileSync(path.join(__dirname, "..", "index.html"), path.join(dir, "index.html"));
  const pw = loadPlaywright();
  const browser = await pw.chromium.launch();
  try {
    const page = await (await browser.newContext(pw.devices["Pixel 7"])).newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(String(e)));
    await page.goto(pathToFileURL(path.join(dir, "index.html")).href);
    const t = await page.innerText("#todayPick");
    assert.ok(t.includes("오늘 뭐 먹을까요?") && t.includes("찾기"), t);
    assert.deepStrictEqual(errors, []);
  } finally { await browser.close(); fs.rmSync(dir, { recursive: true, force: true }); }
});
