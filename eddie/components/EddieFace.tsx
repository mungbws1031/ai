import { EddieMood } from '@/lib/eddie';

// 에디 마스코트(병아리) — 앱 전반에서 일관된 캐릭터.
// 탭바·앱 아이콘의 병아리와 톤을 맞춘다(노랑 #ffd54a / 부리 #ff9e3d).
// 표정은 mood별 눈/볼로 구분한다. 이모지 대신 SVG로 그려 브랜드 일관성을 유지.

const SIZES = { sm: 28, md: 40, lg: 96 } as const;

const BODY = '#ffd54a';
const EYE = '#3a3a3a';
const BEAK = '#ff9e3d';
const CHEEK = '#ff9d8a';

export default function EddieFace({
  mood = 'calm',
  size = 'md',
  className = '',
}: {
  mood?: EddieMood;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const cheeks = mood === 'happy' || mood === 'cheer' || mood === 'recover';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 64 64"
      role="img"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      {/* 머리 위 솜털 */}
      <g fill={BODY}>
        <circle cx="27" cy="13" r="3.4" />
        <circle cx="32" cy="9.5" r="3.8" />
        <circle cx="37" cy="13" r="3.4" />
      </g>
      {/* 머리/몸 */}
      <circle cx="32" cy="35" r="23" fill={BODY} />

      {/* 볼 (밝은 mood) */}
      {cheeks && (
        <g fill={CHEEK} opacity="0.5">
          <circle cx="18" cy="40" r="3.4" />
          <circle cx="46" cy="40" r="3.4" />
        </g>
      )}

      {/* 눈 */}
      {mood === 'happy' && (
        <g fill="none" stroke={EYE} strokeWidth="2.6" strokeLinecap="round">
          <path d="M20 33 q4 -5 8 0" />
          <path d="M36 33 q4 -5 8 0" />
        </g>
      )}
      {mood === 'sleepy' && (
        <g stroke={EYE} strokeWidth="2.6" strokeLinecap="round">
          <path d="M20 33 h8" />
          <path d="M36 33 h8" />
        </g>
      )}
      {(mood === 'calm' || mood === 'cheer' || mood === 'recover') && (
        <g fill={EYE}>
          <circle cx="24" cy="33" r="3.4" />
          <circle cx="40" cy="33" r="3.4" />
          <circle cx="22.9" cy="31.9" r="1.1" fill="#fff" />
          <circle cx="38.9" cy="31.9" r="1.1" fill="#fff" />
        </g>
      )}

      {/* 부리 */}
      <path d="M27 41 h10 l-5 6 z" fill={BEAK} />

      {/* 자는 표시 */}
      {mood === 'sleepy' && (
        <g fill={EYE} opacity="0.55">
          <text x="48" y="20" fontSize="10" fontFamily="sans-serif">
            z
          </text>
        </g>
      )}
    </svg>
  );
}
