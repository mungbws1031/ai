// FR-101 / FR-104 — 랜덤 빠른 시계
//
// 규칙:
// - 앱 내 시계는 실제보다 5~10분 빠르게 표시한다.
// - 오프셋은 "매일 1회" 결정되며, 날짜를 시드로 한 결정적 난수로 5~10 정수 분에 매핑한다.
//   (서버 의존 없이 디바이스 로컬에서 일별 시드 기반 — PRD §13)
// - OS 시스템 시계는 변경하지 않는다. 앱 내 표시·알림 계산에만 오프셋 적용(FR-104).
// - 사용자에게 정확한 오프셋 값을 어떤 화면·로그·디버그에도 노출하지 않는다(FR-101, UO-3).
//   → 이 모듈은 raw 오프셋을 반환하는 export 함수를 제공하지 않는다.
//     외부에는 "오프셋이 적용된 시각"만 노출한다.

const MIN_OFFSET = 5;
const MAX_OFFSET = 10;

/** YYYY-MM-DD (로컬 기준) */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 문자열 → 32bit 해시 (FNV-1a 변형). 결정적이며 디버그로 역산해도
// 의미를 갖지 않도록 분 매핑 전 단계에서만 사용한다.
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// 내부 전용: 날짜에 대한 오프셋(분). 절대 export 하지 않는다.
function offsetMinutesFor(d: Date): number {
  // 솔트를 섞어 날짜→분의 매핑이 자명하지 않게 한다.
  const span = MAX_OFFSET - MIN_OFFSET + 1; // 6 (5..10)
  const h = hashString(`eddie-clock::${dateKey(d)}`);
  return MIN_OFFSET + (h % span);
}

/** 오프셋이 적용된 "에디 시계" 현재 시각 (실제보다 빠름). */
export function eddieNow(real: Date = new Date()): Date {
  return new Date(real.getTime() + offsetMinutesFor(real) * 60_000);
}

/** 에디 시계 기준의 'HH:mm' 표시 문자열 */
export function formatEddieClock(real: Date = new Date()): string {
  const t = eddieNow(real);
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * 실제 시각 기준 'HH:mm' (예: 알림 시각 비교용 내부 계산).
 * 화면에 노출하면 오프셋이 역산될 수 있으므로 UI에서는 사용하지 않는다.
 */
export function formatRealClock(real: Date = new Date()): string {
  const hh = String(real.getHours()).padStart(2, '0');
  const mm = String(real.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
