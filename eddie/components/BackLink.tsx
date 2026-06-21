'use client';

import Link from 'next/link';

export default function BackLink({ href = '/more', label = '더보기' }: { href?: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex min-h-tap items-center gap-1 pt-4 text-sm text-eddie-primary">
      ‹ {label}
    </Link>
  );
}
