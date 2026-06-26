import { db } from '../db';
import type { Reminder, SomedaySeed, Subtask, Task } from '../types';

// NFR-D-01: 데이터 export/import (JSON)
export interface BackupShape {
  app: 'miri';
  version: 1;
  exportedAt: string;
  tasks: Task[];
  subtasks: Subtask[];
  reminders: Reminder[];
  seeds: SomedaySeed[];
}

export async function exportAll(): Promise<BackupShape> {
  const [tasks, subtasks, reminders, seeds] = await Promise.all([
    db.tasks.toArray(),
    db.subtasks.toArray(),
    db.reminders.toArray(),
    db.seeds.toArray(),
  ]);
  return { app: 'miri', version: 1, exportedAt: new Date().toISOString(), tasks, subtasks, reminders, seeds };
}

export async function importAll(data: BackupShape, mode: 'replace' | 'merge' = 'replace'): Promise<void> {
  if (data.app !== 'miri') throw new Error('미리 백업 파일이 아니에요.');
  await db.transaction('rw', db.tasks, db.subtasks, db.reminders, db.seeds, async () => {
    if (mode === 'replace') {
      await Promise.all([db.tasks.clear(), db.subtasks.clear(), db.reminders.clear(), db.seeds.clear()]);
    }
    await db.tasks.bulkPut(data.tasks ?? []);
    await db.subtasks.bulkPut(data.subtasks ?? []);
    await db.reminders.bulkPut(data.reminders ?? []);
    await db.seeds.bulkPut(data.seeds ?? []);
  });
}

export function downloadBackup(data: BackupShape): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `miri-backup-${data.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 데이터 유실 방지: 마지막 백업 시점 추적 + 부드러운 백업 권유.
// local-first라 데이터가 이 기기에만 있으므로, 주기적으로 백업을 권한다.
const LAST_BACKUP_KEY = 'miri.backup.lastAt';
const SNOOZE_KEY = 'miri.backup.snoozeUntil';
const STALE_DAYS = 7;
const DAY_MS = 86400000;

export function markBackedUp(now: Date = new Date()): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, now.toISOString());
    localStorage.removeItem(SNOOZE_KEY);
  } catch {
    /* noop */
  }
}

export function getLastBackupAt(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

export function snoozeBackup(days = 3, now: Date = new Date()): void {
  try {
    localStorage.setItem(SNOOZE_KEY, new Date(now.getTime() + days * DAY_MS).toISOString());
  } catch {
    /* noop */
  }
}

/**
 * 백업을 권할지 판단한다. 데이터가 있고, (한 번도 백업 안 했거나 STALE_DAYS 초과)이며,
 * 스누즈 중이 아닐 때 true. lastBackupAt/snoozeUntil은 주입 가능(테스트용).
 */
export function needsBackup(
  hasData: boolean,
  now: Date = new Date(),
  lastAt: string | null = getLastBackupAt(),
  snoozeUntil: string | null = (() => {
    try {
      return localStorage.getItem(SNOOZE_KEY);
    } catch {
      return null;
    }
  })(),
): boolean {
  if (!hasData) return false;
  if (snoozeUntil && new Date(snoozeUntil).getTime() > now.getTime()) return false;
  if (!lastAt) return true;
  return now.getTime() - new Date(lastAt).getTime() > STALE_DAYS * DAY_MS;
}

// 한 번에 export → 다운로드 → 백업 시점 기록
export async function backupNow(): Promise<void> {
  const data = await exportAll();
  downloadBackup(data);
  markBackedUp();
}
