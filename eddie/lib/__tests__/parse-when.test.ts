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

  it('잘못된 날짜는 무시한다', () => {
    expect(parseWhen('2월 30일 약속', NOW).date).toBeUndefined();
    expect(parseWhen('13/40 모임', NOW).date).toBeUndefined();
    expect(parseWhen('이번달 31일 정산', NOW).date).toBeUndefined(); // 6월은 30일까지
  });

  it("'시간'은 시각으로 잡지 않는다", () => {
    expect(parseWhen('2시간 공부', NOW).time).toBeUndefined();
  });

  it('매칭된 위치만 잘라내 제목을 보존한다', () => {
    expect(parseWhen('다음주 화요일 점심 약속', NOW).cleanedText).toBe('점심 약속');
  });

  it('N일/N주/N개월/N년 뒤·후 (숫자)', () => {
    // 기준 2026-06-22
    expect(parseWhen('3일 뒤 세금 신고', NOW).date).toBe('2026-06-25');
    expect(parseWhen('2주 후 발표 준비', NOW).date).toBe('2026-07-06');
    expect(parseWhen('1개월 후 정기검진', NOW).date).toBe('2026-07-22');
    expect(parseWhen('1년 뒤 갱신', NOW).date).toBe('2027-06-22');
  });

  it('한 달 뒤 (한글 수사, 공백 있어도 인식)', () => {
    const r = parseWhen('한달뒤 비자 갱신', NOW);
    expect(r.date).toBe('2026-07-22');
    expect(r.cleanedText).toBe('비자 갱신');

    expect(parseWhen('두 달 뒤 이사', NOW).date).toBe('2026-08-22');
  });

  it('월말 기준 개월 계산은 말일로 클램프한다', () => {
    const endOfMonth = new Date(2026, 0, 31, 9, 0, 0); // 2026-01-31
    expect(parseWhen('1달 뒤 정산', endOfMonth).date).toBe('2026-02-28');
  });

  it('일주일 뒤(=7일), 보름 뒤(=15일)', () => {
    expect(parseWhen('일주일 뒤 회의', NOW).date).toBe('2026-06-29');
    expect(parseWhen('보름 후 결과 확인', NOW).date).toBe('2026-07-07');
  });

  it("'3일 뒤'는 '3일(날짜)'로 오인하지 않는다", () => {
    // 뒤/후가 없는 'D일'은 여전히 '이번달 D일'로 해석돼야 한다(기존 동작 유지)
    expect(parseWhen('23일 정산', NOW).date).toBe('2026-06-23');
  });
});
