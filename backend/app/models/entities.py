from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, JSON, Enum, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.db.database import Base


class WorkflowState(str, enum.Enum):
    NEW = "New"
    SOURCE_SYNCING = "Source Syncing"
    TEMPLATE_PARSED = "Template Parsed"
    DRAFTING_IN_PROGRESS = "Drafting In Progress"
    DRAFT_GENERATED = "Draft Generated"
    REVIEW_IN_PROGRESS = "Review In Progress"
    REVIEW_COMPLETE = "Review Complete"
    REVISION_IN_PROGRESS = "Revision In Progress"
    REVISED_DRAFT_READY = "Revised Draft Ready"
    PENDING_HUMAN_REVIEW = "Pending Human Review"
    CHANGES_REQUESTED = "Changes Requested"
    APPROVED_INTERNALLY = "Approved Internally"
    ARCHIVED = "Archived"


class Role(str, enum.Enum):
    ADMIN = "Admin"
    RA_MANAGER = "RA Manager"
    AUTHOR = "Author"
    REVIEWER = "Reviewer"
    VIEWER = "Viewer"


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str] = mapped_column(Text, default="")
    drive_mapping: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    workflows = relationship("WorkflowRun", back_populates="project", cascade="all, delete-orphan")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    document_type: Mapped[str] = mapped_column(String(120))
    template_name: Mapped[str] = mapped_column(String(255))
    output_path: Mapped[str] = mapped_column(String(255), default="")
    state: Mapped[WorkflowState] = mapped_column(Enum(WorkflowState), default=WorkflowState.NEW)
    is_draft_only: Mapped[bool] = mapped_column(Boolean, default=True)
    custom_instructions: Mapped[str] = mapped_column(Text, default="")
    source_folders: Mapped[list] = mapped_column(JSON, default=list)
    current_stage: Mapped[str] = mapped_column(String(30), default="Draft")
    current_version: Mapped[str] = mapped_column(String(20), default="v0.1")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    parent_version_id: Mapped[int | None] = mapped_column(ForeignKey("workflow_runs.id"), nullable=True)

    project = relationship("Project", back_populates="workflows")


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    version_label: Mapped[str] = mapped_column(String(60))
    stage_label: Mapped[str] = mapped_column(String(40), default="Draft")
    output_path: Mapped[str] = mapped_column(String(255))
    parent_version_id: Mapped[int | None] = mapped_column(ForeignKey("document_versions.id"), nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WorkflowStepExecution(Base):
    __tablename__ = "workflow_step_executions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    step_name: Mapped[str] = mapped_column(String(120))
    agent_name: Mapped[str] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(30), default="Completed")
    output_summary: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SectionOutput(Base):
    __tablename__ = "section_outputs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    section_title: Mapped[str] = mapped_column(String(255))
    generated_text: Mapped[str] = mapped_column(Text)
    evidence_refs: Mapped[list] = mapped_column(JSON, default=list)
    confidence: Mapped[float] = mapped_column(Float)
    rationale: Mapped[str] = mapped_column(Text, default="")
    unresolved_gaps: Mapped[list] = mapped_column(JSON, default=list)
    agent_name: Mapped[str] = mapped_column(String(120))
    accepted_by_human: Mapped[bool] = mapped_column(Boolean, default=False)
    locked_by_human: Mapped[bool] = mapped_column(Boolean, default=False)
    missing_evidence_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReviewFinding(Base):
    __tablename__ = "review_findings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    severity: Mapped[str] = mapped_column(String(20))
    category: Mapped[str] = mapped_column(String(80))
    affected_sections: Mapped[list] = mapped_column(JSON, default=list)
    issue_summary: Mapped[str] = mapped_column(String(255), default="")
    rationale: Mapped[str] = mapped_column(Text)
    suggested_fix: Mapped[str] = mapped_column(Text)
    linked_evidence: Mapped[list] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(20), default="Open")
    reviewer_decision: Mapped[str] = mapped_column(String(40), default="Pending")
    resolution_note: Mapped[str] = mapped_column(Text, default="")
    escalated_to_manager: Mapped[bool] = mapped_column(Boolean, default=False)


class RevisionChange(Base):
    __tablename__ = "revision_changes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    section_title: Mapped[str] = mapped_column(String(255))
    change_type: Mapped[str] = mapped_column(String(40))
    original_text: Mapped[str] = mapped_column(Text)
    revised_text: Mapped[str] = mapped_column(Text)
    rationale: Mapped[str] = mapped_column(Text)
    findings_addressed: Mapped[list] = mapped_column(JSON, default=list)
    preserved_accepted_text: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_status: Mapped[str] = mapped_column(String(40), default="unchanged")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Comment(Base):
    __tablename__ = "comments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    section_title: Mapped[str] = mapped_column(String(255), default="")
    author: Mapped[str] = mapped_column(String(120))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RevisionSummary(Base):
    __tablename__ = "revision_summaries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"))
    cycle_label: Mapped[str] = mapped_column(String(40))
    what_changed: Mapped[list] = mapped_column(JSON, default=list)
    why_changed: Mapped[list] = mapped_column(JSON, default=list)
    findings_addressed: Mapped[list] = mapped_column(JSON, default=list)
    findings_remaining: Mapped[list] = mapped_column(JSON, default=list)
    evidence_outcome: Mapped[str] = mapped_column(String(40), default="still_insufficient")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor: Mapped[str] = mapped_column(String(120))
    action: Mapped[str] = mapped_column(String(120))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[str] = mapped_column(String(80))
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
