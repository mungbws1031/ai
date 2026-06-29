'use client';

import { useRef } from 'react';
import { useStore } from '@/lib/store-context';
import { exportState } from '@/lib/storage';
import PageHeader from '@/components/PageHeader';
import MedDisclaimer from '@/components/MedDisclaimer';
import BackLink from '@/components/BackLink';

// 면책(FR-205) · 개인정보(NFR-PR-001/002) · 다크모드(NFR-A-002)
export default function AboutPage() {
  const { state, updateSettings, resetAll, importState, pushToast } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);

  async function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('백업 파일로 현재 데이터를 덮어쓸까? (현재 기기 데이터는 사라져)')) return;
    const text = await file.text();
    pushToast(importState(text) ? '백업을 복원했어 🐣' : '파일을 읽지 못했어. 올바른 백업인지 확인해줘.');
  }

  function doExport() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eddie-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function doReset() {
    if (confirm('모든 데이터를 지울까? 되돌릴 수 없어. (네 잘못이 아니야, 그냥 새로 시작하는 거야)')) {
      resetAll();
    }
  }

  return (
    <div className="px-4">
      <BackLink />
      <PageHeader title="면책 · 개인정보" />

      <section className="card mb-4">
        <p className="mb-2 font-semibold">의료 면책</p>
        <MedDisclaimer />
        <p className="mt-3 text-xs leading-relaxed text-eddie-muted">
          에디의 하루는 진단·치료·처방을 제공하지 않습니다. 복약·수면 관련 결정은 반드시 의료 전문가와 상의하세요.
        </p>
      </section>

      <section className="card mb-4">
        <p className="font-semibold">개인정보</p>
        <p className="mt-2 text-sm text-eddie-muted">
          복약·수면 등 모든 기록은 이 기기(브라우저)에만 저장돼. 외부로 전송하지 않아.
        </p>
        <div className="mt-3 flex gap-2">
          <button onClick={doExport} className="btn-soft flex-1 text-sm">
            백업 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-soft flex-1 text-sm">
            백업 복원
          </button>
        </div>
        <button onClick={doReset} className="btn-ghost mt-2 w-full text-sm text-red-500">
          데이터 삭제
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} />
        <p className="mt-2 text-xs text-eddie-muted">기기를 옮길 때: 한쪽에서 내보내고 다른 쪽에서 복원하면 돼. (API 키는 보안상 빠지고 기기에 그대로 남아)</p>
      </section>

      <section className="card">
        <label className="flex items-center justify-between">
          <span className="font-semibold">다크 모드</span>
          <input
            type="checkbox"
            className="h-6 w-6 accent-eddie-primary"
            checked={state.settings.darkMode}
            onChange={(e) => updateSettings({ darkMode: e.target.checked })}
          />
        </label>
      </section>

      <p className="mt-6 px-2 text-center text-xs text-eddie-muted">에디의 하루 v0.1 (MVP Alpha)</p>
    </div>
  );
}
