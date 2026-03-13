'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getProjectRuns } from '@/lib/api';

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    getProjectRuns(params.id).then(setRuns);
  }, [params.id]);

  return (
    <div className="card">
      <h2>Project Detail #{params.id}</h2>
      <ul>
        <li>Drive folder mapping and source inventory are configured per project.</li>
        <li>Templates and prior submissions are picked at workflow start.</li>
      </ul>
      <h3>Workflow history</h3>
      {runs.map((run) => (
        <div key={run.id}>
          <Link href={`/workflow/${run.id}`}>Run #{run.id}</Link> - {run.document_type} - {run.state}
        </div>
      ))}
    </div>
  );
}
