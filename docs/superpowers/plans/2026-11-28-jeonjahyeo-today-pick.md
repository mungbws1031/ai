# 전자혀 첫 화면 "오늘 뭐 먹을까요?" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 맛 고르기 첫 화면 맨 위에 질문 2~3개(누구랑·시간·매운 것)로 오늘 요리 하나를 골라 주는 카드를 넣는다.

**Architecture:** `cook/index.html`에 순수 함수(`dishMinutes`, `isSpicyHome`, `pickToday`)와 렌더 함수(`renderToday`)를 더하고, `#view-sense`의 찾기 칸 위에 `#todayPick` 카드를 둔다. 후보는 `HOME`(요리 사전, 로드 실패 시 빈 배열) 중에서만. 결과 버튼은 기존 `openHowTo(name)`을 인분 지정으로 연다.

**Tech Stack:** 순수 JS 단일 페이지, Playwright `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-27-jeonjahyeo-today-pick-design.md`

## Global Constraints
- 문구(그대로): 카드 제목 `오늘 뭐 먹을까요?` · 질문 `오늘 누구랑 먹어요?` / `시간은 얼마나 있어요?` / `매운 거 괜찮아요?` · 답 `👶 아이랑` `🙋 혼자` `👨‍👩‍👧 가족 다` / `⚡ 15분` `⏱ 30분` `🍲 넉넉해요` / `🙅 안 매운 거` `🌶 좋아요` · 결과 `오늘은 이거 어때요?` · 버튼 `이걸로 할게요` `다른 거 보기` `처음부터` · 조건 완화 안내 `조건을 조금 넓혀서 골랐어요` · 지난번 버튼 `지난번처럼({누구} · {시간}) 바로 골라 줘` (예: `지난번처럼(아이랑 · 30분) 바로 골라 줘`).
- 인분: 아이랑 2, 혼자 1, 가족 다 4. 아이랑 → `kid:true`만, 매운 질문 건너뜀(안 매운 것).
- 매운 요리 = `ing` 이름에 고춧가루·고추장·청양고추·두반장·고추기름·페페론치노·김치 중 하나 포함.
- 시간: `"25분"`→25, `"1시간 10분"`→70, `"1시간"`→60, 문자열에 `별도`가 있으면 Infinity(15·30분 조건에서 제외). 15분 → ≤15, 30분 → ≤30, 넉넉해요 → 제한 없음.
- 고르는 순서: 난이도 1→2→3 우선, 같은 난이도 안 무작위, `loadKidLog()`에 `no>0`인 요리는 맨 뒤. 맞는 것이 없으면 시간 조건을 없애고 안내 문구 표시. `다른 거 보기`는 이번 판에 나온 요리를 다시 내지 않는다(다 돌면 처음부터 다시).
- "처음이라면" 추천 목록(빈 검색 화면)은 뺀다. 찾기 칸·🏆·👶·맛 카드는 그대로.
- 기억: `cj_today_last` = `{who, time, spicy}` (try/catch). 저장소 실패해도 동작.
- `cook/sw.js` CACHE v17 → v18 (+ `privacy.test.js`). 전체 테스트 통과, 엔진 스냅샷 불변.

## Review Focus
1. 아이랑 + 어떤 시간이든 결과에 매운 요리 없음 → 테스트.
2. `다른 거 보기`를 후보 수보다 많이 눌러도 오류 없이 다시 돈다 → 테스트.
3. 요리 사전이 안 불러와져도(HOME 빈 배열) 카드가 오류 없이 "찾기를 써 보세요" 류 안내 → 테스트(기존 dishes.js 차단 테스트에 단언 추가).
4. `이걸로 할게요` → 만드는 법이 고른 인분(혼자 1, 가족 4)으로 열림 → 테스트.
5. 휴대폰 뒤로가기(시트 닫기) 동작 유지 → 기존 cookmode 테스트 통과.

---

### Task 1: "오늘 뭐 먹을까요?" 카드
**Files:** Modify `cook/index.html`, `cook/sw.js`, `cook/tests/privacy.test.js`, 기존 테스트 중 "처음이라면"에 기대는 것(find/home) · Create `cook/tests/today.test.js`

**Interfaces — Produces:**
- `dishMinutes(time:string): number`, `isSpicyHome(h): boolean`
- `pickToday({who:"kid"|"solo"|"family", time:15|30|0, spicy:boolean}, exclude:string[]): {dish:h|null, relaxed:boolean}`
- `renderToday()` — `#todayPick` 그리기; 상태 `_today={step, who, time, spicy, shown:[]}`.
- 결과 `이걸로 할게요` → `saveCookServ(name, serv)` 후 `openHowTo(name)`.
- 버튼 셀렉터: 답 `[data-today-who="kid|solo|family"]`, `[data-today-time="15|30|0"]`, `[data-today-spicy="0|1"]`, `[data-today="go|next|reset|again"]`.

- [ ] **Step 1: `today.test.js` 실패 테스트**
  - "dishMinutes": `"25분"→25`, `"1시간 10분"→70`, `"1시간"→60`, `"40분 (핏물 빼기 1시간·재우기 2시간 별도)"→Infinity`.
  - "첫 화면 맨 위에 카드와 첫 질문": `#todayPick`이 `#dishSearch`보다 위, 제목·첫 질문 문구 그대로, "처음이라면" 문구 없음.
  - "아이랑이면 매운 질문 없이 바로 추천, 20번 다 안 매움": who=kid, time=30 → 결과 카드 `오늘은 이거 어때요?`; `pickToday({who:"kid",time:0,spicy:false},[])` 20회 결과 모두 `kid:true`이고 `!isSpicyHome`.
  - "15분이면 15분 이하만": 50회 결과 `dishMinutes(time)<=15`.
  - "다른 거 보기 중복 없음, 다 돌면 다시": 결과에서 `다른 거 보기` 5번 → 이름 서로 다름; 후보 수+2번 눌러도 `page.__errors` 없음.
  - "이걸로 할게요 → 혼자는 1인분, 가족은 4인분으로 만드는 법": 시트 제목 ` · 1인분` / ` · 4인분`.
  - "조건 완화": `pickToday`에 맞는 후보 0개(테스트에서 HOME을 1개짜리로 바꿔치기)면 `relaxed:true` + 문구.
  - "지난번처럼": 한 번 끝까지 고른 뒤 새로 연 앱(같은 storage)에 `지난번처럼(아이랑 · 30분) 바로 골라 줘` 버튼 → 누르면 바로 결과.
  - "dishes.js 없어도": 기존 차단 테스트 환경에서 `#todayPick` 렌더, 오류 없음.
- [ ] **Step 2:** `node --test cook/tests/today.test.js` → FAIL
- [ ] **Step 3:** 구현 (Interfaces 그대로). 카드 모양은 기존 `.dish-find`/칩 스타일 재사용, 진행 점 3개(아이랑이면 2개).
- [ ] **Step 4:** `node --test cook/tests/*.test.js` → 전부 PASS
- [ ] **Step 5:** 스토어 스크린샷 1번 재생성(`node cook/app/scripts/screenshots.mjs`) 후 확인, 커밋 `feat(cook): 첫 화면 '오늘 뭐 먹을까요?' — 질문 몇 개로 오늘 요리 골라 주기`
