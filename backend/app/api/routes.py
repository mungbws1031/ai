from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.entities import (
    Project,
    WorkflowRun,
    SectionOutput,
    ReviewFinding,
    AuditEvent,
    Comment,
    WorkflowStepExecution,
    DocumentVersion,
    RevisionChange,
    RevisionSummary,
)
from app.schemas.workflow import (
    ProjectCreate,
    ProjectRead,
    WorkflowRunCreate,
    WorkflowRunRead,
    RerunRequest,
    HumanDecisionRequest,
    CommentCreate,
    RevisionRequest,
    SectionAcceptanceRequest,
    SectionLockRequest,
    SectionEvidenceFlagRequest,
    FindingDecisionRequest,
)
from app.orchestration.workflow_engine import WorkflowEngine

router = APIRouter()
engine = WorkflowEngine()


@router.post('/projects', response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get('/projects', response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)):
    return db.query(Project).all()


@router.get('/projects/{project_id}/workflow-runs')
def list_project_runs(project_id: int, db: Session = Depends(get_db)):
    return db.query(WorkflowRun).filter(WorkflowRun.project_id == project_id).order_by(WorkflowRun.created_at.desc()).all()


@router.post('/workflow-runs', response_model=WorkflowRunRead)
def start_workflow(payload: WorkflowRunCreate, db: Session = Depends(get_db)):
    project = db.get(Project, payload.project_id)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    run = WorkflowRun(
        project_id=payload.project_id,
        document_type=payload.document_type,
        template_name=payload.template_name,
        output_path=payload.output_path,
        source_folders=payload.source_folders,
        custom_instructions=payload.custom_instructions,
        parent_version_id=payload.parent_version_id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return engine.run_full_workflow(db, run)


@router.get('/workflow-runs/{run_id}', response_model=WorkflowRunRead)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return run


@router.post('/workflow-runs/{run_id}/rerun', response_model=WorkflowRunRead)
def rerun(run_id: int, payload: RerunRequest, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    try:
        return engine.rerun_step(db, run, payload.model_dump())
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post('/workflow-runs/{run_id}/revise', response_model=WorkflowRunRead)
def revise(run_id: int, payload: RevisionRequest, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return engine.revise_document(db, run, payload.finding_ids)


@router.post('/workflow-runs/{run_id}/decision', response_model=WorkflowRunRead)
def decision(run_id: int, payload: HumanDecisionRequest, db: Session = Depends(get_db), x_actor: str = Header(default='reviewer')):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    try:
        return engine.apply_human_decision(db, run, payload.decision, x_actor, payload.reason)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.get('/workflow-runs/{run_id}/sections')
def list_sections(run_id: int, db: Session = Depends(get_db)):
    return db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id).all()


@router.post('/workflow-runs/{run_id}/sections/{section_id}/acceptance')
def set_section_acceptance(run_id: int, section_id: int, payload: SectionAcceptanceRequest, db: Session = Depends(get_db)):
    try:
        return engine.mark_section_acceptance(db, run_id, section_id, payload.accepted)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post('/workflow-runs/{run_id}/sections/{section_id}/lock')
def set_section_lock(run_id: int, section_id: int, payload: SectionLockRequest, db: Session = Depends(get_db)):
    try:
        return engine.lock_section(db, run_id, section_id, payload.locked)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post('/workflow-runs/{run_id}/sections/{section_id}/missing-evidence')
def set_missing_evidence(run_id: int, section_id: int, payload: SectionEvidenceFlagRequest, db: Session = Depends(get_db)):
    try:
        return engine.mark_missing_evidence(db, run_id, section_id, payload.missing_evidence)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get('/workflow-runs/{run_id}/findings')
def list_findings(run_id: int, db: Session = Depends(get_db)):
    return db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id).all()


@router.post('/workflow-runs/{run_id}/findings/{finding_id}/decision')
def finding_decision(run_id: int, finding_id: int, payload: FindingDecisionRequest, db: Session = Depends(get_db)):
    finding = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id, ReviewFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail='Finding not found')
    return engine.update_finding_decision(db, finding, payload.reviewer_decision, payload.resolution_note)


@router.post('/workflow-runs/{run_id}/findings/{finding_id}/escalate')
def escalate_finding(run_id: int, finding_id: int, db: Session = Depends(get_db)):
    finding = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id, ReviewFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail='Finding not found')
    return engine.escalate_finding(db, finding)


@router.get('/workflow-runs/{run_id}/revision-changes')
def list_revision_changes(run_id: int, db: Session = Depends(get_db)):
    return db.query(RevisionChange).filter(RevisionChange.workflow_run_id == run_id).order_by(RevisionChange.created_at.desc()).all()


@router.get('/workflow-runs/{run_id}/revision-summaries')
def list_revision_summaries(run_id: int, db: Session = Depends(get_db)):
    return db.query(RevisionSummary).filter(RevisionSummary.workflow_run_id == run_id).order_by(RevisionSummary.created_at.desc()).all()


@router.post('/workflow-runs/{run_id}/comments')
def add_comment(run_id: int, payload: CommentCreate, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    comment = Comment(workflow_run_id=run_id, **payload.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get('/workflow-runs/{run_id}/comments')
def list_comments(run_id: int, db: Session = Depends(get_db)):
    return db.query(Comment).filter(Comment.workflow_run_id == run_id).order_by(Comment.created_at.desc()).all()


@router.get('/workflow-runs/{run_id}/traceability')
def traceability(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return engine.build_traceability(db, run_id)


@router.get('/workflow-runs/{run_id}/timeline')
def timeline(run_id: int, db: Session = Depends(get_db)):
    return db.query(WorkflowStepExecution).filter(WorkflowStepExecution.workflow_run_id == run_id).order_by(WorkflowStepExecution.created_at.asc()).all()


@router.get('/workflow-runs/{run_id}/versions')
def versions(run_id: int, db: Session = Depends(get_db)):
    return db.query(DocumentVersion).filter(DocumentVersion.workflow_run_id == run_id).order_by(DocumentVersion.created_at.asc()).all()


@router.get('/audit-events')
def list_audit(db: Session = Depends(get_db)):
    return db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).all()
