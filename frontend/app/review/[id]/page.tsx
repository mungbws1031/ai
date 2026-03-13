'use client';

import { useEffect, useMemo, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

export default function ReviewWorkspace({ params }: { params: { id: string } }) {
  const [sections, setSections] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  async function load() {
    const [s, f] = await Promise.all([
      fetch(`${API}/workflow-runs/${params.id}/sections`).then((x) => x.json()),
      fetch(`${API}/workflow-runs/${params.id}/findings`).then((x) => x.json()),
    ]);
    setSections(s);
    setFindings(f);
  }

  async function addComment() {
    await fetch(`${API}/workflow-runs/${params.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section_title: selectedFinding?.affected_sections?.[0] ?? '', author: 'Reviewer', body: comment }),
    });
    setComment('');
  }

  async function updateFindingDecision(findingId: number, reviewerDecision: string) {
    await fetch(`${API}/workflow-runs/${params.id}/findings/${findingId}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewer_decision: reviewerDecision, resolution_note: 'Updated from review workspace' }),
    });
    await load();
  }

  async function escalateFinding(findingId: number) {
    await fetch(`${API}/workflow-runs/${params.id}/findings/${findingId}/escalate`, { method: 'POST' });
    await load();
  }

  async function setSectionState(sectionId: number, action: 'acceptance' | 'lock' | 'missing-evidence', value: boolean) {
    const endpoint = action === 'acceptance'
      ? `sections/${sectionId}/acceptance`
      : action === 'lock'
        ? `sections/${sectionId}/lock`
        : `sections/${sectionId}/missing-evidence`;
    const body = action === 'acceptance' ? { accepted: value } : action === 'lock' ? { locked: value } : { missing_evidence: value };

    await fetch(`${API}/workflow-runs/${params.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    await load();
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const filteredFindings = useMemo(
    () => findings.filter((f) => (severityFilter === 'All' || f.severity === severityFilter) && (statusFilter === 'All' || f.status === statusFilter)),
    [findings, severityFilter, statusFilter],
  );

  return (
    <div className="grid3">
      <div className="card">
        <h3>Sections</h3>
        {sections.map((s) => (
          <div key={s.id} style={{ borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 8 }}>
            <strong>{s.section_title}</strong>
            <div>
              <button onClick={() => setSectionState(s.id, 'acceptance', true)}>Approve section</button>
              <button onClick={() => setSectionState(s.id, 'lock', !s.locked_by_human)}>{s.locked_by_human ? 'Unlock' : 'Lock'} section</button>
              <button onClick={() => setSectionState(s.id, 'missing-evidence', true)}>Mark missing evidence</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Draft Content</h3>
        {sections.map((s) => {
          const highlighted = selectedFinding?.affected_sections?.includes(s.section_title);
          return (
            <div key={s.id} style={{ background: highlighted ? '#fff6d6' : 'transparent', padding: 6 }}>
              <strong>{s.section_title}</strong>
              <p>{s.generated_text}</p>
              <small>Evidence: {s.evidence_refs?.join(', ') || 'None'}</small>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h3>Findings</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option>All</option><option>Critical</option><option>Major</option><option>Minor</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option><option>Open</option><option>Resolved</option><option>Dismissed</option>
          </select>
        </div>
        {filteredFindings.map((f) => (
          <div key={f.id} onClick={() => setSelectedFinding(f)} style={{ border: '1px solid #ddd', marginTop: 8, padding: 6, cursor: 'pointer' }}>
            <strong>{f.severity} - {f.category}</strong>
            <div>{f.issue_summary || f.rationale}</div>
            <small>Status: {f.status} | Decision: {f.reviewer_decision}</small>
            <div>Evidence links: {f.linked_evidence?.join(', ') || 'None'}</div>
            <div>Suggested fix: {f.suggested_fix}</div>
            <button onClick={(e) => { e.stopPropagation(); updateFindingDecision(f.id, 'Accepted'); }}>Accept proposed revision</button>
            <button onClick={(e) => { e.stopPropagation(); updateFindingDecision(f.id, 'Rejected'); }}>Reject proposed revision</button>
            <button onClick={(e) => { e.stopPropagation(); escalateFinding(f.id); }}>Escalate to RA manager</button>
          </div>
        ))}
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add review comment" />
        <button onClick={addComment}>Add comment</button>
      </div>
    </div>
  );
}
