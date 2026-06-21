// FR-503 / NFR-W-001 / 에디 톤 가이드 (§7.3)
// 에디는 응원단·동행자. 잔소리꾼 금지. 실패 시에도 긍정 톤 + 회복 유도.
// 모든 카피는 비난·죄책감 표현을 쓰지 않는다.

export type EddieMood = 'happy' | 'cheer' | 'calm' | 'recover' | 'sleepy';

export interface EddieLine {
  mood: EddieMood;
  text: string;
}

const POOL: Record<EddieMood, string[]> = {
  // 성공/완료 — 함께 기뻐함
  happy: [
    '좋아! 같이 해냈다 🎉',
    '오늘 너 진짜 멋지다.',
    '한 칸 또 채웠네. 기분 좋다!',
  ],
  // 진행 중 응원
  cheer: [
    '하나씩, 우리 페이스대로 가자.',
    '딱 이거 하나만. 내가 옆에 있을게.',
    '시작이 제일 어려운데 벌써 했네.',
  ],
  // 차분한 동행
  calm: [
    '천천히 해도 괜찮아.',
    '지금 여기, 이거 하나면 돼.',
    '서두르지 말고, 같이 가자.',
  ],
  // 실패/놓침 — 회복 유도 (비난 없음)
  recover: [
    '괜찮아, 지금 하면 돼.',
    '놓쳐도 하루는 안 무너져. 다시 가볍게 가자.',
    '오늘은 여기서부터. 충분히 잘하고 있어.',
  ],
  // 취침
  sleepy: [
    '오늘 수고 많았어. 이제 좀 쉬자.',
    '내일 또 같이 시작하자. 잘 자!',
  ],
};

// 결정적 선택(시드)로 동일 맥락에서 카피가 덜 튀게 한다.
function pick(arr: string[], seed: number): string {
  return arr[Math.abs(seed) % arr.length];
}

export function eddieLine(mood: EddieMood, seed = Date.now()): EddieLine {
  return { mood, text: pick(POOL[mood], seed) };
}

/** 진행률(0~1)에 맞는 에디 반응 (FR-502/503) */
export function eddieForProgress(done: number, total: number): EddieLine {
  if (total === 0) return eddieLine('calm', total);
  if (done === 0) return eddieLine('cheer', done + total);
  if (done >= total) return eddieLine('happy', done * 7 + total);
  return eddieLine('cheer', done * 3 + total);
}

/** 에디 표정 이모지 (간단한 시각 표현) */
export function eddieFace(mood: EddieMood): string {
  switch (mood) {
    case 'happy':
      return '😊';
    case 'cheer':
      return '💪';
    case 'calm':
      return '🙂';
    case 'recover':
      return '🤗';
    case 'sleepy':
      return '😴';
  }
}
