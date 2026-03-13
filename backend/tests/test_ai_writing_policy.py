from app.services.ai_service import AIService


def test_draft_section_states_uncertainty_when_evidence_missing():
    service = AIService()
    draft = service.draft_section("Performance Evaluation", {"ranked_sources": [], "gaps": ["insufficient evidence"], "confidence": 0.35})

    assert "DRAFT:" in draft.generated_text
    assert "insufficient evidence" in draft.generated_text.lower()
    assert "Substantial claim source(s): insufficient evidence." in draft.generated_text


def test_qa_review_flags_promotional_terms_and_has_issue_summary():
    service = AIService()
    section = service.draft_section("Purpose", {"ranked_sources": [{"file_id": "x", "score": 0.9}], "gaps": [], "confidence": 0.8})
    section.generated_text += " This is a groundbreaking and best-in-class system."

    findings = service.qa_review(section)
    assert any(f.category == "Writing Policy" for f in findings)
    assert all(f.issue_summary for f in findings)
