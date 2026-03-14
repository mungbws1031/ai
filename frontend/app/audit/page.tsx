import { getAudit } from '@/lib/api';
import { Card } from '@/components/ui';

export default async function AuditLogView() {
  const events = await getAudit();
  return (
    <div className="stack">
      <Card title="Audit Log" subtitle="Timestamped user/AI actions and system events.">
        <p className="muted">Includes reruns, approvals, revisions, and document version creation.</p>
      </Card>
      <Card title="Event stream">
        {events.length === 0 ? <p className="muted">No audit events available.</p> : null}
        {events.map((e: any) => (
          <div key={e.id} className="list-row">
            <div><strong>{e.created_at}</strong> · {e.actor} · {e.action}</div>
            <div className="muted">{e.entity_type} #{e.entity_id}</div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem' }}>{JSON.stringify(e.details, null, 2)}</pre>
          </div>
        ))}
      </Card>
    </div>
  );
}
