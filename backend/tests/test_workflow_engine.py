from docx import Document

from fastapi.testclient import TestClient

from app.main import app

from app.db.database import SessionLocal
from app.models.entities import SectionOutput


def test_workflow_revision_rerun_and_traceability_api():
    client = TestClient(app)

    project = client.post('/api/projects', json={
        'name': 'Demo IVDR Project',
        'description': 'seed-like project',
        'drive_mapping': {'root': 'mock-root'}
    })
    assert project.status_code == 200

    run = client.post('/api/workflow-runs', json={
        'project_id': project.json()['id'],
        'document_type': 'Performance Evaluation Plan',
        'template_name': 'PEP_Template.docx',
        'output_path': 'backend/data/outputs',
        'source_folders': ['Sources/Regulations', 'Sources/Evidence'],
        'custom_instructions': 'Use conservative language'
    })
    assert run.status_code == 200
    run_id = run.json()['id']
    assert run.json()['current_version'] == 'v0.1'

    sections_before = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    first_section = sections_before[0]
    first_section_id = first_section['id']
    original_text = first_section['generated_text']
    assert 'Substantial claim source(s):' in original_text

    lock_resp = client.post(f'/api/workflow-runs/{run_id}/sections/{first_section_id}/lock', json={'locked': True})
    assert lock_resp.status_code == 200
    assert lock_resp.json()['locked_by_human'] is True

    rerun = client.post(f'/api/workflow-runs/{run_id}/rerun', json={
        'step': 'review',
        'selected_sections': [],
        'preserve_accepted_text': True,
        'preserve_approved_sections': True,
        'reuse_previous_evidence_set': True,
        'refresh_evidence_from_drive': False,
    })
    assert rerun.status_code == 200

    findings = client.get(f'/api/workflow-runs/{run_id}/findings').json()
    if findings:
        decision = client.post(
            f'/api/workflow-runs/{run_id}/findings/{findings[0]["id"]}/decision',
            json={'reviewer_decision': 'Accepted', 'resolution_note': 'Looks correct'}
        )
        assert decision.status_code == 200

    revise = client.post(f'/api/workflow-runs/{run_id}/revise', json={'finding_ids': []})
    assert revise.status_code == 200

    sections_after = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    locked_section_after = [s for s in sections_after if s['id'] == first_section_id][0]
    assert locked_section_after['generated_text'] == original_text

    summaries = client.get(f'/api/workflow-runs/{run_id}/revision-summaries')
    assert summaries.status_code == 200

    traceability = client.get(f'/api/workflow-runs/{run_id}/traceability')
    assert traceability.status_code == 200
    body = traceability.json()
    assert 'section_to_evidence' in body
    assert 'finding_to_revision' in body
    assert 'version_lineage' in body


def test_drafting_rerun_keeps_locked_section_text_in_output_and_creates_unique_paths():
    client = TestClient(app)

    project = client.post('/api/projects', json={
        'name': 'Lock Safety Project',
        'description': 'lock behavior check',
        'drive_mapping': {'root': 'mock-root'}
    })
    assert project.status_code == 200

    run = client.post('/api/workflow-runs', json={
        'project_id': project.json()['id'],
        'document_type': 'Performance Evaluation Plan',
        'template_name': 'PEP_Template.docx',
        'output_path': 'backend/data/outputs',
        'source_folders': ['Sources/Regulations', 'Sources/Evidence'],
        'custom_instructions': 'Use conservative language'
    })
    assert run.status_code == 200
    run_id = run.json()['id']

    section = client.get(f'/api/workflow-runs/{run_id}/sections').json()[0]
    section_id = section['id']
    sentinel_text = 'LOCKED HUMAN TEXT SHOULD STAY IN DOCX'

    lock_resp = client.post(f'/api/workflow-runs/{run_id}/sections/{section_id}/lock', json={'locked': True})
    assert lock_resp.status_code == 200

    with SessionLocal() as db:
        row = db.query(SectionOutput).filter(SectionOutput.id == section_id).first()
        row.generated_text = sentinel_text
        db.commit()

    rerun_drafting_1 = client.post(f'/api/workflow-runs/{run_id}/rerun', json={
        'step': 'drafting',
        'selected_sections': [section['section_title']],
        'refresh_evidence_from_drive': False,
    })
    assert rerun_drafting_1.status_code == 200

    versions_after_first_rerun = client.get(f'/api/workflow-runs/{run_id}/versions').json()
    first_rerun_path = versions_after_first_rerun[-1]['output_path']

    doc = Document(first_rerun_path)
    doc_text = '\\n'.join(p.text for p in doc.paragraphs)
    assert sentinel_text in doc_text

    rerun_drafting_2 = client.post(f'/api/workflow-runs/{run_id}/rerun', json={
        'step': 'drafting',
        'selected_sections': [section['section_title']],
        'refresh_evidence_from_drive': False,
    })
    assert rerun_drafting_2.status_code == 200

    versions_after_second_rerun = client.get(f'/api/workflow-runs/{run_id}/versions').json()
    latest_two_paths = [item['output_path'] for item in versions_after_second_rerun[-2:]]
    assert latest_two_paths[0] != latest_two_paths[1]
