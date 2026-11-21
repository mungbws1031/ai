# atomciv 난이도 모드 + 반응 순서 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 쉬움·보통·어려움 모드, 분자 반응 레시피, 첫 분자 팁을 추가한다.
**Architecture:** 단일 파일 `atomciv/index.html`. RECIPES 출력이 MOLECULES 키일 수 있게 하고, `state.mode`로 분기한다.
**Tech Stack:** 바닐라 JS, node:test + Playwright.
**Spec:** `docs/superpowers/specs/2026-11-21-atomciv-modes-reactions-design.md`

## Global Constraints
- 기존 저장(mode 없음)은 'normal'로 본다. 미션 문구는 세로 태블릿에서 한 줄에 들어가야 한다.

## Review Focus
- 어려움 모드에서 원자로 만든 반응 분자는 found에 들어가지 않는다.
- 그릇에서 만든 분자는 발견 카드가 뜨고 found에 들어간다. 지도 타일은 요구하지 않는다.
- 이산화탄소 미션 때 CO₂가 그릇에 자동으로 들어가지 않는다.
- 저장 파일을 왕복해도 mode가 유지된다.
- 첫 실행에만 난이도 고르기 카드가 나오고, 테스트용 기존 저장에는 나오지 않는다.

### Task 1: 반응 레시피 + Cl₂ + 미션 순서 (logic)
- [ ] 테스트: matchRecipe(['CaO','H2O'])==='CaH2O2' 등 8개, 미션에서 'CaO'<'CaH2O2'<'CCaO3', 'HNaO'<'CHNaO3', 'Cl2'<'ClHO'
- [ ] 구현: RECIPES 8개, MOLECULES.Cl2, MISSIONS 순서 조정, hintText가 분자 출력 레시피를 안내
- [ ] 통과 확인 후 커밋

### Task 2: 그릇에서 분자 출력 처리 + 자동 넣기 규칙 (e2e)
- [ ] 테스트: 그릇에 CO₂ + 물 → 합치기 → '탄산' 카드, found에 CH2O3. CO₂ 미션 중 CO₂ 만들면 그릇 비어 있음
- [ ] 구현: combine에서 MOLECULES[out]이면 formula 카드 + dropIntoTray. dropIntoTray 조건 변경
- [ ] 커밋

### Task 3: 모드 상태 + 고르기 카드 + 저장 (e2e/logic)
- [ ] 테스트: 저장이 없을 때 #mode-pick이 보이고 'hard'를 누르면 state.mode==='hard'. export/import 왕복. 기존 저장은 normal
- [ ] 구현: defaultState에 mode는 넣지 않음. modeOf(s)=s.mode||'normal'. 고르기 카드와 💾 패널 버튼
- [ ] e2e fresh()에 기본 저장 {found:[],mode:'normal'}을 넣는 init 추가 (테스트 자체 init 뒤에)
- [ ] 커밋

### Task 4: 모드별 동작 (e2e)
- [ ] 테스트: hard는 원자로 Ca(OH)₂를 만들면 "반응" 카드가 뜨고 found에 없음, 서랍 손 점 숨김, 힌트 3번 뒤 비활성. normal은 Ca(OH)₂ 카드에 "실제로는" 반응식. easy는 H₂ 미션에서 💡를 누르면 실험대에 H 2개 + #guide 손가락. easy·normal은 첫 미션 #tip이 보이고, hard는 없음
- [ ] 구현: REACTION_MADE 집합(레시피 출력 분자), checkComplete 분기, hintsUsed, #tip, #guide
- [ ] 커밋
