# AGENTS.md

This repository began as an early-stage concept evaluation tool for LFA urine
stick ideas, but has since grown into a multi-project workspace. It now also
hosts standalone apps such as `frontend/` (Next.js IVDR workflow UI),
`backend/` (Python), `ticketing/`, `site/`, `eddie/` (Next.js ADHD routine
companion app), `scent-mixer/` (single-file PWA), `handfont/` (손글씨 → TTF 폰트 생성 단일 파일 웹앱), `tina/` (정리 임팩트
최적화 PWA — 사진 기반 티 점수 분석), and `miri/` (Vite + React PWA — ADHD
워킹맘용 선제적 리마인더 & 역산 스케줄러, PRD-MIRI-MVP-v0.1), and
`digestion-sim/` (단일 파일 소화 시뮬레이터 — 식사별 72시간 소화·흡수·배변 모델), and
`land-price/` (영동군 심천면 초강리 농지 실거래 인포그래픽 — 국토부 실거래 CSV + 단일 HTML), and
`gulza/` (무료 모션 자막 제작기 — ruruoni1/gulza v0.16.1 사본, MIT, 정적 웹앱 + AE 패널), and
`atomciv/` (원자에서 문명까지 — 초등학생용 원자→분자→발명→시대 과학 게임, 단일 HTML PWA), and
`parking-game/` (가로 화면 주차 게임 프로토타입 — 도로교통법 기준 정차·주차 판정, 정적 HTML + 바닐라 JS), and
`cook/` (전자혀 — 요리 초보용 맛 튜닝 계산기 단일 파일 PWA + Capacitor 안드로이드 셸 `cook/app/`, 기획서 `cook/docs/PRD.md`, 출시 체크리스트 `cook/docs/RELEASE.md`), and
`mold-quote/` (단일 파일 금형·사출 가상 견적 — QDM/일반/정밀 금형비와 개당 사출비 어림).

## Scope of rules

The original rules below apply to the **LFA concept-evaluation core** (root
`main.py`, `agents/`, `data/`, `outputs/`). Self-contained apps in their own
top-level directory may use their own stack and document it in their local
README — they are not bound by the "plain Python / no frameworks" rule.

### LFA core rules
- Keep the code simple and beginner-friendly
- Prefer plain Python and JSON
- Avoid unnecessary abstractions
- Do not present heuristic scoring as physical proof
- Prioritize readability and local execution
- Do not add frameworks, databases, or web apps **to the LFA core**

