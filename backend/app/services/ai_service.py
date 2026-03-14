from app.schemas.workflow import SectionDraft, ReviewFindingSchema


class AIService:
    """Mock AI service with conservative regulatory-writing guardrails."""

    _PROMOTIONAL_TERMS = [
        "best-in-class",
        "groundbreaking",
        "revolutionary",
        "guaranteed",
        "proven compliant",
        "submission-ready",
    ]

    def section_plan(self, document_type: str) -> list[dict]:
        sections = {
            "Performance Evaluation Plan": [
                "Purpose",
                "Intended Use",
                "Performance Evaluation",
                "Statistical Plan",
                "Acceptance Criteria",
            ],
            "IFU draft": ["Intended Use", "Warnings", "Precautions", "Procedure", "Performance Characteristics"],
            "Risk Summary": ["Hazard Overview", "Risk Controls", "Residual Risks", "Benefit-Risk Summary"],
        }
        selected = sections.get(document_type, ["Purpose", "Intended Use", "Evidence Summary"])
        return [{"section_title": title, "required_evidence": "primary"} for title in selected]

    def retrieve_evidence(self, section: str, source_ids: list[str]) -> dict:
        ranked = [{"file_id": sid, "score": round(0.9 - i * 0.1, 2)} for i, sid in enumerate(source_ids[:4])]
        gaps = ["insufficient evidence"] if not ranked else []
        return {
            "task": "evidence_retrieval",
            "section": section,
            "ranked_sources": ranked,
            "gaps": gaps,
            "confidence": 0.35 if gaps else 0.75,
        }

    def draft_section(self, section: str, evidence: dict) -> SectionDraft:
        gaps = evidence.get("gaps", [])
        ranked_sources = evidence.get("ranked_sources", [])
        refs = [item["file_id"] for item in ranked_sources]
        metadata = [
            {"file_id": item["file_id"], "score": item.get("score", 0), "section": section}
            for item in ranked_sources
        ]

        if refs:
            source_line = f"Substantial claim source(s): {', '.join(refs)}."
            evidence_statement = "Claims are limited to these linked sources."
        else:
            source_line = "Substantial claim source(s): insufficient evidence."
            evidence_statement = "insufficient evidence"

        text = (
            f"DRAFT: {section}. {source_line} {evidence_statement} "
            "This text is for internal regulatory review only and does not assert automatic compliance or submission readiness."
        )
        if gaps:
            text += " Uncertainty remains due to insufficient evidence, and additional source support is required."

        return SectionDraft(
            section_title=section,
            generated_text=text,
            evidence_refs=refs,
            evidence_metadata=metadata,
            confidence=evidence.get("confidence", 0.35),
            rationale=(
                "Content was generated with evidence-linked statements only. "
                "Unsupported claims were avoided; uncertainty is explicitly stated where evidence is limited."
            ),
            unresolved_gaps=gaps,
            agent_name="Drafting Agent",
        )

    def qa_review(self, section: SectionDraft) -> list[ReviewFindingSchema]:
        findings: list[ReviewFindingSchema] = []
        lowered = section.generated_text.lower()

        if "draft:" not in lowered:
            findings.append(
                ReviewFindingSchema(
                    severity="Critical",
                    category="Safety Label",
                    affected_sections=[section.section_title],
                    issue_summary="Draft marker missing",
                    rationale="Generated text is missing explicit draft marker.",
                    suggested_fix="Insert DRAFT marker and human approval warning.",
                    linked_evidence=section.evidence_refs,
                )
            )

        if "substantial claim source(s):" not in lowered:
            findings.append(
                ReviewFindingSchema(
                    severity="Critical",
                    category="Traceability",
                    affected_sections=[section.section_title],
                    issue_summary="Claim source line missing",
                    rationale="Substantial generated claims do not show explicit source line.",
                    suggested_fix="Add source references or mark as insufficient evidence.",
                    linked_evidence=section.evidence_refs,
                )
            )

        violations = [term for term in self._PROMOTIONAL_TERMS if term in lowered]
        if violations:
            findings.append(
                ReviewFindingSchema(
                    severity="Major",
                    category="Writing Policy",
                    affected_sections=[section.section_title],
                    issue_summary="Promotional language detected",
                    rationale=f"Promotional or non-regulatory wording detected: {', '.join(violations)}.",
                    suggested_fix="Replace promotional language with neutral, evidence-linked wording.",
                    linked_evidence=section.evidence_refs,
                )
            )

        if section.unresolved_gaps and "insufficient evidence" not in lowered:
            findings.append(
                ReviewFindingSchema(
                    severity="Major",
                    category="Uncertainty Disclosure",
                    affected_sections=[section.section_title],
                    issue_summary="Insufficient evidence statement missing",
                    rationale="Unresolved evidence gaps exist but insufficient evidence is not explicitly stated.",
                    suggested_fix="Add explicit 'insufficient evidence' statement and request additional evidence.",
                    linked_evidence=section.evidence_refs,
                )
            )

        return findings

    def ivdr_review(self, section: SectionDraft) -> list[ReviewFindingSchema]:
        findings: list[ReviewFindingSchema] = []
        if section.confidence < 0.6:
            findings.append(
                ReviewFindingSchema(
                    severity="Major",
                    category="Evidence Coverage",
                    affected_sections=[section.section_title],
                    issue_summary="Evidence confidence below threshold",
                    rationale="Evidence confidence is below the internal drafting threshold.",
                    suggested_fix="Retrieve stronger evidence or further limit claim strength.",
                    linked_evidence=section.evidence_refs,
                )
            )
        return findings

    def revision_summary(self, findings_count: int) -> list[str]:
        return [
            "Preserved conservative wording and retained explicit DRAFT designation.",
            f"Addressed {findings_count} review finding(s) with evidence-first revisions.",
            "Unresolved gaps remain visible for human decision-making and follow-up evidence collection.",
        ]
