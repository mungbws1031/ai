# 전자혀 안드로이드 출시 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전자혀(`cook/`)에 "맛 → 대표 요리 → 하나의 장바구니(살 재료 목록)" 흐름과 구매 링크를 넣고, 출시에 걸리는 표현을 정리한 뒤, Capacitor로 감싼 안드로이드 앱(AAB)을 CI에서 빌드할 수 있게 만든다.

**Architecture:** 앱 본체는 지금처럼 빌드 도구 없는 단일 `cook/index.html`이다. 새 로직(요리 데이터, 장바구니, 구매 링크)도 이 파일 안의 전역 함수로 넣고, 테스트는 Playwright로 페이지를 띄워 `page.evaluate`로 함수를 직접 호출한다. 안드로이드 셸은 `cook/app/`의 Capacitor 프로젝트가 `index.html`과 정적 파일을 `www/`로 복사해 감싼다. Android SDK가 없는 환경이므로 AAB는 GitHub Actions에서 빌드한다.

**Tech Stack:** 순수 HTML/JS(단일 파일 PWA), localStorage, Node 22 `node:test` + Playwright(사전 설치된 Chromium), Capacitor 8(`@capacitor/core`, `cli`, `android`, `share`), GitHub Actions(JDK 21 + Android SDK).

**Spec:** `docs/superpowers/specs/2026-11-17-jeonjahyeo-android-launch-design.md`

## Global Constraints

- 웹(PWA) 버전은 같은 `cook/index.html`로 계속 동작해야 한다. 앱 전용 동작은 `window.Capacitor?.isNativePlatform?.()`가 참일 때만 켠다.
- 기존 g 배합 계산 엔진(`calcRecipe` 및 하위 함수, `STYLES`·`COND`·`CATEGORIES`·`TEMPLATES` 수치)의 출력은 바뀌면 안 된다. Task 1의 기준 스냅샷이 이를 지킨다.
- 맛 스타일 내부 id(`baek_jongwon` 등)는 바꾸지 않는다. 화면에 보이는 이름만 바꾼다.
- 모든 데이터는 기기 안 localStorage에만 둔다. 서버·회원가입·광고·분석 SDK를 넣지 않는다.
- 계산·장바구니는 오프라인에서 동작해야 한다. 구매 버튼만 인터넷이 필요하다.
- 구매 링크는 앱 안 WebView가 아니라 외부 브라우저(또는 쇼핑 앱)로 연다.
- 출시 시점의 구매 링크는 **수수료 없는 일반 검색 링크**다. 제휴 전환은 `SHOP_CONFIG` 한 곳만 바꿔서 끝나야 한다.
- 수수료 고지 문구는 `SHOP_CONFIG.affiliate === true`일 때만, 장바구니 상단에 항상 보이게 표시한다. 쿠팡 파트너스 고정 문구: `이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`
- 화면에 노출되는 이름·설명·팁에 실존 인물 이름(백종원, 류수영, 이연복, 최강록, 고든 램지)과 외식·유통 브랜드 상호(엽기떡볶이, 마켓컬리, 허니콤보, 본죽)를 쓰지 않는다. 소스 탭 "추천 시판 제품"(`SAUCE_PROD` 값)의 제품명은 구매 안내 목적이므로 유지한다.
- 앱 id `com.jeonjahyeo.app`, 앱 이름 `전자혀`. 서명 키(keystore)와 비밀번호는 저장소에 커밋하지 않는다.
- `targetSdkVersion`은 업로드 시점에 Play Console이 요구하는 수준 이상이어야 한다(Capacitor 8 기본값 36).

## Review Focus

1. **같은 재료가 여러 요리에서 들어올 때**: "대파 1대"(기름떡볶이) + "대파 1/2대"(파기름 볶음밥)는 장바구니에서 한 줄 "대파 1.5대"로 합쳐져야 한다. 단위가 다르면("간장 2큰술" + "간장 15g") 한 줄에 "2큰술 + 15g"으로 이어 붙인다. → Task 3 테스트.
2. **냉장고 재료 이름이 장바구니 이름과 정확히 같지 않을 때**: 냉장 탭에 "대파 한 단"으로 등록돼 있으면 장바구니의 "대파"는 집에 있음으로 처리돼야 한다. 반대로 "파"만 있을 때 "대파"를 집에 있음으로 보면 안 된다(장바구니 이름이 냉장고 이름에 포함될 때만 매칭). → Task 3 테스트.
3. **앱을 닫았다 다시 열 때**: 장바구니와 "집에 있어요" 체크가 그대로 남아야 한다. localStorage 값이 깨져 있으면(JSON 파싱 실패) 빈 장바구니로 열리고 앱은 멈추지 않아야 한다. → Task 3 테스트.
4. **이름이 바뀐 소스를 즐겨찾기해 둔 기존 사용자**: `et_fav_sauces`에 옛 이름("허니콤보" 등)이 저장돼 있어도 즐겨찾기가 새 이름으로 이어져야 한다. → Task 2 테스트.
5. **앱(WebView) 안에서 구매 버튼을 누를 때**: 쇼핑몰 페이지가 앱 화면을 덮어쓰면 뒤로 가기로 장바구니에 돌아올 수 없다. 외부 브라우저로 열려야 한다. 이 환경에는 에뮬레이터가 없으므로 Task 6은 `openExternal`이 네이티브에서 `window.open(url, "_system")`을 호출하는지 spy로 확인하고, 실제 기기 확인은 Task 10 `RELEASE.md`의 "비공개 테스트 첫날 점검" 항목으로 남긴다.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `cook/index.html` (수정) | 이름 정리, 요리 데이터 `TASTE_DISHES`, 장바구니 로직·화면, 구매 링크, 공유, 앱 분기 |
| `cook/privacy.html` (생성) | 개인정보처리방침 공개 페이지 |
| `cook/sw.js` (수정) | 캐시 버전 올림, `privacy.html` 캐시 |
| `cook/tests/helpers.js` (생성) | Playwright로 `index.html`을 여는 공용 함수 |
| `cook/tests/engine.test.js` + `cook/tests/fixtures/engine-baseline.json` (생성) | 계산 엔진 불변 스냅샷 |
| `cook/tests/naming.test.js` (생성) | 금지 표현·소스 이름 이전 |
| `cook/tests/dishes.test.js` (생성) | 요리 데이터·재료 계산 |
| `cook/tests/cart.test.js` (생성) | 장바구니 로직 |
| `cook/tests/cart-ui.test.js` (생성) | 담기 흐름·저장·공유·구매 링크 화면 |
| `cook/app/` (생성) | Capacitor 프로젝트: `package.json`, `capacitor.config.json`, `scripts/build-web.mjs`, `android/`, `README.md` |
| `.github/workflows/cook-android.yml` (생성) | AAB 빌드 CI |
| `cook/docs/RELEASE.md` (생성) | 플레이 콘솔 등록·비공개 테스트·데이터 보안 답변 체크리스트 |

테스트 실행: 저장소 루트에서 `node --test cook/tests/` (Playwright는 사전 설치되어 `require('playwright')`로 바로 쓴다. 따로 설치하지 않는다.)

---

### Task 1: 테스트 하네스 + 계산 엔진 기준 스냅샷

**Files:**
- Create: `cook/tests/helpers.js`, `cook/tests/engine.test.js`, `cook/tests/fixtures/engine-baseline.json`

**Interfaces:**
- Produces: `openApp({ storage?: Record<string,string> }) -> Promise<{ browser, page }>` — 새 컨텍스트로 `file://…/cook/index.html`을 열고, `storage`가 있으면 페이지 스크립트가 돌기 전에 localStorage에 넣는다(`context.addInitScript`). 페이지 에러(`pageerror`)는 `page.__errors` 배열에 모은다.
- Produces: `engineSnapshot(page) -> Promise<object>` — 모든 `STYLES` × `["stir_fry","stew","noodle_pasta"]` × 300g × `"normal"`에 대해 `calcRecipe` 결과의 `{ingredients:[{id,amountG(소수 2자리 반올림)}], zon:{score,fit}}`를 `"<styleId>|<categoryId>"` 키로 모은 객체.

- [ ] **Step 1: `helpers.js`에 `openApp`, `engineSnapshot` 작성**
- [ ] **Step 2: 현재 코드(변경 전)로 기준 파일 생성** — `node -e "…engineSnapshot 결과를 cook/tests/fixtures/engine-baseline.json에 JSON.stringify(…,null,1)로 저장"`. 이 파일은 Task 1 커밋 이후 손으로 수정하지 않는다.
- [ ] **Step 3: `engine.test.js` 작성**

```js
test("계산 엔진 출력이 기준과 같다", async () => {
  const { browser, page } = await openApp();
  assert.deepStrictEqual(await engineSnapshot(page), baseline);
  assert.deepStrictEqual(page.__errors, []);
  await browser.close();
});
```

- [ ] **Step 4: 실행** — `node --test cook/tests/` → PASS 1
- [ ] **Step 5: Commit** — `test(cook): 계산 엔진 기준 스냅샷과 테스트 하네스`

---

### Task 2: 유명인·브랜드 표현 정리 (+ 소스 즐겨찾기 이전)

**Files:**
- Modify: `cook/index.html` (`STYLES` name/desc, `RECIPES` tip, `SAUCES`·`SAUCE_CAT`·`SAUCE_PROD` 키, `loadFavSauce`)
- Test: `cook/tests/naming.test.js`

**Interfaces:**
- Produces: `SAUCE_RENAMES: Record<string,string>` (옛 이름 → 새 이름), `loadFavSauce()`가 옛 이름을 새 이름으로 바꿔 돌려주고 저장도 갱신한다.

새 이름(사용자 최종 확인 전 제안값 — PR 설명에 표로 남겨 확인받는다):

| 대상 | 옛 이름 | 새 이름 |
|---|---|---|
| style `baek_jongwon` | 백종원식 대중 한식 | 밥도둑 대중 한식 |
| style `ryu_sooyoung` | 류수영식 원팬 집밥 | 원팬 눅진 집밥 |
| style `lee_yeonbok` | 이연복식 중식풍 | 중식당 웍 스타일 |
| style `choi_kangrok` | 최강록식 섬세한 감칠맛 | 다시 우린 섬세한 감칠맛 |
| style `gordon_ramsay` | 고든 램지식 서양식 | 버터·허브 정통 서양식 |
| sauce | 허니콤보 | 허니갈릭 간장치킨 |
| sauce | 엽기떡볶이 | 극강 매운 떡볶이 |
| sauce | 본죽st 비빔장 | 죽집 스타일 비빔장 |

`RECIPES` tip의 "이연복 셰프 스타일", "마켓컬리에서 …" 문장은 인물·업체 없이 같은 뜻으로 고친다(예: "중식당 시그니처 냉채 스타일", "온라인 장보기에서 꾸준히 인기 있는 메뉴").

- [ ] **Step 1: 실패 테스트 작성**

```js
const BANNED = /백종원|류수영|이연복|최강록|고든 ?램지|마켓컬리|허니콤보|본죽|엽기떡볶이/;
test("화면에 쓰이는 데이터에 금지 표현이 없다", async () => {
  const { browser, page } = await openApp();
  const texts = await page.evaluate(() => JSON.stringify([
    STYLES.map(s => [s.name, s.desc]), RECIPES.map(r => [r.name, r.tip, r.desc]),
    SAUCES.map(s => [s.name, s.desc]), TASTE_WORDS.map(w => [w.nm, w.desc]),
  ]));
  assert.doesNotMatch(texts, BANNED);
  assert.doesNotMatch(await page.evaluate(() => document.body.innerText), BANNED);
  await browser.close();
});
test("옛 소스 이름 즐겨찾기가 새 이름으로 이어진다", async () => {
  const { browser, page } = await openApp({ storage: { et_fav_sauces: JSON.stringify(["허니콤보", "쌈장"]) } });
  assert.deepStrictEqual(await page.evaluate(() => loadFavSauce()), ["허니갈릭 간장치킨", "쌈장"]);
  assert.deepStrictEqual(JSON.parse(await page.evaluate(() => localStorage.getItem("et_fav_sauces"))), ["허니갈릭 간장치킨", "쌈장"]);
  await browser.close();
});
```

- [ ] **Step 2: 실행해 실패 확인** — `node --test cook/tests/naming.test.js` → FAIL (금지 표현 매치)
- [ ] **Step 3: 이름 바꾸기, `SAUCE_RENAMES` 추가, `loadFavSauce` 이전 처리** — `SAUCE_CAT`·`SAUCE_PROD`의 키도 새 이름으로 바꾼다. `SAUCE_PROD` 값(시판 제품명)은 그대로.
- [ ] **Step 4: 실행** — `node --test cook/tests/` → 전부 PASS (엔진 스냅샷 포함)
- [ ] **Step 5: Commit** — `fix(cook): 출시 전 유명인·브랜드 표현 정리`

---

### Task 3: 장바구니 로직 (저장·합치기·집에 있음)

**Files:**
- Modify: `cook/index.html` (새 블록 `/* ════ 장바구니 ════ */`, `renderShop` 근처)
- Test: `cook/tests/cart.test.js`

**Interfaces:**
- Produces (모두 전역 함수):
  - `CART_KEY = "et_cart"`, `HOME_KEY = "et_home"`
  - `CartItem = { name: string, amt: number|null, unit: string, text?: string, from: string[] }` — `amt`가 숫자면 같은 `unit`끼리 더한다. 숫자로 못 읽는 양("약간", "1/2개" 아닌 자유 문구)은 `amt:null`, 원문은 `text`.
  - `parseQty(s: string) -> { amt: number|null, unit: string, text?: string }` — "400g"→`{400,"g"}`, "1.5대"→`{1.5,"대"}`, "1/2대"→`{0.5,"대"}`, "2큰술 1작은술"→`{null,"",text:"2큰술 1작은술"}`, ""→`{null,"",text:""}`.
  - `loadCart() -> CartItem[]` (파싱 실패 시 `[]`), `saveCart(items)`
  - `addToCart(lines: {name, qty: string}[], from: string) -> void` — 같은 `name`(trim 후 완전 일치)은 한 줄로 합친다. 같은 단위는 `amt` 합, 다른 단위·`amt:null`은 `text`에 `" + "`로 이어 붙인다. `from`은 중복 없이 추가.
  - `removeFromCart(name)`, `clearCart()`
  - `setHome(name: string, on: boolean)`, `isHome(name: string) -> boolean` — `et_home`에 있거나, 냉장고(`loadFridge()`의 `x.name`) 중 하나가 `name`을 포함하면 참.
  - `cartView() -> { buy: CartItem[], home: CartItem[] }`
  - `fmtQty(item: CartItem) -> string` — `amt` 있으면 `fmtNum(amt)+unit`(+`text` 있으면 `" + "+text`), 없으면 `text`.

- [ ] **Step 1: 실패 테스트 작성** (각 `test`는 `openApp()`으로 새 컨텍스트)

```js
test("같은 재료·같은 단위는 합친다", …
  addToCart([{name:"대파",qty:"1대"}],"기름떡볶이"); addToCart([{name:"대파",qty:"1/2대"}],"파기름 볶음밥");
  // cartView().buy == [{name:"대파",amt:1.5,unit:"대",from:["기름떡볶이","파기름 볶음밥"]}], fmtQty → "1.5대"
test("단위가 다르면 들어온 순서대로 이어 붙인다", … 간장 "2큰술" 담고 간장 "15g" 담음 → fmtQty === "2큰술 + 15g"
test("냉장고 이름이 장바구니 이름을 포함하면 집에 있음", storage et_fridge=[{name:"대파 한 단",bought:"2026-11-18",days:14}] → isHome("대파")===true
test("짧은 냉장고 이름은 긴 재료를 덮지 않는다", storage et_fridge=[{name:"파",bought:"2026-11-18",days:14}] → isHome("대파")===false
test("집에 있어요 체크는 home 칸으로 간다", setHome("간장",true) → cartView().home 이름 목록 ["간장"], buy에 없음
test("다시 열어도 남아 있다", addToCart 후 page.reload() → loadCart().length===1, isHome 유지
test("깨진 저장값이면 빈 장바구니", storage et_cart="{oops" → loadCart() deepEqual [], page.__errors 빈 배열
test("parseQty", 표의 5가지 입력 그대로 단언
```

(위 줄은 테스트 이름과 단언이다. 구현자는 각 줄을 `page.evaluate` 호출과 `assert`로 옮긴다.)

- [ ] **Step 2: 실행해 실패 확인** — FAIL ("addToCart is not defined")
- [ ] **Step 3: 위 Interfaces의 함수 구현**
- [ ] **Step 4: 실행** — `node --test cook/tests/` → 전부 PASS
- [ ] **Step 5: Commit** — `feat(cook): 장바구니 저장·합치기·집에 있음 로직`

---

### Task 4: 맛 → 대표 요리 데이터와 재료 계산

**Files:**
- Modify: `cook/index.html` (`TASTE_DISHES`를 `STYLE_VECTORS` 아래에)
- Test: `cook/tests/dishes.test.js`

**Interfaces:**
- Consumes: `calcRecipe`, `spoonStr`, `RECIPES`, `C`
- Produces:
  - `TASTE_DISHES: Record<styleId, Dish[]>` — 1단계는 "요즘 말하는 맛" 10개 스타일(`pa_oil`, `oil_tteokbokki`, `maepdan`, `dan_jjan`, `chodding`, `honey_butter`, `fire_wok`, `eolkeun`, `mala`, `chojang`)에 각 2~3개.
  - `Dish = { name: string, emoji: string, recipe?: string /* RECIPES name */, cat?: categoryId, gPerServing?: number, main: {name: string, per1: number, unit: string}[] }` — `recipe`가 있으면 양념은 레시피 `ing`를 그대로 쓰고 `main`은 비워도 된다. 없으면 `cat`·`gPerServing` 필수.
  - `dishLines(styleId: string, dish: Dish, servings: number) -> {name: string, qty: string}[]`
    - `recipe` 있음: `RECIPES`의 `ing` 각 줄을 기존 `renderShop`과 같은 규칙(앞의 "따뜻한/다진/…" 수식어 제거, 첫 공백 앞 = 이름, 나머지 = 양)으로 나눈다. 레시피 기준 인분은 2인분으로 보고 숫자 양만 `servings/2` 배.
    - `recipe` 없음: `main` → `{name, qty: fmtNum(per1*servings)+unit}`, 양념 → `calcRecipe({categoryId:dish.cat, stylePresetId:styleId, foodWeightG: dish.gPerServing*servings, intensity:"normal"}).ingredients`에서 `water`·`starch_water`를 빼고 `{name: i.name, qty: fmtG(i.amountG)+"g"}`.
- 예시 데이터(구현자가 나머지를 같은 형식으로 채운다): `oil_tteokbokki: [{name:"기름떡볶이",emoji:"🔥",cat:"stir_fry",gPerServing:220,main:[{name:"떡볶이 떡",per1:200,unit:"g"},{name:"대파",per1:0.5,unit:"대"}]}, …]`, `pa_oil: [{name:"파기름 볶음밥",emoji:"🍳",cat:"rice_bowl",gPerServing:300,main:[{name:"밥",per1:1,unit:"공기"},{name:"계란",per1:1,unit:"개"},{name:"대파",per1:0.5,unit:"대"}]}, {name:"계란볶음밥",emoji:"🍚",recipe:"계란볶음밥"}, …]`

- [ ] **Step 1: 실패 테스트 작성**

```js
test("10개 맛 모두 요리가 2~3개", … for id of 10 ids: 2 <= TASTE_DISHES[id].length <= 3; 모든 recipe 값은 RECIPES 이름에 존재
test("기름떡볶이 2인분 = 떡 400g + 고춧가루 포함", … dishLines("oil_tteokbokki", TASTE_DISHES.oil_tteokbokki[0], 2)
  → {name:"떡볶이 떡",qty:"400g"} 포함, name==="고춧가루" 줄 존재, name==="물" 줄 없음
test("인분을 두 배로 하면 주재료 양도 두 배", … 4인분 → "떡볶이 떡" qty "800g"
test("레시피 재사용 요리는 레시피 양념 문구를 그대로 쓴다", … dishLines("pa_oil", 계란볶음밥 dish, 2) 의 이름 목록이 RECIPES 계란볶음밥 ing에서 뽑은 이름 목록과 같다
```

- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: `TASTE_DISHES` 데이터와 `dishLines` 구현**
- [ ] **Step 4: 실행** — `node --test cook/tests/` → 전부 PASS (엔진 스냅샷 포함)
- [ ] **Step 5: Commit** — `feat(cook): 맛별 대표 요리와 살 재료 계산`

---

### Task 5: 장바구니 화면과 담기 흐름 (계산·감성·식단 탭 연결)

**Files:**
- Modify: `cook/index.html` (새 `<section class="view" id="view-cart">`, 플로팅 버튼, 요리 고르기 시트, `renderSenseDetail`, 계산 탭 맛 설명 아래 버튼, `renderShop`)
- Test: `cook/tests/cart-ui.test.js`

**Interfaces:**
- Consumes: Task 3 장바구니 함수, Task 4 `TASTE_DISHES`·`dishLines`, 기존 `goCalcWithStyle`
- Produces:
  - `openDishPicker(styleId: string)` — 하단 시트: 요리 버튼(이모지+이름), 인분 버튼 `1 · 2 · 4`(기본 2), "🛒 장바구니에 담기". 담으면 `addToCart(dishLines(...), dish.name)` 후 토스트 "담았어요 · 장바구니 n개".
  - `showCart()` — 장바구니 뷰로 이동하고 `renderCart()`.
  - `renderCart()` — 상단 요약(살 것 n개), 살 것 목록(각 줄: 이름·`fmtQty`·작은 출처 표시·"□ 집에 있어요"·"✓ 샀어요"(=removeFromCart)·구매 버튼 자리 `data-buy`), 아래 "🏠 집에 있음" 줄(눌러서 되돌리기), "비우기", "공유하기" 버튼 자리.
  - DOM id: `cartFab`(플로팅 버튼, 개수 배지 `cartCount`), `view-cart`, `cartList`, `cartHome`, `cartClear`, `cartShare`, `dishSheet`.
- 진입점:
  - 계산 탭: 선택한 스타일에 `TASTE_DISHES[id]`가 있으면 `#styleDesc` 아래에 "🛒 살 재료 담기" 버튼 → `openDishPicker(id)`.
  - 감성 탭: `w.sid`가 있고 `TASTE_DISHES[w.sid]`가 있으면 상세에 같은 버튼.
  - 식단 탭: `renderShop`의 칩 목록 대신 "🛒 이번 주 재료 장바구니에 담기 (요리 n개)" 버튼. 누르면 식단의 각 요리를 `dishLines` 규칙(레시피 재사용 경로, 2인분)으로 담는다.
- `cartFab`은 장바구니가 비어 있으면 숨기고, 장바구니 뷰에서는 숨긴다. 하단 내비게이션을 가리지 않는 위치(`bottom: calc(nav 높이 + 12px)`).

- [ ] **Step 1: 실패 테스트 작성** (Playwright, 기기 `devices['Pixel 7']`)

```js
test("감성 카드 → 요리 고르기 → 담기 → 장바구니에 떡", … sense 탭 클릭 → 기름떡볶이맛 카드 → "살 재료 담기" → 시트에서 첫 요리, 2인분, 담기 → #cartFab 보임, #cartCount 텍스트 숫자>0 → cartFab 클릭 → #cartList innerText에 "떡볶이 떡" "400g"
test("집에 있어요를 누르면 아래 칸으로 내려간다", … 고춧가루 줄의 집에 있어요 클릭 → #cartHome에 "고춧가루", #cartList에 없음
test("새로고침해도 장바구니가 남는다", … page.reload() → 장바구니 열면 "떡볶이 떡" 있음
test("식단 탭 담기 버튼", storage et_meal_plan={mon:{l:"김밥"}} → 식단 탭 버튼 클릭 → 장바구니에 "김밥김"
test("모바일 폭에서 가로 스크롤이 없다", … 장바구니 열린 상태에서 document.documentElement.scrollWidth <= innerWidth
```

- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: 화면·진입점 구현** (스타일은 기존 CSS 변수와 `.chip`/`.savedhdr` 패턴 재사용)
- [ ] **Step 4: 실행** — `node --test cook/tests/` → 전부 PASS
- [ ] **Step 5: 스크린샷 확인** — Pixel 7로 장바구니·요리 시트 캡처해 눈으로 확인(겹침·잘림 없음)
- [ ] **Step 6: Commit** — `feat(cook): 장바구니 화면과 맛·식단에서 담기`

---

### Task 6: 구매 링크·수수료 고지·공유·앱 분기

**Files:**
- Modify: `cook/index.html`, `cook/sw.js`
- Test: `cook/tests/cart-ui.test.js` (추가)

**Interfaces:**
- Produces:
  - `SHOP_CONFIG = { affiliate: false, label: "쿠팡", searchUrl: q => "https://www.coupang.com/np/search?q=" + encodeURIComponent(q), disclosure: "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." }` — 제휴 전환 시 바꿀 곳은 이 객체뿐이다(코드 주석으로 명시).
  - `buyUrl(name: string) -> string` = `SHOP_CONFIG.searchUrl(name)`
  - `isNative() -> boolean` = `!!window.Capacitor?.isNativePlatform?.()`
  - `openExternal(url)` — 네이티브면 `window.open(url, "_system")`, 웹이면 `window.open(url, "_blank", "noopener")`.
  - `cartShareText() -> string` — 형식 고정:
    ```
    🛒 전자혀 장보기
    □ 떡볶이 떡 400g
    □ 대파 1대
    (집에 있음: 간장, 설탕)
    ```
    집에 있음이 없으면 마지막 줄 생략.
  - `shareCart()` — 네이티브면 `Capacitor.Plugins.Share.share({title:"장보기 목록", text})`, 아니면 `navigator.share`, 둘 다 없으면 `navigator.clipboard.writeText` 후 토스트 "복사했어요".
- 앱 분기: `isNative()`일 때 서비스 워커 등록을 건너뛰고(맨 아래 `<script>`), 냉장 탭 알림 버튼(`frNotif`)을 숨긴다.
- `sw.js`: `CACHE = "jeonjahyeo-v4"`, `ASSETS`에 `"./privacy.html"` 추가(Task 7 파일).

- [ ] **Step 1: 실패 테스트 추가**

```js
test("구매 버튼 링크는 검색 URL이고 고지 문구는 없다", … 장바구니 첫 줄 구매 버튼의 href(또는 data-buy로 계산된 URL) === "https://www.coupang.com/np/search?q=%EB%96%A1%EB%B3%B6%EC%9D%B4%20%EB%96%A1"; body innerText에 "쿠팡 파트너스" 없음
test("affiliate=true면 고지 문구가 장바구니 상단에 보인다", … page.evaluate(()=>{SHOP_CONFIG.affiliate=true; renderCart();}) → #view-cart 첫 블록 innerText에 disclosure 문구
test("공유 문구 형식", … 떡 담고 간장 집에 있음 → cartShareText() === "🛒 전자혀 장보기\n□ 떡볶이 떡 400g\n…\n(집에 있음: 간장)"
test("네이티브 흉내일 때 구매 버튼은 _system으로 연다", addInitScript로 window.Capacitor={isNativePlatform:()=>true,Plugins:{}} + window.open spy → 구매 버튼 클릭 → spy 인자 [buyUrl("떡볶이 떡"), "_system"]
test("네이티브 흉내일 때 SW 등록 안 함·알림 버튼 숨김", addInitScript로 window.Capacitor={isNativePlatform:()=>true,Plugins:{}} → navigator.serviceWorker.getRegistrations() 길이 0(파일 URL에선 SW 미지원이면 등록 함수 호출 여부를 spy로 확인), #frNotif 숨김
```

- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: 구현**
- [ ] **Step 4: 실행** — `node --test cook/tests/` → 전부 PASS
- [ ] **Step 5: Commit** — `feat(cook): 구매 링크·공유·앱 전용 분기`

---

### Task 7: 개인정보처리방침 페이지

**Files:**
- Create: `cook/privacy.html`
- Modify: `cook/index.html` (저장 탭 하단에 "개인정보처리방침" 링크 → `openExternal` 대신 같은 앱 안 상대 링크 `./privacy.html`)
- Test: `cook/tests/cart-ui.test.js` (추가)

내용(고정 항목, 한국어): 앱 이름·운영자 연락처 자리(`{{CONTACT_EMAIL}}` — 사용자가 정할 때까지 그대로 두고 `RELEASE.md` 체크리스트에 남김), 수집하는 개인정보 없음, 모든 데이터는 기기 안에만 저장(장바구니·즐겨찾기·식단·냉장고), 서버 전송 없음, 구매 버튼은 외부 쇼핑몰로 이동하며 그 이후는 해당 쇼핑몰 방침을 따름, 제휴 링크 전환 시 수수료를 받을 수 있음, 시행일 `2026-11-18`. 같은 디자인 토큰, 모바일 폭 대응.

- [ ] **Step 1: 실패 테스트** — `privacy.html`을 열면 `<h1>`이 "개인정보처리방침", 본문에 "수집하지 않" 포함, 저장 탭에서 링크 `a[href="./privacy.html"]` 존재
- [ ] **Step 2: 실행해 실패 확인**
- [ ] **Step 3: 작성**
- [ ] **Step 4: 실행** — 전부 PASS
- [ ] **Step 5: Commit** — `docs(cook): 개인정보처리방침 페이지`

---

### Task 8: Capacitor 안드로이드 프로젝트

**Files:**
- Create: `cook/app/package.json`, `cook/app/capacitor.config.json`, `cook/app/scripts/build-web.mjs`, `cook/app/.gitignore`, `cook/app/README.md`, `cook/app/android/` (`npx cap add android` 생성물), `cook/app/scripts/icons.py`(필요 시 `miri/gen_android_icons.py`를 `cook/icon-512.png` 입력으로 옮겨 씀)

**Interfaces:**
- `package.json` scripts: `"build:web": "node scripts/build-web.mjs"`, `"sync": "npm run build:web && cap sync android"`, `"android:bundle": "npm run sync && cd android && ./gradlew bundleRelease"`
- `build-web.mjs`: `cook/`의 `index.html`, `privacy.html`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`만 `cook/app/www/`로 복사(그 외 `docs/`, `tests/`, `sw.js`는 넣지 않음). `www/`는 `.gitignore`.
- `capacitor.config.json`: `{"appId":"com.jeonjahyeo.app","appName":"전자혀","webDir":"www","backgroundColor":"#FFF8F0"}` (배경색은 `index.html`의 `--bg` 값과 맞춘다)
- 의존성: `@capacitor/core`, `@capacitor/android`, `@capacitor/share` (8.x), devDependency `@capacitor/cli` 8.x
- `android/app/build.gradle`의 release `signingConfig`는 환경변수 `CJ_KEYSTORE_PATH`, `CJ_KEYSTORE_PASSWORD`, `CJ_KEY_ALIAS`, `CJ_KEY_PASSWORD`가 있을 때만 적용한다(없으면 서명 없이 빌드).
- 런처 아이콘·스플래시를 전자혀 아이콘으로 교체.

- [ ] **Step 1: 프로젝트 생성·의존성 설치** — `cd cook/app && npm install`
- [ ] **Step 2: `npx cap add android` → `npm run sync`** — Expected: `www/index.html` 존재, `android/app/src/main/assets/public/index.html` 존재, 에러 없음
- [ ] **Step 3: 버전 확인** — `grep targetSdkVersion android/variables.gradle` → 36 이상, `versionCode 1`, `versionName "1.0.0"`
- [ ] **Step 4: README 작성** — 로컬 빌드(Android Studio), 키 생성 명령(`keytool -genkey -v -keystore jeonjahyeo-release.jks -alias jeonjahyeo -keyalg RSA -keysize 2048 -validity 10000`), 키를 저장소 밖에 보관하라는 경고, CI 시크릿 이름 4개
- [ ] **Step 5: Commit** — `feat(cook): Capacitor 안드로이드 셸` (`www/`, `node_modules/`, keystore 미포함 확인: `git status`에 없음)

---

### Task 9: AAB 빌드 CI

**Files:**
- Create: `.github/workflows/cook-android.yml`

**Interfaces:**
- 트리거: `workflow_dispatch`, 그리고 `cook/**` 변경 push.
- 단계: checkout → Node 22 → JDK 21 (temurin) → `android-actions/setup-android` → `cd cook/app && npm ci && npm run sync` → `node --test cook/tests/` (Playwright: `npx playwright install --with-deps chromium`을 CI에서만 실행) → 시크릿 `CJ_KEYSTORE_BASE64`가 있으면 디코드해 `CJ_KEYSTORE_PATH`로 쓰고 나머지 3개 시크릿을 환경변수로 → `./gradlew bundleRelease` → `app-release.aab`를 아티팩트 `jeonjahyeo-aab`로 업로드.
- 시크릿이 없으면 `bundleRelease`는 서명 없는 AAB를 만들고, 워크플로 요약에 "서명되지 않음 — 플레이 업로드 불가"를 출력한다.

- [ ] **Step 1: 워크플로 작성**
- [ ] **Step 2: 로컬 문법 점검** — `python3 -c "import yaml,sys;yaml.safe_load(open('.github/workflows/cook-android.yml'))"` → 에러 없음
- [ ] **Step 3: Commit·push 후 Actions 실행 결과 확인** — 성공 시 `jeonjahyeo-aab` 아티팩트 존재. (실패하면 로그를 근거로 고치고 다시 실행.)
- [ ] **Step 4: Commit** — `ci(cook): 안드로이드 AAB 빌드`

---

### Task 10: 출시 체크리스트와 스토어 자료

**Files:**
- Create: `cook/docs/RELEASE.md`, `cook/app/scripts/screenshots.mjs`
- Modify: `AGENTS.md`의 `cook/` 설명에 "Capacitor 안드로이드 셸 `cook/app/`" 추가

**Interfaces:**
- `screenshots.mjs`: Playwright로 1080×1920(뷰포트 360×640, deviceScaleFactor 3) PNG 4장 → `cook/app/store/`: 감성 "요즘 말하는 맛", 요리 고르기 시트, 장바구니, 계산 결과.
- `RELEASE.md` 항목(체크박스):
  1. 플레이 콘솔 개인 계정 등록(25달러, 신분증·기기 인증)
  2. 서명 키 생성·보관, GitHub 시크릿 4개 등록
  3. 앱 만들기: 이름 `전자혀`, 무료, 카테고리 "음식 및 음료"
  4. 데이터 보안 양식 답변: 수집 데이터 없음, 공유 데이터 없음, 기기 내 저장만
  5. 콘텐츠 등급 설문, 타깃 연령(만 13세 이상 권장 — 쇼핑 링크 포함)
  6. 개인정보처리방침 URL(GitHub Pages의 `cook/privacy.html`), 연락처 이메일 확정 후 `{{CONTACT_EMAIL}}` 교체
  7. 스토어 문구(짧은 설명 80자, 자세한 설명) 초안
  8. 비공개 테스트 트랙에 AAB 업로드 → 테스터 12명 초대 → **14일 연속** 유지 → 프로덕션 액세스 신청
  9. 비공개 테스트 첫날 점검(실기기): 구매 버튼이 외부 브라우저로 열리고 뒤로 가기로 장바구니에 돌아오는지, 공유하기가 카톡 등으로 가는지, 비행기 모드에서 앱이 열리고 장바구니가 보이는지
  10. 쿠팡 파트너스 가입·승인 후: 약관에서 앱 내 링크 허용 확인 → `SHOP_CONFIG` 교체 → `versionCode` 올려 업데이트

- [ ] **Step 1: 스크린샷 스크립트 작성·실행** — 4장 생성, 눈으로 확인
- [ ] **Step 2: `RELEASE.md` 작성**
- [ ] **Step 3: `AGENTS.md` 갱신**
- [ ] **Step 4: 전체 테스트** — `node --test cook/tests/` → 전부 PASS
- [ ] **Step 5: Commit** — `docs(cook): 플레이 출시 체크리스트와 스토어 스크린샷`
