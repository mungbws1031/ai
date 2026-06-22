'use client';

import { EddieLine } from '@/lib/eddie';
import EddieFace from './EddieFace';

// 에디 캐릭터 말풍선 (FR-503). 성공·진행·실패 모든 이벤트에 긍정 톤 유지.
export default function EddieBubble({ line, size = 'md' }: { line: EddieLine; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-3">
      <EddieFace mood={line.mood} size={size} />
      <p className="rounded-xl2 bg-eddie-primary-soft px-4 py-2 text-sm font-medium text-eddie-primary dark:bg-eddie-primary/20">
        {line.text}
      </p>
    </div>
  );
}
