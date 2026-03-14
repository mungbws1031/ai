'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createProject, getProjectRuns, getProjects } from '@/lib/api';
import { Card, StateBadge } from '@/components/ui';
import { Project, WorkflowRun } from '@/lib/types';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [runsByProject, setRunsByProject] = useState<Record<number, WorkflowRun[]>>({});
  const [name, setName] = useState('Demo IVDR Project');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const projectData = await getProjects();
      setProjects(projectData);
      const runPairs = await Promise.all(projectData.map(async (p) => [p.id, await getProjectRuns(String(p.id))] as const));
      setRunsByProject(Object.fromEntries(runPairs));
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    if (!name.trim()) return;
    await createProject({ name: name.trim(), description: 'Internal IVDR workflow project' });
    setName('');
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  const allRuns = useMemo(() => Object.values(runsByProject).flat(), [runsByProject]);
  const pendingReviews = allRuns.filter((r) => r.state.includes('Pending Human Review')).length;
  const pendingApprovals = allRuns.filter((r) => r.state.includes('Changes Requested') || r.state.includes('Pending Human Review')).length;

  return (
    <div className="stack">
      <div className="grid3">
        <Card title="Projects">
          <p className="kpi">{projects.length}</p>
          <p className="muted">Active internal IVDR projects</p>
        </Card>
        <Card title="Pending reviews">
          <p className="kpi">{pendingReviews}</p>
          <p className="muted">Runs waiting for human review</p>
        </Card>
        <Card title="Pending approvals">
          <p className="kpi">{pendingApprovals}</p>
          <p className="muted">Runs needing manager decision</p>
        </Card>
      </div>

      <div className="grid2">
        <Card title="Project portfolio" subtitle="Create projects and open settings/review workspaces quickly.">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input placeholder="New project name" value={name} onChange={(e) => setName(e.target.value)} />
            <button onClick={onCreate}>Create project</button>
          </div>
          {loading ? <p className="muted">Loading projects…</p> : null}
          {error ? <p className="badge badge-critical">{error}</p> : null}
          {!loading && projects.length === 0 ? <p className="muted">No projects yet. Create one to begin.</p> : null}
          {projects.map((p) => {
            const runs = runsByProject[p.id] || [];
            const unresolved = runs.filter((r) => r.state !== 'Approved Internally' && r.state !== 'Archived').length;
            return (
              <div key={p.id} className="list-row">
                <strong>{p.name}</strong>
                <div className="muted">Drive: {p.drive_mapping?.root ? 'Connected' : 'Not connected'} | Recent runs: {runs.length} | Open workflow items: {unresolved}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Link href={`/projects/${p.id}`} className="text-link">Project settings</Link>
                  <Link href="/workflow/new" className="text-link">Start workflow</Link>
                  {runs[0] ? <Link href={`/review/${runs[0].id}`} className="text-link">Open review workspace</Link> : null}
                </div>
              </div>
            );
          })}
        </Card>

        <Card title="Recent workflow runs" subtitle="Quickly identify run status and pending actions.">
          {allRuns.length === 0 ? <p className="muted">No workflow runs yet.</p> : null}
          {allRuns
            .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
            .slice(0, 8)
            .map((run) => (
              <div key={run.id} className="list-row">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <Link href={`/workflow/${run.id}`} className="text-link">Run #{run.id} · {run.document_type}</Link>
                  <StateBadge value={run.state} />
                </div>
                <div className="muted">Project #{run.project_id} · Stage {run.current_stage} · Version {run.current_version}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <Link href={`/review/${run.id}`} className="text-link">Review</Link>
                  <Link href={`/traceability/${run.id}`} className="text-link">Traceability</Link>
                </div>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}
