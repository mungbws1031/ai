import { describe, it, expect } from 'vitest';
import { parseWhen } from '../parse-when';

// 기준: 2026-06-22 (월요일)
const NOW = new Date(2026, 5, 22, 9, 0, 0);

describe('parseWhen', () => {
  it('내일/모레', () => {
    expect(parseWhen('내일 치과', NOW).date).toBe('2026-06-23');
    expect(parseWhen('모레 미팅', NOW).date).toBe('2026-06-24');
  });

  it('다음주 화요일 (이번주 월요일 기준 +7)', () => {
    // 이번주 월=06-22, 다음주 화=06-30
    const r = parseWhen('다음주 화요일 점심 약속', NOW);
    expect(r.date).toBe('2026-06-30');
    expect(r.cleanedText).toBe('점심 약속');
  });

  it('이번주 금요일', () => {
    expect(parseWhen('이번주 금요일 발표', NOW).date).toBe('2026-06-26');
  });

  it('요일 단독 → 오늘 포함 가장 가까운 요일', () => {
    // 월요일(오늘=월) → 수요일=06-24
    expect(parseWhen('수요일 회의', NOW).date).toBe('2026-06-24');
  });

  it('M월 D일 + 시각', () => {
    const r = parseWhen('7월 3일 3시 출장', NOW);
    expect(r.date).toBe('2026-07-03');
    expect(r.time).toBe('03:00');
  });

  it('오후 N시 변환', () => {
    expect(parseWhen('내일 오후 2시 미팅', NOW).time).toBe('14:00');
    expect(parseWhen('내일 3시반 약속', NOW).time).toBe('03:30');
  });

  it('HH:mm 시각', () => {
    expect(parseWhen('내일 14:30 병원', NOW).time).toBe('14:30');
  });

  it('M/D (지난 날짜는 내년)', () => {
    expect(parseWhen('6/30 모임', NOW).date).toBe('2026-06-30');
    expect(parseWhen('1/5 신년회', NOW).date).toBe('2027-01-05');
  });

  it('날짜 없으면 date undefined', () => {
    const r = parseWhen('택배 부치기', NOW);
    expect(r.date).toBeUndefined();
    expect(r.cleanedText).toBe('택배 부치기');
  });

  it('다음달 D일', () => {
    expect(parseWhen('다음달 5일 정기검진', NOW).date).toBe('2026-07-05');
  });
});
