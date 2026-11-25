// cook/ 의 웹 파일 중 앱에 필요한 것만 cook/app/www/ 로 복사한다.
// (docs/, tests/, sw.js 는 일부러 넣지 않는다.)
import { cpSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "..");
const out = join(here, "..", "www");
const FILES = [
  "index.html",
  "privacy.html",
  "dishes.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const f of FILES) {
  const from = join(src, f);
  if (!existsSync(from)) throw new Error(`없는 파일: ${from}`);
  cpSync(from, join(out, f));
}
console.log(`www/ 로 ${FILES.length}개 파일 복사 완료`);
