import { getAudit } from '@/lib/api';

export default async function AuditLogView() {
  const events = await getAudit();
  return (
    <div className="card">
      <h2>Audit Log</h2>
      {events.map((e: any) => (
        <div key={e.id} style={{ borderBottom: '1px solid #ddd', padding: 6 }}>
          <div>{e.created_at} | {e.actor} | {e.action}</div>
          <div>{e.entity_type} #{e.entity_id}</div>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(e.details, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
