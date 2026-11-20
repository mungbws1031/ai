# 전자혀 하단 탭 4개 + 더보기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 하단 탭 9개 + 떠 있는 장바구니 버튼을 `맛 고르기 · 장바구니 · 계산 · 더보기` 4개로 줄이고, 앱 첫 화면을 맛 고르기로 바꾼다.

**Architecture:** 화면(`section.view`)은 그대로 두고, 화면 전환을 한 함수 `showView(viewId)`로 모아 탭 강조와 "← 더보기" 줄을 함께 처리한다. 더보기는 새 `section.view#view-more` 목록 화면이다. 지금 곳곳에 흩어진 "nav 강조 + view 전환" 코드(약 6곳)는 모두 `showView` 호출로 바꾼다.

**Tech Stack:** 단일 `cook/index.html`(순수 JS), Playwright `node:test` 테스트.

**Spec:** `docs/superpowers/specs/2026-11-19-jeonjahyeo-tabs-design.md`

## Global Constraints
- 하단 탭은 정확히 4개, 순서와 문구: `🍽️ 맛 고르기`(data-view="sense") · `🛒 장바구니`(data-view="cart") · `🧮 계산`(data-view="calc") · `☰ 더보기`(data-view="more").
- 앱을 켜면 `view-sense`가 보이고 "맛 고르기" 탭이 켜진다.
- 더보기 항목 7개, 순서와 문구: 요리 레시피(recipe) · 소스(sauce) · 식단(meal) · 냉장고(fridge) · 맛 보정(fix) · 저장한 배합(saved) · 맛 그래프(explore).
- 더보기 안 화면(recipe·sauce·meal·fridge·fix·saved·explore)이 보일 때는 하단 "더보기" 탭이 켜지고, 그 화면 맨 위에 "← 더보기" 버튼 줄이 보인다. 다른 화면에서는 이 줄이 없다.
- 떠 있는 장바구니 버튼(`#cartFab`)과 `.frame.hasfab` 여백은 없앤다. 장바구니 탭에 담긴 개수 배지(`#cartCount`, 0이면 숨김)를 단다.
- 기능 손실 0: 기존 화면 간 이동(감성→계산 `goCalcWithStyle`, 감성→탐색 `applySenseToExplore`, `goRecipe`, `goSauce`, 식단→장바구니, `showCart`)이 그대로 동작한다.
- 계산 엔진 출력 불변(`cook/tests/engine.test.js` 통과). 테스트 명령: `node --test cook/tests/*.test.js`.
- `cook/sw.js` CACHE 버전 +1.

## Review Focus
1. 더보기 안 화면에서 다른 화면으로 넘어가는 연결(예: 저장 탭의 개인정보처리방침 링크, 레시피 → 소스) 뒤에도 탭 강조가 맞아야 한다 → Task 1 테스트 "goSauce 뒤 더보기 탭 강조".
2. 장바구니가 비었을 때 배지가 "0"으로 보이면 안 된다 → Task 1 테스트 "빈 장바구니 배지 숨김".
3. 예전 버전에서 쓰던 것과 다른 화면이 첫 화면이 되어도 저장 데이터(장바구니·식단 등)는 그대로 → 기존 cart-ui 저장 테스트 유지.
4. 360px 폭에서 탭 4개 글자가 잘리거나 가로 스크롤이 생기면 안 된다 → Task 1 테스트.
5. 키보드/스크린리더: 탭 버튼과 더보기 항목은 `<button>`이고 접근 가능한 이름이 있어야 한다 → Task 1 테스트(역할·이름 조회).

---

### Task 1: 탭 4개 + 더보기 화면 + showView

**Files:**
- Modify: `cook/index.html` (nav 마크업 ~619-631, 탭 클릭 처리 ~1158, 화면 이동 함수들 ~1472·1602·1923·2062·2136, cart FAB ~2128-2163, `.frame.hasfab` CSS ~316)
- Modify: `cook/sw.js` (CACHE +1), `cook/tests/cart-ui.test.js`, `cook/tests/privacy.test.js` (FAB·옛 탭 클릭을 새 경로로)
- Create: `cook/tests/nav.test.js`

**Interfaces:**
- Produces: `MORE_VIEWS = ["recipe","sauce","meal","fridge","fix","saved","explore"]`; `showView(viewId: string): void` — 모든 `.view`에서 active를 빼고 `#view-<viewId>`에 넣고, 탭 강조는 `MORE_VIEWS.includes(viewId) ? "more" : viewId`, 스크롤 맨 위, 더보기 줄 표시/숨김, 장바구니면 `renderCart()`; `updateCartBadge(): void` (기존 `updateCartFab` 대체).
- Test helper(테스트 파일 안): `async function goMore(page, viewId)` — 더보기 탭 → `#view-more [data-go="<viewId>"]` 클릭.

- [ ] **Step 1: `nav.test.js` 실패 테스트 작성** (기기 Pixel 7, `openApp` 사용)
  - "탭은 4개이고 순서·문구가 맞다": `.nav button` 텍스트(공백 제거) = `["🍽️맛고르기","🛒장바구니","🧮계산","☰더보기"]`
  - "첫 화면은 맛 고르기": `#view-sense`가 `.active`, `.nav button.on` data-view = "sense"
  - "더보기 7항목이 각 화면으로 간다": 7개 각각 goMore 후 `#view-<id>.active`, 켜진 탭 = "more", "← 더보기" 줄 보임 → 누르면 `#view-more.active`
  - "goSauce 뒤 더보기 탭 강조": `page.evaluate(()=>goSauce(SAUCES[0].name))` 후 켜진 탭 "more"
  - "빈 장바구니 배지 숨김 / 담으면 숫자": 처음 `#cartCount` 안 보임; 감성에서 기름떡볶이 담은 뒤 보이고 숫자 > 0
  - "떠 있는 장바구니 버튼 없음": `#cartFab` 개수 0
  - "360px 가로 스크롤 없음": 뷰포트 360×740에서 `scrollWidth <= innerWidth`
  - "탭·더보기 항목 접근 이름": `page.getByRole('button',{name:'더보기'})`, `getByRole('button',{name:/냉장고/})` 각각 1개 이상
- [ ] **Step 2: 실행해 실패 확인** — `node --test cook/tests/nav.test.js` → FAIL
- [ ] **Step 3: 구현** — nav 마크업 4개 버튼(장바구니 버튼 안에 `<span class="cnt" id="cartCount">`), `#view-more`(7개 `<button data-go>` 카드 목록, 기존 카드 스타일 재사용), 각 더보기 화면 맨 위에 공용 "← 더보기" 줄(한 번 정의해 `showView`가 해당 화면 앞에 붙이거나 표시 토글), `showView`로 기존 전환 코드 6곳 교체, FAB·hasfab 제거, 초기 화면 sense. `cook/sw.js` CACHE +1.
- [ ] **Step 4: 기존 테스트 경로 수정** — `#cartFab` 클릭 → `.nav button[data-view="cart"]`; `data-view="meal"|"fridge"|"saved"` 탭 클릭 → `goMore(page, …)`; FAB 숨김을 기대하던 단언은 배지 단언으로 바꾼다(단언의 뜻은 유지).
- [ ] **Step 5: 전체 실행** — `node --test cook/tests/*.test.js` → 전부 PASS (엔진 스냅샷 포함)
- [ ] **Step 6: 화면 확인** — Pixel 7 스크린샷(첫 화면, 더보기, 냉장고+"← 더보기", 장바구니)을 scratchpad에 찍어 직접 본다: 겹침·잘림 없음.
- [ ] **Step 7: Commit** — `feat(cook): 하단 탭 4개(맛 고르기·장바구니·계산·더보기)로 정리`

### Task 2: 스토어 이미지 다시 만들기

**Files:**
- Modify: `cook/app/scripts/screenshots.mjs` (FAB 대신 장바구니 탭, 옛 탭 클릭 경로), `cook/app/store/*.png` 4장 + `feature-graphic.png`, 필요 시 `cook/docs/RELEASE.md`의 화면 설명

**Interfaces:**
- Consumes: Task 1의 탭 `data-view` 값과 `#view-more [data-go]`.

- [ ] **Step 1: screenshots.mjs 경로 수정 후 실행** — `node cook/app/scripts/screenshots.mjs` → 4장 1080×1920 생성, 하단에 탭 4개가 보임
- [ ] **Step 2: 피처 그래픽 다시 만들기** — `node cook/app/scripts/feature-graphic.mjs` → 1024×500
- [ ] **Step 3: 5장 모두 직접 보고 확인** — 탭 4개, 겹침 없음
- [ ] **Step 4: 전체 테스트** — `node --test cook/tests/*.test.js` → PASS
- [ ] **Step 5: Commit** — `docs(cook): 탭 정리 후 스토어 스크린샷·피처 그래픽 갱신`
