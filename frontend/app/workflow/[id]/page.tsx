'use client';

import { useEffect, useState } from 'react';
import { rerunWorkflow } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

export default function WorkflowRunDetail({ params }: { params: { id: string } }) {
  const [run, setRun] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);

  async function load() {
    const [r, t, f, v, s] = await Promise.all([
      fetch(`${API}/workflow-runs/${params.id}`).then((x) => x.json()),
      fetch(`${API}/workflow-runs/${params.id}/timeline`).then((x) => x.json()),
      fetch(`${API}/workflow-runs/${params.id}/findings`).then((x) => x.json()),
      fetch(`${API}/workflow-runs/${params.id}/versions`).then((x) => x.json()),
      fetch(`${API}/workflow-runs/${params.id}/revision-summaries`).then((x) => x.json()),
    ]);
    setRun(r);
    setTimeline(t);
    setFindings(f);
    setVersions(v);
    setSummaries(s);
  }

  async function decide(decision: string) {
    await fetch(`${API}/workflow-runs/${params.id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-actor': 'RA Manager' },
      body: JSON.stringify({ decision, reason: 'Manual decision from UI' }),
    });
    await load();
  }

  async function rerun(step: string) {
    await rerunWorkflow(params.id, {
      step,
      preserve_accepted_text: true,
      preserve_approved_sections: true,
      reuse_previous_evidence_set: true,
      refresh_evidence_from_drive: step === 'evidence',
      selected_sections: [],
    });
    await load();
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (!run) return <div className="card">Loading...</div>;

  return (
    <div className="card">
      <h2>Workflow Run #{params.id}</h2>
      <p>State: {run.state}</p>
      <p>Output: {run.output_path}</p>
      <p>Stage/Version: {run.current_stage} / {run.current_version}</p>

      <h3>Human decisions</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => decide('approve')}>Approve</button>
        <button onClick={() => decide('request_changes')}>Request changes</button>
        <button onClick={() => decide('archive')}>Archive</button>
      </div>

      <h3>Selective reruns</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => rerun('full')}>Rerun full workflow</button>
        <button onClick={() => rerun('drafting')}>Rerun drafting</button>
        <button onClick={() => rerun('review')}>Rerun review</button>
        <button onClick={() => rerun('revision')}>Rerun revision</button>
        <button onClick={() => rerun('evidence')}>Rerun evidence retrieval</button>
      </div>

      <h3>Execution timeline</h3>
      {timeline.map((item) => <div key={item.id}>{item.step_name} - {item.agent_name}</div>)}

      <h3>Findings</h3>
      {findings.length === 0 ? <p>No findings.</p> : findings.map((f) => <div key={f.id}>{f.severity}: {f.issue_summary || f.rationale}</div>)}

      <h3>Version lineage</h3>
      {versions.map((v) => <div key={v.id}>{v.version_label} ({v.stage_label}) - {v.output_path}</div>)}

      <h3>Revision summaries</h3>
      {summaries.map((s) => (
        <div key={s.id}>
          <strong>{s.cycle_label}</strong> | evidence: {s.evidence_outcome}
        </div>
      ))}
    </div>
  );
}
