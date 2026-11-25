# 전자혀 요리 사전 + 초보·아이 맞춤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 흔한 집밥 요리 약 100개를 앱에 넣어 이름·다른 이름·재료로 찾게 하고, 요리마다 안심 정보·아이 팁, 요리 모드 준비 체크, 다 만든 뒤 칭찬·아이 반응(성공 요리 저장/위로)을 더한다.

**Architecture:** 새 요리는 고정 레시피 데이터 파일 `cook/dishes.js`(전역 `HOME_DISHES`)에 두고 `index.html`이 먼저 불러온다. 기존 `findDish / dishLines / dishSteps / howToHtml / allDishes`가 `dish.home`을 알아보게 넓혀, 만드는 법·요리 모드·장바구니가 기존 경로 그대로 동작한다. 맛 계산 엔진은 손대지 않는다.

**Tech Stack:** 순수 JS 단일 페이지(`cook/index.html`) + 데이터 파일, Playwright `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-25-jeonjahyeo-dish-library-design.md`

## Global Constraints
- 테스트 명령 `node --test cook/tests/*.test.js` 전부 통과, 엔진 스냅샷(`engine.test.js`) 불변.
- `cook/dishes.js`는 `cook/sw.js` ASSETS와 `cook/app/scripts/build-web.mjs` FILES에 추가. `sw.js` CACHE 버전 +1(현재 v14 → v15).
- 문구(그대로 사용):
  - 찾기 칸 placeholder: `뭐 해 먹을까요? 요리 이름이나 재료를 쳐 보세요`
  - 맛 고르기 화면 sub: `처음이어도 괜찮아요. 하나씩 같이 해요`
  - 준비 단계 제목: `불 켜기 전에, 이것만 준비해요`
  - 아이 팁 머리말: `👶 아이랑 먹는다면`
  - 칭찬: `끝까지 해냈어요! 오늘 한 끼, 정말 멋졌어요.`
  - 안 먹었을 때: `속상하셨죠. 아이가 안 먹는 건 요리 실력 탓이 아니에요. 아이 입맛은 같은 음식을 여러 번 만나야 열려요. 다음엔 이렇게 해 볼까요?`
  - 결과 없음: `아직 이 요리는 없어요. 비슷한 요리를 골라 보거나, 인터넷에서 레시피를 찾아볼 수 있어요.`
- 난이도 비유 3단계: 1=`계란 프라이 할 줄 알면 OK`, 2=`라면 끓일 줄 알면 OK`, 3=`한두 번 해 보면 OK`.
- 요리 이름은 앱 전체(맛 카드 요리 + RECIPES + HOME_DISHES)에서 중복 금지.
- 사용자 탓처럼 들리는 문구, 영양·건강 효과 단정 금지. 데이터는 기기 localStorage에만.

## Review Focus
1. 띄어쓰기·줄임말 검색("김치 볶음밥", "김볶밥", "된찌")도 찾혀야 함 → Task 1 테스트.
2. 인분 바꿀 때 숟가락 양이 0이나 0.25 같은 애매한 값이 되면 안 됨(반올림 0.5, 0이면 "약간") → Task 1 테스트.
3. 새 요리를 장바구니에 담으면 같은 재료가 합쳐지고 단위가 깨지지 않아야 함(큰술+큰술) → Task 1 테스트.
4. 준비 체크를 다 안 했으면 1단계로 못 넘어가야 하고, 요리 모드를 닫았다 다시 열면 체크가 초기화 → Task 3 테스트.
5. 아이 반응 저장 후 앱을 다시 열어도 "우리 집 성공 요리"에 남아야 함, 저장소 실패해도 화면은 동작 → Task 3 테스트.

---

### Task 1: 요리 사전 뼈대 — 데이터 형식, 찾기·만드는 법 연결, 안심 정보, 아이 팁, 인터넷 찾기
**Files:** Create `cook/dishes.js`, `cook/tests/home.test.js` · Modify `cook/index.html`(script 태그, `findDish`, `dishLines`, `dishSteps`, `howToHtml`, `allDishes`, `renderDishSearch`, 찾기 placeholder, sense sub), `cook/sw.js`, `cook/app/scripts/build-web.mjs`, `cook/tests/privacy.test.js`(캐시 버전)

**Interfaces — Produces:**
- `HOME_DISHES: Array<{name, emoji, alias:string[], cat:"rice"|"soup"|"stir"|"side"|"noodle"|"snack"|"egg"|"western", time:string, level:1|2|3, tools:string[], kid:boolean, kidTip:string, ing:Array<{n:string,a?:number,u?:string,t?:string}>, steps:string[], tip?:string}>` — `ing`은 **2인분 기준**, `a`+`u`(예: `{n:"간장",a:1.5,u:"큰술"}`) 또는 `t`(예: `{n:"소금",t:"약간"}`).
- `findDish(name)`이 HOME_DISHES도 찾아 `{styleId:null, dish:{name, emoji, home:<HOME_DISHES 항목>, main:[]}}` 반환.
- `homeLines(h, servings): Array<{name, qty}>` — `a*servings/2`, 단위가 큰술·작은술·컵이면 0.5 단위 반올림(0이면 `"약간"`), 그 밖은 `fmtNum`. `dishLines`가 `dish.home`이면 이것을 반환.
- `dishSteps(dish)`가 `dish.home`이면 `{steps:h.steps, tip:h.tip||""}`.
- `levelText(level): string` — 위 3단계 문구.
- `howToHtml`이 `dish.home`이면 제목 아래 `.howto-meta` 줄 `🍳 {levelText} · ⏱ {time} · {tools.join("·")} 하나씩`과 `kidTip`이 있으면 `.howto-kid` 상자(`👶 아이랑 먹는다면` + 팁).
- `allDishes()` 항목에 HOME_DISHES 추가(`words` = 이름+alias+재료명, `kid`).
- 검색 결과 없음: 결과 없음 문구 + `<button class="df-web">🌐 인터넷에서 "{q}" 레시피 찾기</button>` → `openExternal("https://www.10000recipe.com/recipe/list.html?q="+encodeURIComponent(q))`.
- 빈 검색: 기존 "처음이라면" 목록 앞에 `<button class="df-kid">👶 아이가 잘 먹는</button>` — 누르면 `kid:true` 요리 목록(`df-head`: `👶 아이가 잘 먹는 요리 N개`).

- [ ] **Step 1: `home.test.js` 실패 테스트** (Pixel 7, `openApp`)
  - "dishes.js가 불러와지고 형식이 맞다": 각 항목 name·emoji·time·level(1~3)·tools·ing·steps(≥3단계, 각 8자 이상) 존재, `cat` 값 허용 목록.
  - "이름은 앱 전체에서 중복 없다": TASTE_DISHES+RECIPES+HOME_DISHES 이름 집합 크기 = 총 개수.
  - "된장찌개·김볶밥·김치 볶음밥·된찌로 찾힌다": `#dishSearch` 입력 후 `[data-dish="된장찌개"]`, `[data-dish="김치볶음밥"]` 존재(시드 데이터에 이 둘 포함, alias `김볶밥`,`된찌`).
  - "만드는 법에 안심 정보·아이 팁, 4인분이면 양 두 배": 된장찌개 열기 → `.howto-meta`에 `라면 끓일 줄 알면 OK` 같은 레벨 문구·시간, `.howto-kid`에 `👶 아이랑 먹는다면`; `[data-serv="4"]` 후 첫 재료 양이 2인분의 2배.
  - "1인분 숟가락 양은 0.5 단위, 0이면 약간": `homeLines({ing:[{n:"간장",a:0.5,u:"큰술"},{n:"후추",a:0.2,u:"작은술"}]},1)` → `["0.5큰술","약간"]`.
  - "장바구니에 담으면 같은 재료 합침": 된장찌개 2인분+김치볶음밥 2인분 담기 → 공통 재료(예: 다진마늘 큰술) 한 줄, 단위 유지.
  - "없는 요리는 인터넷 찾기 버튼": `랍스터테르미도르` 입력 → 결과 없음 문구 그대로, `.df-web` 존재. (`window.open`을 stub해 URL에 `10000recipe.com`과 인코딩된 검색어 확인)
  - "👶 아이가 잘 먹는 바로가기": 클릭 → 목록의 모든 항목이 `kid:true`.
  - "placeholder·sub 문구": 위 Global Constraints 문구 그대로.
- [ ] **Step 2:** `node --test cook/tests/home.test.js` → FAIL
- [ ] **Step 3: 구현** — 위 Interfaces 대로. `cook/dishes.js`에는 시드로 **된장찌개, 김치볶음밥** 2개(완전한 데이터, alias 포함). script 태그는 메인 script보다 앞. ASSETS/FILES/CACHE 갱신.
- [ ] **Step 4:** `node --test cook/tests/*.test.js` → 전부 PASS (기존 find/howto 테스트 포함)
- [ ] **Step 5: Commit** `feat(cook): 요리 사전 뼈대 — 안심 정보·아이 팁·인터넷 찾기`

### Task 2: 요리 약 100개 채우기
**Files:** Modify `cook/dishes.js` · Test `cook/tests/home.test.js`

**Interfaces — Consumes:** Task 1의 `HOME_DISHES` 형식.

분류별 목표 개수(시드 2개 포함, 기존 앱 요리와 이름 겹치지 않게): 밥·덮밥 15 / 국·찌개·탕 15 / 볶음·조림·구이 20 / 반찬·무침 15 / 면 10 / 분식·간식 10 / 계란·두부 8 / 간단 양식 7. 집에서 흔히 해 먹고 검색 많이 하는 순.
작성 규칙:
- 2인분 양념은 큰술·작은술·컵, 주재료는 g·개·대·모. 일반 가정식 레시피 범위.
- 4~6단계, 불 세기·시간·"이렇게 되면 다음으로" 신호.
- 고기·닭·해산물은 "속까지 익었는지 확인" 단계.
- 단계에 나오는 재료(기름·버터·소금 포함)는 모두 `ing`에 있다.
- 매운 요리는 `kidTip`에 "고춧가루·고추장 넣기 전에 아이 몫 덜기" 류.
- `kid:true`는 맵지 않고 아이들이 대체로 좋아하는 요리만.
- alias에 흔한 줄임말·띄어쓰기 변형.

- [ ] **Step 1: 테스트 추가** — "요리 사전은 95개 이상, 분류별 최소 개수"(위 목표의 −1까지 허용), "단계에 나오는 식용유·버터·소금·참기름·설탕이 재료에 있다", "검색어 목록이 모두 찾힌다": `["된장찌개","김치찌개","미역국","계란말이","제육","잡채","라면","카레","떡국","불고기","오므라이스","볶음밥","비빔밥","감자조림","콩나물무침"]` 각각 결과 ≥1.
- [ ] **Step 2:** FAIL 확인
- [ ] **Step 3:** 데이터 작성
- [ ] **Step 4:** 전체 테스트 PASS
- [ ] **Step 5: Commit** `feat(cook): 집밥 요리 약 100개 추가`

### Task 3: 요리 모드 준비 체크, 다 만든 뒤 칭찬·아이 반응·성공 요리
**Files:** Modify `cook/index.html`(`startCookMode`, `renderDishSearch`) · Test `cook/tests/howto.test.js`, `cook/tests/home.test.js`

**Interfaces — Produces:**
- 요리 모드 시작 화면이 **준비 단계**: 제목 `불 켜기 전에, 이것만 준비해요`, 재료마다 체크박스(`.cook-prep input[type=checkbox]`), `다 준비했어요 ▶`(`data-ck="prepdone"`)는 모두 체크 전 disabled. 이후 기존 1단계부터. 진행 표시 `준비` → `1 / N`.
- 마지막 단계 뒤 화면: 제목 위 칭찬 문구, 기존 맛보기, 아래 `아이 반응` 버튼 3개 `data-kid="good"|"meh"|"no"`.
- `KID_LOG_KEY="cj_kid_log"`, `loadKidLog(): {[name]:{good,meh,no,last}}`, `logKid(name, kind)` (try/catch).
- `good` → 토스트 `우리 집 성공 요리에 담았어요` 후 닫기. 빈 검색 화면에 `🏆 우리 집 성공 요리` 목록(good>0, 최근 순).
- `no` → `#cookKid`에 위로 문구(그대로) + 그 요리 `kidTip`(있으면) + `fixHtml(weight,"kid_reject")` + `kid:true` 요리 3개 버튼(`data-dish`, 누르면 `openHowTo`).

- [ ] **Step 1: 테스트** — 기존 howto 요리 모드 테스트를 준비 단계 통과 후 진행하도록 고치고 추가: "준비 체크 전엔 다음 불가, 다 체크하면 1 / N", "다시 열면 체크 초기화", "끝나면 칭찬 문구", "아이 반응 good → 새로 연 앱의 빈 검색에 성공 요리로 보임(같은 storage)", "no → 위로 문구 그대로 + 처방 + 추천 3개", "localStorage 쓰기 실패해도 오류 없이 동작"(`Storage.prototype.setItem` throw stub).
- [ ] **Step 2:** FAIL
- [ ] **Step 3:** 구현
- [ ] **Step 4:** 전체 PASS
- [ ] **Step 5: Commit** `feat(cook): 요리 모드 준비 체크·칭찬·아이 반응과 우리 집 성공 요리`

### Task 4: 레시피 점검·마무리
**Files:** Modify `cook/dishes.js`(지적 반영), `cook/app/store/*.png`, `cook/docs/RELEASE.md`

- [ ] **Step 1:** HOME_DISHES를 2인분 텍스트로 덤프해 리뷰어(일반 가정식과 비교: 양념 2배↑/0.5배↓, 익힘 확인, 목록에 없는 재료, 위험한 단계, 초보가 못 알아듣는 말, kid 표시가 맞는지)에게 점검 → 실패·맛 저하 수준 모두 반영 → 실패 0건 판정까지 반복(최대 3회).
- [ ] **Step 2:** `node cook/app/scripts/screenshots.mjs`, `feature-graphic.mjs` 재생성, 직접 확인.
- [ ] **Step 3:** RELEASE.md 스토어 설명에 "요리 100여 개", "아이 맞춤 팁·우리 집 성공 요리" 한 줄씩.
- [ ] **Step 4:** 전체 테스트 PASS
- [ ] **Step 5: Commit** `fix(cook): 요리 사전 점검 반영, 스토어 이미지·문구 갱신`
