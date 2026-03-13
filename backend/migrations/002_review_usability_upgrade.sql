-- SQLite-friendly migration sketch for phase-2 usability upgrades.
-- In production, apply with Alembic per database engine.

ALTER TABLE workflow_runs ADD COLUMN current_stage VARCHAR(30) DEFAULT 'Draft';
ALTER TABLE workflow_runs ADD COLUMN current_version VARCHAR(20) DEFAULT 'v0.1';

ALTER TABLE document_versions ADD COLUMN stage_label VARCHAR(40) DEFAULT 'Draft';

ALTER TABLE section_outputs ADD COLUMN locked_by_human BOOLEAN DEFAULT 0;
ALTER TABLE section_outputs ADD COLUMN missing_evidence_flag BOOLEAN DEFAULT 0;

ALTER TABLE review_findings ADD COLUMN issue_summary VARCHAR(255) DEFAULT '';
ALTER TABLE review_findings ADD COLUMN reviewer_decision VARCHAR(40) DEFAULT 'Pending';
ALTER TABLE review_findings ADD COLUMN resolution_note TEXT DEFAULT '';
ALTER TABLE review_findings ADD COLUMN escalated_to_manager BOOLEAN DEFAULT 0;

ALTER TABLE revision_changes ADD COLUMN findings_addressed JSON;
ALTER TABLE revision_changes ADD COLUMN evidence_status VARCHAR(40) DEFAULT 'unchanged';

CREATE TABLE IF NOT EXISTS revision_summaries (
  id INTEGER PRIMARY KEY,
  workflow_run_id INTEGER NOT NULL,
  cycle_label VARCHAR(40) NOT NULL,
  what_changed JSON,
  why_changed JSON,
  findings_addressed JSON,
  findings_remaining JSON,
  evidence_outcome VARCHAR(40) DEFAULT 'still_insufficient',
  created_at TIMESTAMP,
  FOREIGN KEY(workflow_run_id) REFERENCES workflow_runs(id)
);
