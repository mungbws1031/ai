'use client';

import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import InstallCard from '@/components/InstallCard';

const links = [
  { href: '/more/medications', label: '복약 관리', desc: '약·시간·요일 설정', icon: '💊' },
  { href: '/more/departure', label: '출발 알림', desc: '도착시각으로 출발 역산', icon: '🚪' },
  { href: '/more/place', label: '제자리', desc: '물건 자리 등록 · 외출 체크', icon: '🔑' },
  { href: '/more/sleep', label: '취침', desc: '와인드다운 · 취침 기록', icon: '🌙' },
  { href: '/more/tidy', label: '5분 정리', desc: '마이크로 정리 타이머', icon: '🧹' },
  { href: '/more/notifications', label: '알림 설정', desc: '권한·톤·하루 총량', icon: '🔔' },
  { href: '/more/about', label: '면책 · 개인정보', desc: '의료기기 아님 · 데이터 관리', icon: '🛡️' },
];

export default function MorePage() {
  return (
    <div className="px-4">
      <PageHeader title="더보기" />
      <InstallCard />
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="card flex items-center gap-4">
              <span className="text-2xl" aria-hidden>
                {l.icon}
              </span>
              <span className="flex-1">
                <span className="block font-semibold">{l.label}</span>
                <span className="block text-sm text-eddie-muted">{l.desc}</span>
              </span>
              <span aria-hidden className="text-eddie-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
