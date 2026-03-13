'use client';

import { useEffect, useState } from 'react';
import { getRunTraceability } from '@/lib/api';

export default function TraceabilityView({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getRunTraceability(params.id).then(setData);
  }, [params.id]);

  if (!data) return <div className="card">Loading traceability...</div>;

  return (
    <div className="card">
      <h2>Traceability #{params.id}</h2>
      <h3>Section → Evidence</h3>
      {data.section_to_evidence?.map((row: any, index: number) => (
        <div key={index}><strong>{row.section_title}</strong> | {row.evidence_refs.join(', ') || 'None'} | Open findings: {row.open_findings}</div>
      ))}

      <h3>Finding → Revision outcome</h3>
      {data.finding_to_revision?.map((row: any, index: number) => (
        <div key={index}>Finding #{row.finding_id} | {row.status} | Revision changes: {row.revision_change_ids.join(', ') || 'none'}</div>
      ))}

      <h3>Version lineage tree</h3>
      {data.version_lineage?.map((row: any, index: number) => (
        <div key={index}>{row.version_label} ({row.stage_label}) parent={row.parent_version_id ?? 'root'}</div>
      ))}

      <h3>Claim → Source mapping</h3>
      {data.claim_to_source?.map((row: any, index: number) => (
        <div key={index}>{row.claim} → {row.source_document_ids.join(', ') || 'none'}</div>
      ))}

      <h3>Source document → Drive reference</h3>
      {data.source_to_drive_ref?.map((row: any, index: number) => (
        <div key={index}>{row.drive_file_id} ({row.origin})</div>
      ))}
    </div>
  );
}
