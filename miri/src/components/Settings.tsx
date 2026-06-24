import { useRef, useState } from 'react';
import { exportAll, downloadBackup, importAll, type BackupShape } from '../lib/backup';
import { useStore } from '../store';
import { seedDemoData } from '../lib/demo';
import { getApiKey, setApiKey, isLLMEnabled, setLLMEnabled } from '../lib/llm';

export function Settings({ onClose }: { onClose: () => void }) {
  const load = useStore((s) => s.load);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [apiKey, setKey] = useState(getApiKey());
  const [llmOn, setLlmOn] = useState(isLLMEnabled());

  const saveLLM = (nextKey: string, nextOn: boolean) => {
    setApiKey(nextKey);
    setLLMEnabled(nextOn);
    setKey(nextKey);
    setLlmOn(nextOn && nextKey.length > 0);
  };

  const doExport = async () => {
    const data = await exportAll();
    downloadBackup(data);
    setMsg('백업 파일을 내려받았어요.');
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupShape;
      await importAll(data, 'replace');
      await load();
      setMsg('복원했어요.');
    } catch (e) {
      setMsg(`불러오기 실패: ${(e as Error).message}`);
    }
  };

  const doDemo = async () => {
    await seedDemoData();
    await load();
    setMsg('샘플 데이터를 넣었어요. 홈을 확인해보세요.');
  };

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/30 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md space-y-3 rounded-t-3xl bg-cream p-5 shadow-card sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">설정 · 백업</h2>
          <button onClick={onClose} className="text-muted">닫기</button>
        </div>

        <p className="text-sm text-muted">
          미리는 모든 데이터를 이 기기 안에만 저장해요 (local-first). 기기를 옮길 땐 백업 파일을 쓰세요.
        </p>

        <button onClick={doExport} className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-ink shadow-card">
          ⬇︎ 백업 내보내기 (JSON)
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-ink shadow-card"
        >
          ⬆︎ 백업 불러오기 (덮어쓰기)
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />

        <button onClick={doDemo} className="w-full rounded-xl border border-dashed border-soft py-3 text-sm text-muted">
          ✨ 샘플 데이터 넣어보기
        </button>

        {/* FR-B02: 선택적 LLM 분해 (Claude API) */}
        <div className="space-y-2 rounded-xl bg-white p-4 shadow-card">
          <label className="flex items-center justify-between text-sm font-semibold text-ink">
            <span>AI로 더 똑똑하게 단계 나누기</span>
            <input
              type="checkbox"
              checked={llmOn}
              onChange={(e) => saveLLM(apiKey, e.target.checked)}
              className="h-5 w-5 accent-point"
            />
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => saveLLM(e.target.value, llmOn)}
            placeholder="Anthropic API 키 (sk-ant-…)"
            className="w-full rounded-lg border border-soft px-3 py-2 text-sm"
            autoComplete="off"
          />
          <p className="text-[11px] leading-relaxed text-muted">
            켜면 마감을 Claude(sonnet)가 분해하고, 실패하면 기본 규칙으로 자동 대체돼요. 키는
            <span className="font-semibold text-ink"> 이 기기에만</span> 저장되고 브라우저에서 직접 호출돼요.
            공용 기기에선 끄는 걸 권해요.
          </p>
        </div>

        {msg && <p className="text-center text-xs text-sage">{msg}</p>}
        <p className="pt-1 text-center text-[11px] text-muted">미리 (MVP) v0.1</p>
      </div>
    </div>
  );
}
