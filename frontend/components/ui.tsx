import Link from 'next/link';

export function Card({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      {title ? <h2 className="card-title">{title}</h2> : null}
      {subtitle ? <p className="muted">{subtitle}</p> : null}
      {children}
    </section>
  );
}

export function StateBadge({ value }: { value: string }) {
  const css =
    value.includes('Pending') || value.includes('Changes')
      ? 'badge badge-warn'
      : value.includes('Approved')
        ? 'badge badge-success'
        : 'badge badge-neutral';
  return <span className={css}>{value}</span>;
}

export function SeverityBadge({ value }: { value: string }) {
  const lower = value.toLowerCase();
  const css = lower.includes('critical') ? 'badge badge-critical' : lower.includes('major') ? 'badge badge-warn' : 'badge badge-neutral';
  return <span className={css}>{value}</span>;
}

export function DriveLink({ fileId, label }: { fileId?: string; label: string }) {
  if (!fileId) return <span className="muted">{label}</span>;
  return (
    <Link href={`https://drive.google.com/file/d/${fileId}/view`} target="_blank" className="text-link">
      {label}
    </Link>
  );
}
