import './globals.css';
import type { Metadata, Viewport } from 'next';
import { StoreProvider } from '@/lib/store-context';
import AppFrame from '@/components/AppFrame';
import PwaRegister from '@/components/PwaRegister';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  title: '에디의 하루',
  description: 'ADHD 사용자가 할 일을 잊지 않고 하루를 잘 보내도록 돕는 앱 — 에디와 함께.',
  manifest: `${BASE}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '에디의 하루',
  },
  icons: {
    icon: `${BASE}/icon-192.png`,
    apple: `${BASE}/apple-touch-icon.png`,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // 시스템 폰트 확대 대응 (NFR-A-004) — 확대 차단하지 않음
  themeColor: '#3a8f8f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <StoreProvider>
          <AppFrame>{children}</AppFrame>
        </StoreProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
