# AGENTS.md

This repository began as an early-stage concept evaluation tool for LFA urine
stick ideas, but has since grown into a multi-project workspace. It now also
hosts standalone apps such as `frontend/` (Next.js IVDR workflow UI),
`backend/` (Python), `ticketing/`, `site/`, and `eddie/` (Next.js ADHD routine
companion app).

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

