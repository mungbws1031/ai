import type { Config } from 'tailwindcss';

// 저자극 UI(NFR-A-002): 채도 낮은 팔레트, 부드러운 라운드/그림자
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 에디 브랜드 — 차분한 청록/모래 톤
        eddie: {
          bg: '#f7f5f0',
          surface: '#ffffff',
          ink: '#2b2b2b',
          muted: '#6b6b6b',
          line: '#e7e3da',
          primary: '#3a8f8f',
          'primary-soft': '#dbeeee',
          accent: '#e0a96d',
          calm: '#8fb3a6',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      // 큰 탭 타겟(NFR-A-001/002, ≥48dp)
      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
