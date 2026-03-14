from fastapi.testclient import TestClient
from uuid import uuid4

from app.main import app
from app.db.database import SessionLocal
from app.models.entities import ReviewFinding


def _create_run(client: TestClient) -> int:
    project = client.post('/api/projects', json={
        'name': f'Demo IVDR Project {uuid4()}',
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
    return run.json()['id']


def test_workflow_revision_rerun_and_traceability_api():
    client = TestClient(app)
    run_id = _create_run(client)

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


def test_approved_section_stays_locked_until_explicit_unlock():
    client = TestClient(app)
    run_id = _create_run(client)

    sections = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    section = sections[0]

    accepted = client.post(
        f'/api/workflow-runs/{run_id}/sections/{section["id"]}/acceptance',
        json={'accepted': True},
    )
    assert accepted.status_code == 200
    assert accepted.json()['locked_by_human'] is True

    baseline = accepted.json()['generated_text']

    client.post(f'/api/workflow-runs/{run_id}/rerun', json={'step': 'review'})
    client.post(f'/api/workflow-runs/{run_id}/revise', json={'finding_ids': []})

    after_locked = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    still_locked = [s for s in after_locked if s['id'] == section['id']][0]
    assert still_locked['generated_text'] == baseline

    unlock = client.post(
        f'/api/workflow-runs/{run_id}/sections/{section["id"]}/lock',
        json={'locked': False},
    )
    assert unlock.status_code == 200

    db = SessionLocal()
    db.add(ReviewFinding(
        workflow_run_id=run_id,
        severity='Major',
        category='Evidence Coverage',
        affected_sections=[section['section_title']],
        issue_summary='Manual test finding',
        rationale='insufficient evidence noted for revision behavior test',
        suggested_fix='Add uncertainty statement',
        linked_evidence=section['evidence_refs'],
        status='Open',
    ))
    db.commit()
    db.close()

    client.post(f'/api/workflow-runs/{run_id}/revise', json={'finding_ids': []})
    after_unlock = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    changed = [s for s in after_unlock if s['id'] == section['id']][0]
    assert changed['generated_text'] != baseline


def test_revision_lineage_evidence_linking_and_rerun_granularity():
    client = TestClient(app)
    run_id = _create_run(client)

    evidence_rerun = client.post(f'/api/workflow-runs/{run_id}/rerun', json={
        'step': 'evidence',
        'selected_sections': ['Purpose'],
        'reuse_previous_evidence_set': False,
    })
    assert evidence_rerun.status_code == 200

    draft_rerun = client.post(f'/api/workflow-runs/{run_id}/rerun', json={
        'step': 'drafting',
        'section': 'Purpose',
    })
    assert draft_rerun.status_code == 200

    review_rerun = client.post(f'/api/workflow-runs/{run_id}/rerun', json={'step': 'review'})
    assert review_rerun.status_code == 200

    revision_rerun = client.post(f'/api/workflow-runs/{run_id}/rerun', json={'step': 'revision'})
    assert revision_rerun.status_code == 200

    sections = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    purpose = [s for s in sections if s['section_title'] == 'Purpose'][0]
    assert purpose['evidence_refs']
    assert purpose['evidence_metadata']

    versions = client.get(f'/api/workflow-runs/{run_id}/versions').json()
    assert len(versions) >= 2

    summaries = client.get(f'/api/workflow-runs/{run_id}/revision-summaries').json()
    assert summaries
    assert 'findings_addressed' in summaries[0]
    assert 'findings_remaining' in summaries[0]

    traceability = client.get(f'/api/workflow-runs/{run_id}/traceability').json()
    assert traceability['section_to_evidence']
    assert 'evidence_metadata' in traceability['section_to_evidence'][0]


def test_drive_connect_index_and_template_listing_endpoints():
    client = TestClient(app)

    project = client.post('/api/projects', json={
        'name': f'Drive Project {uuid4()}',
        'description': 'drive mapping',
        'drive_mapping': {}
    })
    assert project.status_code == 200
    project_id = project.json()['id']

    connected = client.post(f'/api/projects/{project_id}/drive/connect', json={'folder_id': 'mock-root'})
    assert connected.status_code == 200
    mapping = connected.json()['mapping']
    assert mapping['root'] == 'mock-root'
    assert mapping['templates']
    assert mapping['outputs']

    index = client.get(f'/api/projects/{project_id}/drive/index')
    assert index.status_code == 200
    assert 'files' in index.json()

    templates = client.get(f'/api/projects/{project_id}/drive/templates')
    assert templates.status_code == 200
    names = [item['name'] for item in templates.json()]
    assert 'PEP_Template.docx' in names


def test_can_start_workflow_with_drive_template_selector_value():
    client = TestClient(app)

    project = client.post('/api/projects', json={
        'name': f'Drive Template Project {uuid4()}',
        'description': 'drive template id usage',
        'drive_mapping': {'root': 'mock-root'}
    })
    assert project.status_code == 200

    run = client.post('/api/workflow-runs', json={
        'project_id': project.json()['id'],
        'document_type': 'Performance Evaluation Plan',
        'template_name': 'drive:tmpl-001',
        'output_path': 'backend/data/outputs',
        'source_folders': ['Sources/Regulations', 'Sources/Evidence'],
        'custom_instructions': 'Use conservative language'
    })
    assert run.status_code == 200

    run_id = run.json()['id']
    sections = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    assert sections
    assert sections[0]['evidence_metadata']


def test_google_docs_comment_threads_and_finding_resolution_sync():
    client = TestClient(app)
    run_id = _create_run(client)

    findings = client.get(f'/api/workflow-runs/{run_id}/findings').json()
    if findings:
        finding_id = findings[0]['id']
    else:
        db = SessionLocal()
        db.add(ReviewFinding(
            workflow_run_id=run_id,
            severity='Major',
            category='Traceability',
            affected_sections=['Purpose'],
            issue_summary='Manual finding for doc-comment linkage',
            rationale='Need explicit evidence-linked wording',
            suggested_fix='Add citation line and request revision',
            linked_evidence=['reg-001'],
            status='Open',
        ))
        db.commit()
        finding_id = db.query(ReviewFinding).filter(ReviewFinding.workflow_run_id == run_id).order_by(ReviewFinding.id.desc()).first().id
        db.close()

    sections = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    section_title = sections[0]['section_title']

    created = client.post(
        f'/api/workflow-runs/{run_id}/doc-comments',
        json={
            'body': 'Please tighten this claim wording and add evidence.',
            'author': 'reviewer-a',
            'quoted_text': 'Substantial claim source(s):',
            'evidence_refs': ['reg-001'],
            'section_title': section_title,
            'finding_id': finding_id,
            'request_revision': True,
            'section_approved': False,
        },
    )
    assert created.status_code == 200
    thread = created.json()
    assert thread['finding_id'] == finding_id
    assert thread['status'] == 'open'

    listed = client.get(f'/api/workflow-runs/{run_id}/doc-comments')
    assert listed.status_code == 200
    assert listed.json()

    synced = client.post(f'/api/workflow-runs/{run_id}/doc-comments/sync')
    assert synced.status_code == 200
    assert synced.json()

    resolved = client.post(
        f'/api/workflow-runs/{run_id}/doc-comments/{thread["id"]}/resolve',
        json={'resolution_note': 'Updated with conservative wording and evidence refs.'},
    )
    assert resolved.status_code == 200
    assert resolved.json()['status'] == 'resolved'

    findings_after = client.get(f'/api/workflow-runs/{run_id}/findings').json()
    target = [f for f in findings_after if f['id'] == finding_id][0]
    assert target['status'] == 'Resolved'


def test_google_docs_section_approval_from_comment_thread():
    client = TestClient(app)
    run_id = _create_run(client)

    sections = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    section = sections[0]

    created = client.post(
        f'/api/workflow-runs/{run_id}/doc-comments',
        json={
            'body': 'Section is acceptable for this draft cycle.',
            'author': 'reviewer-b',
            'section_title': section['section_title'],
            'section_approved': True,
            'request_revision': False,
            'evidence_refs': section['evidence_refs'],
        },
    )
    assert created.status_code == 200

    resolved = client.post(
        f'/api/workflow-runs/{run_id}/doc-comments/{created.json()["id"]}/resolve',
        json={'resolution_note': 'Approved in document thread.'},
    )
    assert resolved.status_code == 200

    sections_after = client.get(f'/api/workflow-runs/{run_id}/sections').json()
    approved = [s for s in sections_after if s['id'] == section['id']][0]
    assert approved['accepted_by_human'] is True
    assert approved['locked_by_human'] is True
