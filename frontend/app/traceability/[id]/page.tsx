'use client';

import { useEffect, useState } from 'react';
import { getRunTraceability } from '@/lib/api';
import { Card, DriveLink } from '@/components/ui';

export default function TraceabilityView({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getRunTraceability(params.id).then(setData);
  }, [params.id]);

  if (!data) return <div className="card">Loading traceability…</div>;

  return (
    <div className="stack">
      <Card title={`Traceability · Run #${params.id}`} subtitle="Section/evidence links, finding/revision links, and source lineage.">
        <p className="muted">Use this view to verify evidence coverage before final approvals.</p>
      </Card>

      <div className="grid2">
        <Card title="Section → Evidence mapping">
          {data.section_to_evidence?.map((row: any, index: number) => (
            <div key={index} className="list-row">
              <strong>{row.section_title}</strong>
              <div className="muted">Evidence refs: {(row.evidence_refs || []).join(', ') || 'None'} · Open findings: {row.open_findings}</div>
            </div>
          ))}
        </Card>

        <Card title="Finding → Revision mapping">
          {data.finding_to_revision?.map((row: any, index: number) => (
            <div key={index} className="list-row">Finding #{row.finding_id} · {row.status} · Revision changes: {(row.revision_change_ids || []).join(', ') || 'none'}</div>
          ))}
        </Card>
      </div>

      <div className="grid2">
        <Card title="Version lineage">
          {data.version_lineage?.map((row: any, index: number) => (
            <div key={index} className="list-row">{row.version_label} ({row.stage_label}) · parent: {row.parent_version_id ?? 'root'}</div>
          ))}
        </Card>

        <Card title="Source documents">
          {data.source_to_drive_ref?.map((row: any, index: number) => (
            <div key={index} className="list-row">
              <DriveLink fileId={row.drive_file_id} label={`${row.drive_file_id} (${row.origin})`} />
              <div className="muted">Section: {row.section_title || 'n/a'}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
