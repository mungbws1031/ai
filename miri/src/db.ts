import Dexie, { type Table } from 'dexie';
import type { Chore, Reminder, SomedaySeed, Subtask, Task } from './types';

// local-first 저장소 (NFR-D-01). 정본은 IndexedDB(Dexie).
export class MiriDB extends Dexie {
  tasks!: Table<Task, string>;
  subtasks!: Table<Subtask, string>;
  reminders!: Table<Reminder, string>;
  seeds!: Table<SomedaySeed, string>;
  chores!: Table<Chore, string>;

  constructor() {
    super('miri-db');
    this.version(1).stores({
      tasks: 'id, dueDate, status, type, createdAt',
      subtasks: 'id, taskId, scheduledDate, status',
      reminders: 'id, taskId, subtaskId, fireAt, status, stage',
      seeds: 'id, status, revisitAt, createdAt',
    });
    // v2: 집안일 주기 모듈 (D)
    this.version(2).stores({
      chores: 'id, lastDoneAt, createdAt',
    });
  }
}

export const db = new MiriDB();
