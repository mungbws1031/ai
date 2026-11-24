# "주차 한 판" 정식 버전 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 시험판(`parking-game/spike/day.html`)을 3일 진행·저장·실력 보너스·하루 기록이 있는 정식 게임으로 만들고, `parking-game/index.html` 첫 화면으로 둔다.

**Architecture:** 판정은 기존 `judge.js`/`rules.js`, 지도는 `levels.js`를 그대로 쓴다. `game.js` 안의 렌더러를 `render.js`로 분리해 예전 모드(`classic.html`)와 새 게임이 함께 쓴다. 단속 시뮬레이션은 화면과 분리한 순수 함수 파일(`day-sim.js`)로 두고 Node로 테스트한다.

**Tech Stack:** 정적 HTML + 바닐라 JS (빌드 없음), Node 테스트 스크립트, Playwright 스모크.

**Spec:** `docs/superpowers/specs/2026-11-24-parking-game-day-mode-design.md`

## Global Constraints
- 빌드 단계 없음: `index.html`을 열면 실행. 브라우저/Node 공용 파일은 `module.exports` 또는 `window`에 붙이는 기존 패턴을 따른다.
- 시작 돈 50,000원 · 약속 보너스 +10,000 · 지각 −5,000 · 수리비 −10,000(속도 1.6m/s 초과 충돌) · 경고 스티커 −5,000 · 관리실 호출 −15,000 · 견인 −40,000 · 실력 보너스 +3,000
- 자석 주차 반경 3.5m, 각도 60° 이내, 정렬 0.45초. 조이스틱: 전진 4m/s, 후진 2.5m/s, 조향 42°.
- 시간제 칸은 허용 시간 종료 후부터, 정차만 되는 곳은 5분 후부터 위반으로 계산.
- 플레이 중 법 조문을 띄우지 않는다. 정산 한 줄(쉬운 말) + 하루 기록의 "근거 보기"에서만.
- 효과음 없음. `navigator.vibrate`가 있으면 충돌·과태료 순간 60ms 진동(없으면 무시).
- localStorage 읽기·쓰기는 모두 try/catch (막혀도 게임은 진행).

## Review Focus
1. 시간제 칸에서 허용 시간 경계를 걸치는 체류(예: 13:40부터 30분) → 14:00 이후 분만 위반 → Task 2 테스트로 고정.
2. 하루 도중 파산 → 그날 종료, 다음 날 해금 안 됨, 기록 화면은 정상 → Task 4 스모크.
3. localStorage 차단(사생활 모드) → 진행 저장 없이 1일차부터 정상 플레이 → Task 4에서 `localStorage` 예외를 던지게 한 스모크.
4. 낮은 화면(844×390)에서 정산/기록 카드가 넘침 → 카드 내부 스크롤, 버튼 접근 가능 → Task 4 스모크 스크린샷.
5. 자석 목표가 주차된 차와 겹침 → 목표 제외(충돌하는 자리로 스냅 금지) → Task 2 테스트.

---

### Task 1: 렌더러 분리 + 예전 모드를 classic.html로

**Files:**
- Create: `parking-game/render.js` (game.js 23~272행의 `drawWorld`, `drawCar`, `sizeCanvas`와 그 상수)
- Modify: `parking-game/game.js` (렌더러 삭제, `window.PGRender` 사용)
- Move: `parking-game/index.html` → `parking-game/classic.html` (`<script src="render.js">` 추가)
- Delete: `parking-game/spike/` (Task 4 완료 후)

**Interfaces:**
- Produces: `window.PGRender = { drawWorld(ctx, lv, cam, opts), drawCar(ctx, pose, color, opts), sizeCanvas(canvas) -> {w,h,dpr} }` — 시그니처는 현재 game.js와 동일.

- [ ] Step 1: 분리 후 `node --check` 통과, `node parking-game/test-judge.js` → 76 passed
- [ ] Step 2: Playwright로 `classic.html` 열어 판단 연습 1레벨 끝까지, 콘솔 오류 0
- [ ] Step 3: Commit `parking-game: 렌더러를 render.js로 분리, 예전 모드는 classic.html`

### Task 2: 단속 시뮬레이션 순수 모듈

**Files:**
- Create: `parking-game/day-sim.js`, `parking-game/test-day.js`

**Interfaces:**
- Produces:
  - `encAt(place, phase, t) -> {x, y}` (순찰 왕복, 주기 `place.loop`분)
  - `watchAng(w, t) -> rad`, `sees(w, t, pose) -> bool` (반경 16m, 반각 35°)
  - `illegalFrom(lv, pose, judgement, t0) -> minutes`
  - `simulateStay({lv, place, phase, watchers, pose, judgement, t0, stay}) -> {ev: [{m, k}], res: {bad, manner, ticket, report, cctv, fined, notice, tow, sticker, from}}`
  - `settleLines(res, judgement, {late, guard}) -> [[label, won]]`
  - `snapTarget(lv, parked, car) -> pose|null`

- [ ] Step 1: 테스트 작성 — `시간제 12:10 30분 → res.bad false`, `시간제 13:40 30분 → from 20, 단속 m≥20만`, `합법 칸 → ev 빈 배열`, `황색 점선 40분 단속원 상주 → ticket ≥ 5`, `보호구역 40분 + 주민 시야 안 → report 존재, tow = report+10`, `스냅 목표가 주차된 차와 겹치면 null`
- [ ] Step 2: `node parking-game/test-day.js` → FAIL (모듈 없음)
- [ ] Step 3: 시험판 로직을 옮겨 구현
- [ ] Step 4: 테스트 PASS
- [ ] Step 5: Commit

### Task 3: 3일치 장소 설정

**Files:**
- Create: `parking-game/day-places.js` (`window.DAYS` / `module.exports`)
- Modify: `parking-game/test-day.js`

**Interfaces:**
- Produces: `DAYS = [{title, places:[{key, who, task, limit, stays, loop, guard, patrol:[[x,y],[x,y]], watchers:[[x,y,dir]], n, maybeCar?}], hard?:{guards:2, limitScale:0.8}}]` — 1일차 mart·apt·mall·house·hospital, 2일차 market·station·bridge·highway, 3일차 hard: hospital·market·station·house·school.

- [ ] Step 1: 테스트 — 모든 장소의 key가 LEVELS에 있음, 순찰점·주민 좌표가 world 안, 무작위 준비 50회마다 빈 합법 자리(칸 또는 white_edge 후보) ≥1
- [ ] Step 2: 구현, 테스트 PASS
- [ ] Step 3: Commit

### Task 4: 게임 화면(index.html + day.js)

**Files:**
- Create: `parking-game/day.js`, 새 `parking-game/index.html`

**Interfaces:**
- Consumes: Task 1~3 전부.
- Produces: 저장 키 `pg-day-progress` = `{unlocked: 1~3, best: {1: won, 2: won, 3: won}}`

- [ ] Step 1: 시험판 화면을 옮기고, 시작 화면에 1~3일차 선택(잠긴 날은 회색) + 구석 "예전 연습 모드" 링크(`classic.html`)
- [ ] Step 2: 실력 보너스 — 자석 없이 P를 눌렀고 `judgement.inSlot && align.score >= 80`이면 +3,000
- [ ] Step 3: 하루 끝 "오늘의 기록": 장소별 세운 곳·결과·쉬운 말, `<details>근거 보기</details>`로 `rule.law`
- [ ] Step 4: 하루 완주(파산 아님) 시 다음 날 해금·최고 기록 저장, 진동
- [ ] Step 5: Playwright 스모크 — 1일차 5곳 자동 진행(텔레포트), 파산 경로, localStorage 예외, 844×390 카드 스크린샷, 콘솔 오류 0
- [ ] Step 6: Commit

### Task 5: 배포 연결과 문서

**Files:**
- Modify: `.github/workflows/deploy-pages.yml` (`parking-game/*.html`, `*.js` 복사, `test-*.js` 제외), `parking-game/README.md`
- Delete: `parking-game/spike/`

- [ ] Step 1: README에 새 게임 규칙·파일 구조·테스트 명령
- [ ] Step 2: 두 테스트 스크립트 PASS, YAML 문법 확인
- [ ] Step 3: Commit, push
