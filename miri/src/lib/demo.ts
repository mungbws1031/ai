import { addDays, format } from 'date-fns';
import { db } from '../db';
import { useStore } from '../store';

const d = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd');

// PRD §4.1 시나리오 S1·S2·S3를 오늘 기준으로 재현한 샘플 데이터.
export async function seedDemoData(): Promise<void> {
  // 초기화
  await Promise.all([db.tasks.clear(), db.subtasks.clear(), db.reminders.clear(), db.seeds.clear()]);

  const { createTask, createSeed } = useStore.getState();

  // S1: 어린이집 학부모 상담 (모레) — D-1 리마인더가 오늘 떠야 함
  await createTask({ title: '어린이집 학부모 상담', type: 'appointment', dueDate: d(2) });

  // S2: 분기 보고서 (3주 뒤) — 역산 단계 자동 배치
  await createTask({ title: '분기 보고서', type: 'deadline', dueDate: d(22), decompose: true });

  // 가까운 마감 하나 더 — 홈 카드 채우기
  await createTask({ title: '아이 예방접종 예약', type: 'appointment', dueDate: d(1) });

  // S3: 내년 여름 가족여행 — 되묻기 시점을 어제로 두어 홈에서 바로 묻게 함
  await createSeed({
    text: '내년 여름 가족여행 가고싶다',
    season: 'summer',
    target: '가족',
    vagueness: 'high',
    revisitAt: addDays(new Date(), -1).toISOString(),
  });

  // 아직 잠들어 있는 seed
  await createSeed({ text: '주말에 등산 다시 시작하기', season: 'fall' });
}
