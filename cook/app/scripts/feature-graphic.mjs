// 구글 플레이 피처 그래픽(1024×500 PNG) 생성
// 사용: node cook/app/scripts/feature-graphic.mjs  →  cook/app/store/feature-graphic.png
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, "feature-graphic.html");
const out = path.join(here, "..", "store", "feature-graphic.png");

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1024, height: 500 } });
await browser.close();
console.log("wrote", out);
