// 플레이 스토어용 스크린샷 4장 (1080x1920) 을 cook/app/store/ 에 만듭니다.
// 실행: node cook/app/scripts/screenshots.mjs   (Playwright 가 설치돼 있어야 함)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
function loadPlaywright() {
  try { return require("playwright"); }
  catch { return require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const appUrl = pathToFileURL(path.join(here, "..", "..", "index.html")).href;
const outDir = path.join(here, "..", "store");
fs.mkdirSync(outDir, { recursive: true });

const { chromium } = loadPlaywright();
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "ko-KR",
});
const page = await ctx.newPage();
page.setDefaultTimeout(5000);
await page.goto(appUrl);
await page.waitForTimeout(500);

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, name) });
  console.log("saved", name);
};

// 1) 맛 고르기: 요즘 말하는 맛
await page.click('.nav button[data-view="sense"]');
await page.click(".scard:has-text('기름떡볶이맛')");
await page.waitForTimeout(500);
await page.evaluate(() => {
  const t = [...document.querySelectorAll(".sense-cat-title")].find(e => e.textContent.includes("요즘 말하는 맛"));
  if (t) window.scrollTo(0, t.getBoundingClientRect().top + window.scrollY - 12);
});
await shot("1-gamseong.png");

// 2) 요리 고르기 시트
await page.click("text=살 재료 · 만드는 법");
await page.click("#dishSheet .dish-opt >> nth=0");
await page.click('#dishSheet [data-serv="2"]');
await shot("2-dish-sheet.png");

// 3) 장바구니: 살 것 + 집에 있음(냉장고·직접 체크)이 섞인 모습
await page.click("#dishSheet .dish-add");
await page.evaluate(() => {
  // 재료 중 일부는 집에 있는 상태로: 대파는 냉장고에, 다진마늘은 "집에 있어요"
  saveFridge([{ name: "대파 한 단", bought: frToday(), days: 7 }]);
  setHome("다진마늘", true);
  // 화면에 다 보이도록 살 것은 앞의 3개만 남긴다 (나머지는 샀어요 처리 — 헤더 숫자와 보이는 줄을 맞춘다)
  const keep = ["떡볶이 떡", "고춧가루", "설탕"];
  loadCart().forEach(it => { if (!keep.includes(it.name) && !isHome(it.name)) removeFromCart(it.name); });
});
await page.click('.nav button[data-view="cart"]');
await page.waitForSelector("#toast.show, #toastMsg", { state: "hidden", timeout: 6000 }).catch(() => {});
await page.waitForTimeout(3000); // 토스트가 사라질 때까지
await page.evaluate(() => window.scrollTo(0, 0));
await shot("3-cart.png");

// 4) 계산 결과
await page.click('.nav button[data-view="calc"]');
await page.click("#styleChips .chip:has-text('기름떡볶이')");
await page.click("text=맛 계산하기");
await page.waitForTimeout(3000); // 토스트가 사라질 때까지
await page.evaluate(() => {
  const r = document.getElementById("calcResult").firstElementChild;
  if (r) window.scrollTo(0, r.getBoundingClientRect().top + window.scrollY - 16);
});
await shot("4-calc.png");

await browser.close();
