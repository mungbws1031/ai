// iCalendar(.ics) 생성 — 일정을 OS 캘린더(애플/구글 등)에 넘겨 백그라운드 알림을 위임한다.
//
// 앱(PWA)은 닫히면 알림을 못 주지만, OS 캘린더에 넣으면 그쪽이 알림을 대신 해준다.
// 일정의 leadDays(7·2·1일 전)를 VALARM으로 함께 넣어 여러 번 미리 알림이 울리게 한다.

import { ScheduleEvent } from './types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' (+ 'HH:mm') → ICS 로컬 표기. 시각 없으면 종일(DATE). */
function icsStamp(date: string, time?: string): { value: string; allDay: boolean } {
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  if (time) {
    const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
    return { value: `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`, allDay: false };
  }
  return { value: `${y}${pad(m)}${pad(d)}`, allDay: true };
}

/** 종일 일정의 다음날(DTEND, exclusive) */
function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}`;
}

/** 1시간 뒤(시각 있는 일정의 DTEND) */
function plusHour(date: string, time: string): string {
  const [y, m, d] = date.split('-').map((x) => parseInt(x, 10));
  const [hh, mm] = time.split(':').map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d, hh + 1, mm);
  return `${dt.getFullYear()}${pad(dt.getMonth() + 1)}${pad(dt.getDate())}T${pad(dt.getHours())}${pad(dt.getMinutes())}00`;
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function utcStamp(now: Date): string {
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(
    now.getUTCHours(),
  )}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

function vevent(e: ScheduleEvent, stamp: string): string[] {
  const start = icsStamp(e.date, e.time);
  const lines: string[] = ['BEGIN:VEVENT', `UID:${e.id}@eddie`, `DTSTAMP:${stamp}`];
  if (start.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${start.value}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
  } else {
    lines.push(`DTSTART:${start.value}`, `DTEND:${plusHour(e.date, e.time!)}`);
  }
  lines.push(`SUMMARY:${esc(e.title)}`);

  // 미리 알림(VALARM): leadDays + 시각 있으면 당일 시작
  const triggers: string[] = (e.leadDays ?? []).filter((n) => n > 0).map((n) => `-P${n}D`);
  if (e.time) triggers.push('-PT0M'); // 시작 시각에
  triggers.forEach((trig) => {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, `TRIGGER:${trig}`, 'END:VALARM');
  });
  lines.push('END:VEVENT');
  return lines;
}

function wrap(body: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Eddie//Eddie Day//KO', 'CALSCALE:GREGORIAN', ...body, 'END:VCALENDAR'].join('\r\n');
}

export function buildEventICS(e: ScheduleEvent, now: Date): string {
  return wrap(vevent(e, utcStamp(now)));
}

export function buildCalendarICS(events: ScheduleEvent[], now: Date): string {
  const stamp = utcStamp(now);
  return wrap(events.flatMap((e) => vevent(e, stamp)));
}

/** 브라우저에서 .ics 파일 내려받기 */
export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 구글 캘린더 일정 추가 링크(단일 일정). 미리 알림은 구글 기본값 사용. */
export function googleCalUrl(e: ScheduleEvent): string {
  const start = icsStamp(e.date, e.time);
  const dates = start.allDay
    ? `${start.value}/${nextDay(e.date)}`
    : `${start.value}/${plusHour(e.date, e.time!)}`;
  const u = new URL('https://calendar.google.com/calendar/render');
  u.searchParams.set('action', 'TEMPLATE');
  u.searchParams.set('text', e.title);
  u.searchParams.set('dates', dates);
  return u.toString();
}
