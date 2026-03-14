'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getRun, getRunFindings, getRunRevisionSummaries, getRunTimeline, getRunVersions, rerunWorkflow, updateDecision } from '@/lib/api';
import { Card, DriveLink, SeverityBadge, StateBadge } from '@/components/ui';

export default function WorkflowRunDetail({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [sectionName, setSectionName] = useState('Purpose');

  async function load() {
    const [r, t, f, v, s] = await Promise.all([
      getRun(params.id),
      getRunTimeline(params.id),
      getRunFindings(params.id),
      getRunVersions(params.id),
      getRunRevisionSummaries(params.id),
    ]);
    setRun(r);
    setTimeline(t);
    setFindings(f);
    setVersions(v);
    setSummaries(s);
  }

  async function runAction(label: string, action: () => Promise<any>) {
    if (!confirm(`Confirm action: ${label}?`)) return;
    setBusy(label);
    setError('');
    try {
      await action();
      await load();
    } catch (err: any) {
      setError(err.message || `${label} failed`);
    } finally {
      setBusy('');
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  const unresolvedCount = useMemo(() => findings.filter((x) => x.status === 'Open').length, [findings]);

  if (!run) return <div className="card">Loading workflow run…</div>;

  return (
    <div className="stack">
      <Card title={`Workflow Run #${params.id}`} subtitle="Progress, findings, outputs, and rerun controls in one view.">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StateBadge value={run.state} />
          <span className="badge badge-neutral">Stage: {run.current_stage}</span>
          <span className="badge badge-neutral">Version: {run.current_version}</span>
          <span className="badge badge-warn">Unresolved findings: {unresolvedCount}</span>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>Template: {run.template_name} · Source folders: {(run.source_folders || []).join(', ') || 'Not captured'}</p>
        {error ? <p className="badge badge-critical">{error}</p> : null}
      </Card>

      <div className="grid3">
        <Card title="Rerun controls" subtitle="Use confirmation prompts before restarting steps.">
          <div className="stack">
            <button onClick={() => runAction('Rerun drafting', () => rerunWorkflow(params.id, { step: 'drafting', selected_sections: [] }))}>
              {busy === 'Rerun drafting' ? 'Running…' : 'Rerun drafting'}
            </button>
            <button onClick={() => runAction('Rerun review', () => rerunWorkflow(params.id, { step: 'review' }))}>Rerun review</button>
            <button onClick={() => runAction('Rerun revision', () => rerunWorkflow(params.id, { step: 'revision' }))}>Rerun revision</button>
            <button onClick={() => runAction('Rerun evidence refresh', () => rerunWorkflow(params.id, { step: 'evidence', refresh_evidence_from_drive: true }))}>Refresh evidence only</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={sectionName} onChange={(e) => setSectionName(e.target.value)} placeholder="Section title" />
              <button className="secondary" onClick={() => runAction('Rerun selected section', () => rerunWorkflow(params.id, { step: 'drafting', section: sectionName }))}>Rerun selected section</button>
            </div>
          </div>
        </Card>

        <Card title="Approvals" subtitle="Human decisions are always explicit and auditable.">
          <div className="stack">
            <button onClick={() => runAction('Approve', () => updateDecision(params.id, 'approve'))}>Approve</button>
            <button onClick={() => runAction('Request changes', () => updateDecision(params.id, 'request_changes'))}>Request changes</button>
            <button onClick={() => runAction('Archive', () => updateDecision(params.id, 'archive'))}>Archive</button>
          </div>
        </Card>

        <Card title="Output documents" subtitle="Open generated outputs and downstream review views.">
          {versions.length === 0 ? <p className="muted">No versions yet.</p> : null}
          {versions.slice().reverse().map((v) => (
            <div key={v.id} className="list-row">
              <strong>{v.version_label}</strong> · {v.stage_label}
              <div className="muted">{v.output_path}</div>
              <DriveLink fileId={v.drive_file_id} label="Open in Google Drive" />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Link href={`/review/${params.id}`} className="text-link">Open review workspace</Link>
            <Link href={`/traceability/${params.id}`} className="text-link">Open traceability</Link>
          </div>
        </Card>
      </div>

      <div className="grid2">
        <Card title="Findings summary" subtitle="Unresolved issues should be addressed before approval.">
          {findings.length === 0 ? <p className="muted">No findings for this run.</p> : null}
          {findings.map((f) => (
            <div key={f.id} className="list-row">
              <div style={{ display: 'flex', gap: 8 }}>
                <SeverityBadge value={f.severity} />
                <span className="badge badge-neutral">{f.category}</span>
                <span className="badge badge-neutral">{f.status}</span>
              </div>
              <p>{f.issue_summary || f.rationale}</p>
            </div>
          ))}
        </Card>

        <Card title="Agent timeline" subtitle="Full execution history for transparency and audit readiness.">
          {timeline.length === 0 ? <p className="muted">No timeline events available.</p> : null}
          {timeline.map((item) => (
            <div key={item.id} className="list-row">
              <strong>{item.step_name}</strong> · {item.agent_name}
              <div className="muted">{item.created_at}</div>
            </div>
          ))}
          {summaries.length > 0 ? (
            <details>
              <summary>Latest revision summary</summary>
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(summaries[0], null, 2)}</pre>
            </details>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
