import './globals.css';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ padding: 16 }}>
          <h1>IVDR RA Workflow Automation</h1>
          <nav style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/workflow/new">New Run</Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
