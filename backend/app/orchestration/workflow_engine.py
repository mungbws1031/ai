from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from app.models.entities import (
    WorkflowRun,
    WorkflowState,
    SectionOutput,
    ReviewFinding,
    AuditEvent,
    Project,
    WorkflowStepExecution,
    DocumentVersion,
    RevisionChange,
    RevisionSummary,
)
from app.schemas.workflow import TraceabilityRecord
from app.services.ai_service import AIService
from app.services.drive_service import DriveService
from app.services.template_service import TemplateService


class WorkflowEngine:
    def __init__(self):
        self.ai = AIService()
        self.drive = DriveService()
        self.template = TemplateService()

    def run_full_workflow(self, db: Session, run: WorkflowRun) -> WorkflowRun:
        project = db.get(Project, run.project_id)
        mapping = project.drive_mapping if project else {}
        template_override = self.drive.resolve_template_path(mapping, run.template_name)

        source_index = self._set_state_and_run_step(
            db,
            run,
            WorkflowState.SOURCE_SYNCING,
            "Source Sync",
            "Evidence Retrieval Agent",
            lambda: self.drive.sync_project(mapping, run.source_folders),
        )
        source_ids = [f["id"] for f in source_index.get("files", [])]

        self._set_state_and_run_step(
            db,
            run,
            WorkflowState.TEMPLATE_PARSED,
            "Template Parse",
            "Template Mapper Agent",
            lambda: self.template.parse_template(run.template_name),
        )

        drafted_sections = self._draft_sections(db, run, source_ids, selected_sections=[])
        self._review_sections(db, run, drafted_sections)
        self._create_output_version(db, run, stage="Draft", sections=drafted_sections, change_summary=self.ai.revision_summary(0), template_path_override=template_override)

        run.state = WorkflowState.PENDING_HUMAN_REVIEW
        run.updated_at = datetime.utcnow()
        db.commit()
        self._audit(db, "Human Review Coordinator Agent", "pending_human_review", "workflow_run", str(run.id), {"draft": run.output_path})
        db.refresh(run)
        return run

    def rerun_step(self, db: Session, run: WorkflowRun, options: dict) -> WorkflowRun:
        step = options.get("step", "full").lower()
        selected_sections = options.get("selected_sections") or ([options["section"]] if options.get("section") else [])

        if options.get("refresh_evidence_from_drive"):
            project = db.get(Project, run.project_id)
            self.drive.sync_project(project.drive_mapping if project else {}, run.source_folders)

        if step == "full":
            return self.run_full_workflow(db, run)

        if step == "drafting":
            source_ids = self._get_source_ids(db, run)
            sections = self._draft_sections(db, run, source_ids, selected_sections)
            self._create_output_version(db, run, stage="Draft", sections=sections, change_summary=["Drafting rerun completed."])
        elif step == "review":
            run.state = WorkflowState.REVIEW_IN_PROGRESS
            db.commit()
            sections = self._sections_to_dict(db, run.id, selected_sections)
            self._review_sections(db, run, sections)
        elif step == "revision":
            self.revise_document(db, run, [], options)
            return run
        elif step == "evidence":
            source_ids = self._get_source_ids(db, run)
            for section in self._load_sections(db, run.id, selected_sections):
                evidence = self.ai.retrieve_evidence(section.section_title, source_ids)
                if not options.get("reuse_previous_evidence_set", True):
                    section.evidence_refs = [item["file_id"] for item in evidence.get("ranked_sources", [])]
                    section.evidence_metadata = [
                        {"file_id": item.get("file_id"), "score": item.get("score", 0), "section": section.section_title}
                        for item in evidence.get("ranked_sources", [])
                    ]
            db.commit()
            self._record_step(db, run.id, "Evidence Refresh", "Evidence Retrieval Agent", {"selected_sections": selected_sections})
        else:
            raise ValueError("Unsupported rerun step")

        run.state = WorkflowState.PENDING_HUMAN_REVIEW
        run.updated_at = datetime.utcnow()
        db.commit()
        self._audit(db, "user", "rerun_requested", "workflow_run", str(run.id), options)
        db.refresh(run)
        return run

    def revise_document(self, db: Session, run: WorkflowRun, finding_ids: list[int] | None = None, options: dict | None = None) -> WorkflowRun:
        options = options or {}
        run.state = WorkflowState.REVISION_IN_PROGRESS
        db.commit()

        sections = self._load_sections(db, run.id, options.get("selected_sections", []))
        findings_query = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run.id, ReviewFinding.status == "Open")
        if finding_ids:
            findings_query = findings_query.filter(ReviewFinding.id.in_(finding_ids))
        findings = findings_query.all()

        finding_by_section: dict[str, list[ReviewFinding]] = {}
        for finding in findings:
            for section_name in finding.affected_sections:
                finding_by_section.setdefault(section_name, []).append(finding)

        change_count = 0
        summary_changes: list[str] = []
        summary_why: list[str] = []
        findings_addressed: list[int] = []

        for section in sections:
            if section.locked_by_human:
                continue

            related = finding_by_section.get(section.section_title, [])
            if not related:
                continue

            original_text = section.generated_text
            revised_text = original_text
            tags: set[str] = set()
            rationales: list[str] = []

            for finding in related:
                ctype = self._classify_change(finding.category)
                tags.add(ctype)
                rationales.append(f"{finding.category}: {finding.suggested_fix}")
                findings_addressed.append(finding.id)

                if "evidence" in finding.category.lower() or "insufficient evidence" in finding.rationale.lower():
                    if "Uncertainty remains" not in revised_text:
                        revised_text += " Uncertainty remains pending additional supporting evidence."
                else:
                    if "Updated after review" not in revised_text:
                        revised_text += " Updated after review to improve internal consistency."

                finding.status = "Resolved"
                finding.reviewer_decision = "Accepted"
                finding.resolution_note = "Addressed by revision cycle"

            if revised_text != original_text:
                section.generated_text = revised_text
                section.rationale = " | ".join(rationales)
                evidence_outcome = "still_insufficient" if section.missing_evidence_flag else "unchanged"
                db.add(
                    RevisionChange(
                        workflow_run_id=run.id,
                        section_title=section.section_title,
                        change_type=", ".join(sorted(tags)),
                        original_text=original_text,
                        revised_text=revised_text,
                        rationale=" | ".join(rationales),
                        findings_addressed=[f.id for f in related],
                        preserved_accepted_text=False,
                        evidence_status=evidence_outcome,
                    )
                )
                summary_changes.append(f"{section.section_title}: revised ({', '.join(sorted(tags))})")
                summary_why.extend(rationales)
                change_count += 1

        remaining = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run.id, ReviewFinding.status == "Open").all()
        db.add(
            RevisionSummary(
                workflow_run_id=run.id,
                cycle_label=f"cycle-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                what_changed=summary_changes,
                why_changed=summary_why,
                findings_addressed=findings_addressed,
                findings_remaining=[f.id for f in remaining],
                evidence_outcome="improved" if change_count and not remaining else "still_insufficient" if remaining else "unchanged",
            )
        )

        sections_dict = self._sections_to_dict(db, run.id, [])
        self._create_output_version(db, run, stage="Revised", sections=sections_dict, change_summary=self.ai.revision_summary(change_count))

        run.state = WorkflowState.PENDING_HUMAN_REVIEW
        run.updated_at = datetime.utcnow()
        db.commit()

        self._record_step(db, run.id, "Revision Re-run", "Revision Agent", {"substantive_changes": change_count})
        self._audit(db, "Revision Agent", "revision_completed", "workflow_run", str(run.id), {"substantive_changes": change_count})
        db.refresh(run)
        return run

    def mark_section_acceptance(self, db: Session, run_id: int, section_id: int, accepted: bool) -> SectionOutput:
        section = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id, SectionOutput.id == section_id).first()
        if not section:
            raise ValueError("Section not found")
        section.accepted_by_human = accepted
        if accepted:
            section.locked_by_human = True
        db.commit()
        self._audit(db, "reviewer", "section_acceptance_updated", "section_output", str(section_id), {"accepted": accepted})
        db.refresh(section)
        return section

    def lock_section(self, db: Session, run_id: int, section_id: int, locked: bool) -> SectionOutput:
        section = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id, SectionOutput.id == section_id).first()
        if not section:
            raise ValueError("Section not found")
        section.locked_by_human = locked
        db.commit()
        self._audit(db, "reviewer", "section_lock_updated", "section_output", str(section_id), {"locked": locked})
        db.refresh(section)
        return section

    def mark_missing_evidence(self, db: Session, run_id: int, section_id: int, missing: bool) -> SectionOutput:
        section = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id, SectionOutput.id == section_id).first()
        if not section:
            raise ValueError("Section not found")
        section.missing_evidence_flag = missing
        db.commit()
        self._audit(db, "reviewer", "section_missing_evidence_updated", "section_output", str(section_id), {"missing_evidence": missing})
        db.refresh(section)
        return section

    def update_finding_decision(self, db: Session, finding: ReviewFinding, reviewer_decision: str, resolution_note: str) -> ReviewFinding:
        finding.reviewer_decision = reviewer_decision
        finding.resolution_note = resolution_note
        if reviewer_decision.lower() in {"accepted", "resolved"}:
            finding.status = "Resolved"
        elif reviewer_decision.lower() == "rejected":
            finding.status = "Dismissed"
        db.commit()
        self._audit(db, "reviewer", "finding_decision", "review_finding", str(finding.id), {"decision": reviewer_decision})
        db.refresh(finding)
        return finding

    def escalate_finding(self, db: Session, finding: ReviewFinding) -> ReviewFinding:
        finding.escalated_to_manager = True
        db.commit()
        self._audit(db, "reviewer", "finding_escalated", "review_finding", str(finding.id), {})
        db.refresh(finding)
        return finding

    def apply_human_decision(self, db: Session, run: WorkflowRun, decision: str, actor: str, reason: str) -> WorkflowRun:
        decision_value = decision.lower().strip()
        if decision_value == "approve":
            run.state = WorkflowState.APPROVED_INTERNALLY
            run.is_draft_only = False
            run.current_stage = "Reviewed"
            self._create_output_version(db, run, stage="Reviewed", sections=self._sections_to_dict(db, run.id, []), change_summary=["Human approval applied."])
        elif decision_value == "request_changes":
            run.state = WorkflowState.CHANGES_REQUESTED
        elif decision_value == "archive":
            run.state = WorkflowState.ARCHIVED
        else:
            raise ValueError("Unsupported decision")

        run.updated_at = datetime.utcnow()
        db.commit()
        self._audit(db, actor, "human_decision", "workflow_run", str(run.id), {"decision": decision, "reason": reason})
        db.refresh(run)
        return run

    def build_traceability(self, db: Session, run_id: int) -> dict:
        outputs = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id).all()
        findings = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id).all()
        revisions = db.query(RevisionChange).filter(RevisionChange.workflow_run_id == run_id).all()
        versions = db.query(DocumentVersion).filter(DocumentVersion.workflow_run_id == run_id).order_by(DocumentVersion.created_at.asc()).all()

        section_map = []
        claim_map = []
        for section in outputs:
            open_count = len([f for f in findings if section.section_title in f.affected_sections and f.status == "Open"])
            section_map.append({"section_title": section.section_title, "evidence_refs": section.evidence_refs, "evidence_metadata": section.evidence_metadata, "open_findings": open_count})
            claim_map.append({"claim": section.generated_text[:100], "source_document_ids": section.evidence_refs})

        finding_to_revision = []
        for finding in findings:
            affected = [r.id for r in revisions if finding.id in r.findings_addressed]
            finding_to_revision.append({"finding_id": finding.id, "status": finding.status, "revision_change_ids": affected})

        lineage = [
            {
                "version_label": item.version_label,
                "stage_label": item.stage_label,
                "output_path": item.output_path,
                "parent_version_id": item.parent_version_id,
            }
            for item in versions
        ]

        return {
            "section_to_evidence": section_map,
            "finding_to_revision": finding_to_revision,
            "version_lineage": lineage,
            "claim_to_source": claim_map,
            "source_to_drive_ref": [
                {"drive_file_id": ref, "origin": "mock_drive", "section_title": item.section_title}
                for item in outputs
                for ref in item.evidence_refs
            ],
        }

    def _draft_sections(self, db: Session, run: WorkflowRun, source_ids: list[str], selected_sections: list[str]) -> list[dict]:
        run.state = WorkflowState.DRAFTING_IN_PROGRESS
        db.commit()

        plan = self.ai.section_plan(run.document_type)
        self._record_step(db, run.id, "Section Plan", "Regulatory Strategist Agent", {"sections": plan})

        drafted = []
        for item in plan:
            section = item["section_title"]
            if selected_sections and section not in selected_sections:
                continue
            evidence = self.ai.retrieve_evidence(section, source_ids)
            section_draft = self.ai.draft_section(section, evidence)
            drafted.append(section_draft.model_dump())

            existing = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run.id, SectionOutput.section_title == section).first()
            if existing:
                if existing.locked_by_human:
                    continue
                existing.generated_text = section_draft.generated_text
                existing.evidence_refs = section_draft.evidence_refs
                existing.evidence_metadata = section_draft.evidence_metadata
                existing.confidence = section_draft.confidence
                existing.rationale = section_draft.rationale
                existing.unresolved_gaps = section_draft.unresolved_gaps
                existing.agent_name = section_draft.agent_name
            else:
                db.add(SectionOutput(workflow_run_id=run.id, **section_draft.model_dump()))

        run.state = WorkflowState.DRAFT_GENERATED
        db.commit()
        return drafted or self._sections_to_dict(db, run.id, selected_sections)

    def _review_sections(self, db: Session, run: WorkflowRun, sections: list[dict]) -> None:
        run.state = WorkflowState.REVIEW_IN_PROGRESS
        db.commit()
        count = 0
        for item in sections:
            section_obj = type("SectionObj", (), item)()
            findings = self.ai.qa_review(section_obj) + self.ai.ivdr_review(section_obj)
            for finding in findings:
                if not finding.issue_summary:
                    finding.issue_summary = f"{finding.category} in {item['section_title']}"
                db.add(ReviewFinding(workflow_run_id=run.id, **finding.model_dump()))
                count += 1
        run.state = WorkflowState.REVIEW_COMPLETE
        db.commit()
        self._record_step(db, run.id, "Review", "IVDR Review Agent", {"total_findings": count})

    def _create_output_version(self, db: Session, run: WorkflowRun, stage: str, sections: list[dict], change_summary: list[str], template_path_override: str | None = None):
        requested_output = Path(run.output_path or "backend/data/outputs")
        output_root = requested_output.parent if requested_output.suffix.lower() == ".docx" else requested_output
        if output_root.is_absolute() or ".." in output_root.parts:
            output_root = Path("backend/data/outputs")

        placeholders = {"{{PROJECT_NAME}}": f"Project_{run.project_id}"}
        revision_context = self._build_revision_context(db, run.id)
        output_path, version = self.template.generate_docx(
            run.template_name,
            str(output_root),
            run.document_type,
            stage,
            sections,
            placeholders,
            change_summary,
            revision_context=revision_context,
            template_path_override=template_path_override,
        )
        run.output_path = output_path
        run.current_stage = stage
        run.current_version = version
        db.add(DocumentVersion(workflow_run_id=run.id, version_label=version, stage_label=stage, output_path=output_path, created_by="system"))
        db.commit()
        self._audit(db, "system", "document_version_created", "workflow_run", str(run.id), {"version": version, "stage": stage, "output": output_path})

        project = db.get(Project, run.project_id)
        mapping = project.drive_mapping if project else {}
        try:
            upload_result = self.drive.upload_output(mapping, output_path)
        except Exception as exc:
            upload_result = {"uploaded": False, "error": str(exc)}
        self._audit(db, "system", "document_output_synced", "workflow_run", str(run.id), upload_result)


    def _build_revision_context(self, db: Session, run_id: int) -> dict:
        findings = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id).all()
        latest_summary = db.query(RevisionSummary).filter(RevisionSummary.workflow_run_id == run_id).order_by(RevisionSummary.created_at.desc()).first()

        addressed_ids = latest_summary.findings_addressed if latest_summary else []
        addressed = [
            {"id": f.id, "category": f.category, "issue_summary": f.issue_summary}
            for f in findings
            if f.id in addressed_ids
        ]
        remaining = [
            {"id": f.id, "category": f.category, "issue_summary": f.issue_summary}
            for f in findings
            if f.status == "Open"
        ]
        rationale = latest_summary.why_changed if latest_summary else []
        return {
            "addressed_findings": addressed,
            "remaining_findings": remaining,
            "change_rationale": rationale,
        }

    def _load_sections(self, db: Session, run_id: int, selected_sections: list[str]) -> list[SectionOutput]:
        query = db.query(SectionOutput).filter(SectionOutput.workflow_run_id == run_id)
        if selected_sections:
            query = query.filter(SectionOutput.section_title.in_(selected_sections))
        return query.all()

    def _sections_to_dict(self, db: Session, run_id: int, selected_sections: list[str]) -> list[dict]:
        return [
            {
                "section_title": s.section_title,
                "generated_text": s.generated_text,
                "evidence_refs": s.evidence_refs,
                "evidence_metadata": s.evidence_metadata,
                "confidence": s.confidence,
                "unresolved_gaps": s.unresolved_gaps,
            }
            for s in self._load_sections(db, run_id, selected_sections)
        ]

    def _get_source_ids(self, db: Session, run: WorkflowRun) -> list[str]:
        project = db.get(Project, run.project_id)
        mapping = project.drive_mapping if project else {}
        project_index = self.drive.sync_project(mapping, run.source_folders)
        return [f["id"] for f in project_index.get("files", [])]

    def _classify_change(self, category: str) -> str:
        value = category.lower()
        if "consisten" in value:
            return "consistency"
        if "evidence" in value:
            return "evidence"
        if "compliance" in value or "risk" in value:
            return "compliance-risk"
        if "missing" in value or "complete" in value:
            return "completeness"
        return "wording"

    def _set_state_and_run_step(self, db: Session, run: WorkflowRun, state: WorkflowState, step_name: str, agent_name: str, callback):
        run.state = state
        run.updated_at = datetime.utcnow()
        db.commit()
        payload = callback()
        self._record_step(db, run.id, step_name, agent_name, payload)
        self._audit(db, agent_name, "state_transition", "workflow_run", str(run.id), {"state": state.value, "step": step_name})
        return payload

    def _record_step(self, db: Session, run_id: int, step_name: str, agent_name: str, output_summary: dict):
        db.add(WorkflowStepExecution(workflow_run_id=run_id, step_name=step_name, agent_name=agent_name, output_summary=output_summary))
        db.commit()

    def _audit(self, db: Session, actor: str, action: str, entity_type: str, entity_id: str, details: dict):
        db.add(AuditEvent(actor=actor, action=action, entity_type=entity_type, entity_id=entity_id, details=details))
        db.commit()
