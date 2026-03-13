from datetime import datetime
from pydantic import BaseModel, Field


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


class HumanDecisionRequest(BaseModel):
    decision: str
    reason: str = ""


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


class CommentCreate(BaseModel):
    section_title: str = ""
    author: str
    body: str


class SectionDraft(BaseModel):
    section_title: str
    generated_text: str
    evidence_refs: list[str]
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
