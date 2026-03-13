'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createProject, getProjects } from '@/lib/api';

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [name, setName] = useState('Demo IVDR Project');

  async function load() {
    const data = await getProjects();
    setProjects(data);
  }

  async function onCreate() {
    await createProject({ name, description: 'Internal IVDR workflow project' });
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid3">
      <section className="card">
        <h2>Projects</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={onCreate}>Create</button>
        </div>
        {projects.map((p: any) => (
          <div key={p.id}><Link href={`/projects/${p.id}`}>{p.name}</Link></div>
        ))}
      </section>
      <section className="card"><h2>Recent Workflow Runs</h2><p>Open a project to start and inspect runs.</p></section>
      <section className="card"><h2>Pending Approvals</h2><p>All AI outputs remain DRAFT until human approval.</p></section>
    </div>
  );
}
