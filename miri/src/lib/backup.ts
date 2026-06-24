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
