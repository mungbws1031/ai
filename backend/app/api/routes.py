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
    DocCommentThread,
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
    DriveConnectRequest,
    DriveConnectResponse,
    DriveTemplateRead,
    DocCommentCreate,
    DocCommentResolveRequest,
    DocCommentThreadRead,
)
from app.orchestration.workflow_engine import WorkflowEngine
from app.services.drive_service import DriveService
from app.services.google_docs_service import GoogleDocsService

router = APIRouter()
engine = WorkflowEngine()
drive = DriveService()
docs = GoogleDocsService()


def _latest_drive_output_file_id(db: Session, run_id: int) -> str:
    event = (
        db.query(AuditEvent)
        .filter(AuditEvent.entity_type == "workflow_run", AuditEvent.entity_id == str(run_id), AuditEvent.action == "document_output_synced")
        .order_by(AuditEvent.created_at.desc())
        .first()
    )
    if not event:
        return ""
    details = event.details or {}
    return details.get("file_id", "")



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


@router.post('/projects/{project_id}/drive/connect', response_model=DriveConnectResponse)
def connect_drive_folder(project_id: int, payload: DriveConnectRequest, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    try:
        mapping = drive.connect_project_folder(payload.folder_id)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    project.drive_mapping = mapping
    db.commit()
    return {'mapping': mapping}


@router.get('/projects/{project_id}/drive/index')
def drive_index(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    try:
        return drive.index_project_files(project.drive_mapping or {})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


@router.get('/projects/{project_id}/drive/templates', response_model=list[DriveTemplateRead])
def drive_templates(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail='Project not found')
    try:
        templates = drive.list_templates(project.drive_mapping or {})
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    return [{'id': item['id'], 'name': item['name'], 'folder': item.get('folder', 'templates')} for item in templates]


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
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id).all()


@router.post('/workflow-runs/{run_id}/sections/{section_id}/acceptance')
def set_section_acceptance(run_id: int, section_id: int, payload: SectionAcceptanceRequest, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    try:
        return engine.mark_section_acceptance(db, run_id, section_id, payload.accepted)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post('/workflow-runs/{run_id}/sections/{section_id}/lock')
def set_section_lock(run_id: int, section_id: int, payload: SectionLockRequest, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    try:
        return engine.lock_section(db, run_id, section_id, payload.locked)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.post('/workflow-runs/{run_id}/sections/{section_id}/missing-evidence')
def set_missing_evidence(run_id: int, section_id: int, payload: SectionEvidenceFlagRequest, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    try:
        return engine.mark_missing_evidence(db, run_id, section_id, payload.missing_evidence)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@router.get('/workflow-runs/{run_id}/findings')
def list_findings(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
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
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return db.query(RevisionChange).filter(RevisionChange.workflow_run_id == run_id).order_by(RevisionChange.created_at.desc()).all()


@router.get('/workflow-runs/{run_id}/revision-summaries')
def list_revision_summaries(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
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
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return db.query(Comment).filter(Comment.workflow_run_id == run_id).order_by(Comment.created_at.desc()).all()


@router.post('/workflow-runs/{run_id}/doc-comments', response_model=DocCommentThreadRead)
def add_doc_comment(run_id: int, payload: DocCommentCreate, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')

    doc_file_id = payload.doc_file_id or _latest_drive_output_file_id(db, run_id)
    if not doc_file_id:
        doc_file_id = f"local-run-{run_id}"

    try:
        synced = docs.create_comment(doc_file_id, payload.body, payload.quoted_text, payload.evidence_refs, payload.author)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    finding = None
    if payload.finding_id is not None:
        finding = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id, ReviewFinding.id == payload.finding_id).first()
        if not finding:
            raise HTTPException(status_code=404, detail='Finding not found')

    thread = DocCommentThread(
        workflow_run_id=run_id,
        doc_file_id=doc_file_id,
        doc_comment_id=synced.get('id', ''),
        section_title=payload.section_title,
        finding_id=payload.finding_id,
        author=payload.author,
        body=payload.body,
        quoted_text=payload.quoted_text,
        evidence_refs=payload.evidence_refs,
        status='open',
        request_revision=payload.request_revision,
        section_approved=payload.section_approved,
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)

    if finding and payload.request_revision:
        finding.status = 'Open'
        finding.reviewer_decision = 'Pending'
        finding.resolution_note = f"Revision requested in document comment thread {thread.id}"
        db.commit()

    if payload.section_approved and payload.section_title:
        section = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id, SectionOutput.section_title == payload.section_title).first()
        if section:
            section.accepted_by_human = True
            section.locked_by_human = True
            db.commit()

    return thread


@router.get('/workflow-runs/{run_id}/doc-comments', response_model=list[DocCommentThreadRead])
def list_doc_comments(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return db.query(DocCommentThread).filter(DocCommentThread.workflow_run_id == run_id).order_by(DocCommentThread.created_at.desc()).all()


@router.post('/workflow-runs/{run_id}/doc-comments/sync', response_model=list[DocCommentThreadRead])
def sync_doc_comments(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')

    doc_file_id = _latest_drive_output_file_id(db, run_id) or f"local-run-{run_id}"
    try:
        remote_comments = docs.list_comments(doc_file_id)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    existing = {
        item.doc_comment_id: item
        for item in db.query(DocCommentThread).filter(DocCommentThread.workflow_run_id == run_id, DocCommentThread.doc_file_id == doc_file_id).all()
    }

    for remote in remote_comments:
        row = existing.get(remote['id'])
        if row:
            row.body = remote.get('body', row.body)
            row.status = remote.get('status', row.status)
            row.author = remote.get('author', row.author)
            row.updated_at = row.updated_at
            continue
        db.add(DocCommentThread(
            workflow_run_id=run_id,
            doc_file_id=doc_file_id,
            doc_comment_id=remote.get('id', ''),
            author=remote.get('author', 'reviewer'),
            body=remote.get('body', ''),
            quoted_text=remote.get('quoted_text', ''),
            evidence_refs=remote.get('evidence_refs', []),
            status=remote.get('status', 'open'),
            request_revision=True,
            section_approved=False,
        ))

    db.commit()
    return db.query(DocCommentThread).filter(DocCommentThread.workflow_run_id == run_id).order_by(DocCommentThread.created_at.desc()).all()


@router.post('/workflow-runs/{run_id}/doc-comments/{thread_id}/resolve', response_model=DocCommentThreadRead)
def resolve_doc_comment(run_id: int, thread_id: int, payload: DocCommentResolveRequest, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')

    thread = db.query(DocCommentThread).filter(DocCommentThread.workflow_run_id == run_id, DocCommentThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail='Comment thread not found')

    try:
        docs.resolve_comment(thread.doc_file_id, thread.doc_comment_id)
    except Exception:
        pass

    thread.status = 'resolved'
    thread.body = f"{thread.body}\nResolution: {payload.resolution_note}".strip()

    if thread.finding_id:
        finding = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id, ReviewFinding.id == thread.finding_id).first()
        if finding:
            finding.status = 'Resolved'
            finding.reviewer_decision = 'Resolved'
            finding.resolution_note = payload.resolution_note

    if thread.section_approved and thread.section_title:
        section = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id, SectionOutput.section_title == thread.section_title).first()
        if section:
            section.accepted_by_human = True
            section.locked_by_human = True

    db.commit()
    db.refresh(thread)
    return thread


@router.get('/workflow-runs/{run_id}/traceability')
def traceability(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return engine.build_traceability(db, run_id)


@router.get('/workflow-runs/{run_id}/timeline')
def timeline(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return db.query(WorkflowStepExecution).filter(WorkflowStepExecution.workflow_run_id == run_id).order_by(WorkflowStepExecution.created_at.asc()).all()


@router.get('/workflow-runs/{run_id}/versions')
def versions(run_id: int, db: Session = Depends(get_db)):
    run = db.get(WorkflowRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail='Run not found')
    return db.query(DocumentVersion).filter(DocumentVersion.workflow_run_id == run_id).order_by(DocumentVersion.created_at.asc()).all()


@router.get('/audit-events')
def list_audit(db: Session = Depends(get_db)):
    return db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).all()
