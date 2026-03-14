import './globals.css';
import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/workflow/new', label: 'New Workflow' },
  { href: '/audit', label: 'Audit Log' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div>
            <p className="eyebrow">Internal Regulatory Workspace</p>
            <h1>IVDR RA Workflow Automation</h1>
          </div>
          <nav className="topnav">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className="topnav-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="page-wrap">{children}</main>
      </body>
    </html>
  );
}
