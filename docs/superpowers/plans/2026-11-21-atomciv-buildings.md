# atomciv 건물·지형 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 건물을 만들어 지도에 직접 세우고, 지형이 바뀌게 한다.
**Architecture:** `atomciv/index.html` 한 파일. 순수 함수 `validSites(id, found, placed)`, `terrainAt(q, r, placed)`, `territory(found, placed)`로 규칙을 만들고, renderMap은 placing 모드만 추가한다.
**Tech Stack:** 바닐라 JS, node:test + Playwright.
**Spec:** `docs/superpowers/specs/2026-11-21-atomciv-buildings-design.md`

## Global Constraints
- 기존 저장(placed 없음)이 그대로 동작해야 한다. 미션 문구는 세로 태블릿에서 한 줄에 들어가야 한다.

## Review Focus
- 미션 순서대로 건물을 만들고 첫 번째 가능한 칸에 세울 때, 모든 건물에 세울 칸이 있어야 한다 (시뮬레이션 테스트).
- 다리를 물에 세우면 영토가 물 건너로 넓어진다.
- 아직 안 세운 건물이 지도 칩으로 남는다.
- 저장 파일을 왕복해도 placed가 유지된다.
- 폰 화면에서 지도를 밀어서 볼 수 있다.

### Task 1: 규칙 (logic)
- [ ] 테스트: MAP_RADIUS 8, 건물 21개, 시뮬레이션(전부 세울 칸 있음), 다리 영토 확장, 논밭 지형 변경, 저장 왕복
- [ ] 구현: 데이터, validSites, terrainAt/territory에 placed 반영
### Task 2: 화면 (e2e)
- [ ] 테스트: 움집 만들기 → [지도에 세우러 가기] → 반짝이는 칸 누르기 → 저장됨, 지도에 🛖. 안 세운 건물 칩. 폰 지도 스크롤
- [ ] 구현: 카드 버튼, placing 모드, 칩, 스크롤
