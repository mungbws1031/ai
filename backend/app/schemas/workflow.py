from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class ProjectCreate(BaseModel):
    name: str
    description: str = ""
    drive_mapping: dict = Field(default_factory=dict)


class ProjectRead(ProjectCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WorkflowRunCreate(BaseModel):
    project_id: int
    document_type: str
    template_name: str
    output_path: str = "backend/data/outputs"
    source_folders: list[str] = Field(default_factory=list)
    custom_instructions: str = ""
    parent_version_id: int | None = None


def _normalize_choice(value: str, allowed: set[str], field_name: str) -> str:
    cleaned = (value or "").strip().lower()
    if cleaned not in allowed:
        supported = ", ".join(sorted(allowed))
        raise ValueError(f"{field_name} must be one of: {supported}")
    return cleaned


class WorkflowRunRead(BaseModel):
    id: int
    project_id: int
    document_type: str
    template_name: str
    output_path: str
    state: str
    is_draft_only: bool
    current_stage: str
    current_version: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RerunRequest(BaseModel):
    step: str = "full"
    section: str | None = None
    preserve_accepted_text: bool = True
    preserve_approved_sections: bool = True
    reuse_previous_evidence_set: bool = True
    refresh_evidence_from_drive: bool = False
    selected_sections: list[str] = Field(default_factory=list)

    @field_validator("step")
    @classmethod
    def validate_step(cls, value: str) -> str:
        return _normalize_choice(value, {"full", "drafting", "review", "revision", "evidence"}, "step")


class HumanDecisionRequest(BaseModel):
    decision: str
    reason: str = ""

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, value: str) -> str:
        return _normalize_choice(value, {"approve", "request_changes", "archive"}, "decision")


class RevisionRequest(BaseModel):
    finding_ids: list[int] = Field(default_factory=list)


class SectionAcceptanceRequest(BaseModel):
    accepted: bool = True


class SectionLockRequest(BaseModel):
    locked: bool = True


class SectionEvidenceFlagRequest(BaseModel):
    missing_evidence: bool = True


class FindingDecisionRequest(BaseModel):
    reviewer_decision: str
    resolution_note: str = ""

    @field_validator("reviewer_decision")
    @classmethod
    def validate_reviewer_decision(cls, value: str) -> str:
        return _normalize_choice(value, {"accepted", "resolved", "rejected", "pending"}, "reviewer_decision")


class CommentCreate(BaseModel):
    section_title: str = ""
    author: str
    body: str


class SectionDraft(BaseModel):
    section_title: str
    generated_text: str
    evidence_refs: list[str]
    evidence_metadata: list[dict] = Field(default_factory=list)
    confidence: float
    rationale: str
    unresolved_gaps: list[str]
    agent_name: str


class ReviewFindingSchema(BaseModel):
    severity: str
    category: str
    affected_sections: list[str]
    issue_summary: str = ""
    rationale: str
    suggested_fix: str
    linked_evidence: list[str]
    status: str = "Open"
    reviewer_decision: str = "Pending"
    resolution_note: str = ""


class TraceabilityRecord(BaseModel):
    section_title: str
    evidence_refs: list[str]
    open_findings: int


class RevisionChangeRead(BaseModel):
    id: int
    section_title: str
    change_type: str
    rationale: str
    preserved_accepted_text: bool

    class Config:
        from_attributes = True


class DriveConnectRequest(BaseModel):
    folder_id: str


class DriveConnectResponse(BaseModel):
    mapping: dict


class DriveTemplateRead(BaseModel):
    id: str
    name: str
    folder: str = "templates"



class DocCommentCreate(BaseModel):
    body: str
    author: str = "reviewer"
    quoted_text: str = ""
    evidence_refs: list[str] = Field(default_factory=list)
    section_title: str = ""
    finding_id: int | None = None
    doc_file_id: str = ""
    request_revision: bool = True
    section_approved: bool = False


class DocCommentResolveRequest(BaseModel):
    resolution_note: str = "Resolved in document"


class DocCommentThreadRead(BaseModel):
    id: int
    workflow_run_id: int
    doc_file_id: str
    doc_comment_id: str
    section_title: str
    finding_id: int | None
    author: str
    body: str
    quoted_text: str
    evidence_refs: list[str]
    status: str
    request_revision: bool
    section_approved: bool

    class Config:
        from_attributes = True

