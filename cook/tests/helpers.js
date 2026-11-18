const path = require("path");
const { pathToFileURL } = require("url");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (e) {
    const root = require("child_process").execSync("npm root -g").toString().trim();
    return require(path.join(root, "playwright"));
  }
}

const APP_URL = pathToFileURL(path.join(__dirname, "..", "index.html")).href;

async function openApp({ storage } = {}) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  if (storage) {
    await context.addInitScript((data) => {
      try {
        for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
      } catch (e) {}
    }, storage);
  }
  const page = await context.newPage();
  page.__errors = [];
  page.on("pageerror", (err) => page.__errors.push(String(err)));
  await page.goto(APP_URL);
  return { browser, page };
}

async function engineSnapshot(page) {
  return page.evaluate(() => {
    const out = {};
    const round = (n) => Math.round(n * 100) / 100;
    for (const style of STYLES) {
      for (const categoryId of ["stir_fry", "stew", "noodle_pasta"]) {
        const r = calcRecipe({ categoryId, stylePresetId: style.id, foodWeightG: 300, intensity: "normal" });
        out[style.id + "|" + categoryId] = {
          ingredients: r.ingredients.map((i) => ({ id: i.id, amountG: round(i.amountG) })),
          zon: { score: r.zon.score, fit: r.zon.fit },
        };
      }
    }
    return out;
  });
}

module.exports = { openApp, engineSnapshot, APP_URL };
