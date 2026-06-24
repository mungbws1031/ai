import type { Config } from 'tailwindcss';

// 따뜻한 워킹맘 톤: 배경 Off-White/소프트, SU Red 계열은 포인트로만.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF8F4',
        soft: '#F2ECE3',
        ink: '#3A332E',
        muted: '#8A8077',
        point: '#C8453B', // SU Red 계열 (포인트 전용)
        'point-soft': '#F6E4E0',
        sage: '#6B8E7F', // 보조 (완료/긍정)
        amber: '#D98E3C', // stage 2 환기
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Pretendard', 'Apple SD Gothic Neo', 'sans-serif'],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 2px 14px rgba(58, 51, 46, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
