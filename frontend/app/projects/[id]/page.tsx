'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { connectDrive, getDriveIndex, getDriveTemplates, getProjectRuns, getProjects } from '@/lib/api';
import { Card, DriveLink, StateBadge } from '@/components/ui';

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const projectId = Number(params.id);
  const [project, setProject] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [folderId, setFolderId] = useState('mock-root');
  const [health, setHealth] = useState<any>(null);
  const [index, setIndex] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    const projects = await getProjects();
    const target = projects.find((x) => x.id === projectId);
    setProject(target || null);
    if (target?.drive_mapping?.root) setFolderId(target.drive_mapping.root);
    setRuns(await getProjectRuns(params.id));
    setIndex(await getDriveIndex(projectId));
    setTemplates(await getDriveTemplates(projectId));
  }

  async function onConnect() {
    try {
      const result = await connectDrive(projectId, folderId);
      setHealth(result.mapping);
      setMessage('Drive mapping saved.');
      await load();
    } catch (error: any) {
      setMessage(error.message || 'Failed to connect drive.');
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  return (
    <div className="stack">
      <Card title={`Project settings · #${params.id}`} subtitle="Configure Drive mapping and inspect indexed source inventory.">
        {!project ? <p className="muted">Loading project…</p> : null}
        {project ? (
          <>
            <p><strong>{project.name}</strong></p>
            <p className="muted">{project.description || 'No description provided.'}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={folderId} onChange={(e) => setFolderId(e.target.value)} placeholder="Google Drive root folder ID" />
              <button onClick={onConnect}>Connect Drive folder</button>
              <button className="secondary" onClick={load}>Refresh Drive index</button>
            </div>
            {message ? <p className="muted" style={{ marginTop: 6 }}>{message}</p> : null}
          </>
        ) : null}
      </Card>

      <div className="grid2">
        <Card title="Drive mapping health" subtitle="Expected structure: templates, regulations, sop, evidence, outputs.">
          <div className="list-row">Root: <strong>{project?.drive_mapping?.root || 'Not set'}</strong></div>
          {['templates', 'regulations', 'sop', 'evidence', 'outputs'].map((name) => (
            <div key={name} className="list-row">{name}: <strong>{project?.drive_mapping?.[name] || 'missing'}</strong></div>
          ))}
          <div className="list-row">
            Connection health: {project?.drive_mapping?.structure_valid ? <span className="badge badge-success">Valid</span> : <span className="badge badge-warn">Needs validation</span>}
          </div>
        </Card>

        <Card title="Template inventory" subtitle="Choose one template in the workflow wizard.">
          {templates.length === 0 ? <p className="muted">No templates indexed yet.</p> : null}
          {templates.map((t) => (
            <div key={t.id} className="list-row">
              <strong>{t.name}</strong>
              <div className="muted">Template ID: {t.id}</div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid2">
        <Card title="Indexed source files" subtitle="Regulatory, SOP, evidence, and template files discovered in Drive.">
          {!index?.files?.length ? <p className="muted">No indexed files found.</p> : null}
          {index?.files?.map((f: any) => (
            <div key={f.id} className="list-row">
              <strong>{f.name}</strong>
              <div className="muted">Folder: {f.folder || f.folder_name || 'unknown'} · Type: {f.type}</div>
              <DriveLink fileId={f.id} label="Open in Google Drive" />
            </div>
          ))}
        </Card>

        <Card title="Recent workflow runs" subtitle="Open run detail, review workspace, or traceability view.">
          {runs.length === 0 ? <p className="muted">No runs for this project.</p> : null}
          {runs.map((run) => (
            <div key={run.id} className="list-row">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Link href={`/workflow/${run.id}`} className="text-link">Run #{run.id} · {run.document_type}</Link>
                <StateBadge value={run.state} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link href={`/review/${run.id}`} className="text-link">Review workspace</Link>
                <Link href={`/traceability/${run.id}`} className="text-link">Traceability</Link>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
