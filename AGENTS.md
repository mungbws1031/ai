# AGENTS.md

This repository began as an early-stage concept evaluation tool for LFA urine
stick ideas, but has since grown into a multi-project workspace. It now also
hosts standalone apps such as `frontend/` (Next.js IVDR workflow UI),
`backend/` (Python), `ticketing/`, `site/`, `eddie/` (Next.js ADHD routine
companion app), `scent-mixer/` (single-file PWA), `tina/` (정리 임팩트
최적화 PWA — 사진 기반 티 점수 분석), and `miri/` (Vite + React PWA — ADHD
워킹맘용 선제적 리마인더 & 역산 스케줄러, PRD-MIRI-MVP-v0.1).

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

