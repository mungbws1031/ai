# IVDR Document Automation & RA Workflow Orchestration (MVP)

Internal collaboration tool for IVDR document drafting, review, revision, traceability, and human approval gating.

## What this MVP includes
- FastAPI backend with modular services and workflow orchestration.
- Next.js frontend with internal workflow screens and API actions.
- SQLAlchemy models for projects, workflow runs, section outputs, findings, comments, versions, revision changes/summaries, timeline steps, and audit events.
- Mock Google Drive sync abstraction with source file IDs preserved for traceability.
- `.docx` draft/review/revision generation with deterministic file naming and version tags.
- Structured-output-oriented AI service interface with explicit DRAFT marking and insufficient-evidence handling.

## Guardrails
- All generated content stays **DRAFT** until a human approves.
- The system does **not** auto-claim compliance or submission readiness.
- Regulatory text generation is conservative, non-promotional, evidence-linked, and explicitly states uncertainty when evidence is missing.
- Evidence links, confidence, rationale, and unresolved gaps are stored per section.
- Human decision endpoints (approve/request_changes/archive) are explicit and auditable.
- Revision step preserves locked/accepted sections by default, minimizes rewrites, and logs rationale + change classification.
- Locked or human-approved sections are never modified by AI reruns/revisions unless explicitly unlocked by a reviewer.
- Every substantial claim includes a source line; when support is weak or absent, the text explicitly states `insufficient evidence`.

## Phase-2 improvements included in this build
- Deterministic output naming: `{docType}_{stage}_{version}.docx` (for example: `Performance_Evaluation_Plan_Draft_v0.1.docx`).
- Review findings now include issue summary, reviewer decision, resolution notes, and escalation flag.
- Selective rerun controls (full, drafting, review, revision, evidence refresh) with options.
- Section controls: approve, lock/unlock, missing evidence flag.
- Findings controls: accept/reject decision and escalation to RA manager.
- Traceability payload with section→evidence, finding→revision, version lineage, claim→source, source→Drive reference.
- Structured revision summaries per cycle.
- Expanded audit events for state transitions, reruns, version creation, lock/unlock, and finding actions.

## Local setup
### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/seed.py
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker compose up --build
```

## Example API flow
1. `POST /api/projects`
2. `POST /api/workflow-runs`
3. `POST /api/workflow-runs/{id}/rerun`
4. `POST /api/workflow-runs/{id}/sections/{section_id}/lock`
5. `POST /api/workflow-runs/{id}/findings/{finding_id}/decision`
6. `POST /api/workflow-runs/{id}/revise`
7. `GET /api/workflow-runs/{id}/revision-summaries`
8. `GET /api/workflow-runs/{id}/traceability`
9. `POST /api/workflow-runs/{id}/decision`

## Current limitations
- Template insertion is safer but still section-based; full OpenXML bookmarks/track-changes is future work.
- Google Drive and Google Docs integrations are mock-first in local mode.
- Celery/queue execution remains a boundary for future asynchronous scaling.
