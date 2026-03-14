export type Project = {
  id: number;
  name: string;
  description: string;
  drive_mapping: Record<string, any>;
  created_at: string;
};

export type WorkflowRun = {
  id: number;
  project_id: number;
  document_type: string;
  template_name: string;
  output_path: string;
  state: string;
  current_stage: string;
  current_version: string;
  created_at: string;
  updated_at: string;
};

export type Finding = {
  id: number;
  severity: string;
  category: string;
  affected_sections: string[];
  issue_summary: string;
  rationale: string;
  suggested_fix: string;
  linked_evidence: string[];
  status: string;
  reviewer_decision: string;
  resolution_note: string;
};

export type Section = {
  id: number;
  section_title: string;
  generated_text: string;
  evidence_refs: string[];
  evidence_metadata?: { file_id: string; score?: number; section?: string }[];
  rationale: string;
  locked_by_human: boolean;
  accepted_by_human: boolean;
  missing_evidence_flag: boolean;
};

export type DocCommentThread = {
  id: number;
  workflow_run_id: number;
  doc_file_id: string;
  doc_comment_id: string;
  section_title: string;
  finding_id: number | null;
  author: string;
  body: string;
  quoted_text: string;
  evidence_refs: string[];
  status: string;
  request_revision: boolean;
  section_approved: boolean;
};
