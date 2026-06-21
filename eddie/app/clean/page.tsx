'use client';

import { useRef, useState } from 'react';
import { useStore } from '@/lib/store-context';
import { analyzeRoom, fileToResizedBase64, CleanPlan, Impact } from '@/lib/clean-ai';
import PageHeader from '@/components/PageHeader';
import EddieBubble from '@/components/EddieBubble';
import Link from 'next/link';

const BUDGETS = [10, 30, 60];

const IMPACT_LABEL: Record<Impact, string> = { high: '효과 큼', medium: '효과 보통', low: '마무리' };
const IMPACT_CLASS: Record<Impact, string> = {
  high: 'bg-eddie-primary text-white',
  medium: 'bg-eddie-primary-soft text-eddie-primary',
  low: 'bg-eddie-line text-eddie-muted',
};

export default function CleanPage() {
  const { state } = useStore();
  const hasKey = !!state.settings.apiKey;
  const consented = state.settings.aiConsent;

  const [minutes, setMinutes] = useState(10);
  const [preview, setPreview] = useState<string | null>(null);
  const [image, setImage] = useState<{ data: string; mediaType: string } | null>(null);
  const [plan, setPlan] = useState<CleanPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPlan(null);
    setPreview(URL.createObjectURL(file));
    try {
      const resized = await fileToResizedBase64(file);
      setImage(resized);
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지를 처리하지 못했어.');
      setImage(null);
    }
  }

  async function analyze() {
    if (!image) return;
    setLoading(true);
    setError(null);
    setPlan(null);
    try {
      const result = await analyzeRoom({
        apiKey: state.settings.apiKey,
        imageData: image.data,
        mediaType: image.mediaType,
        minutes,
        tone: state.settings.tone,
      });
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석에 실패했어.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4">
      <PageHeader title="정리 도우미" subtitle="방 사진을 올리면, 주어진 시간에 어디부터 치울지 알려줄게." />

      {/* BYOK 설정 (키가 없거나 동의 전이면 안내) */}
      {(!hasKey || !consented) && <Setup hasKey={hasKey} consented={consented} />}

      {hasKey && consented && (
        <>
          {/* 시간 예산 선택 */}
          <section className="card mb-4">
            <p className="mb-2 font-semibold">시간이 얼마나 있어?</p>
            <div className="flex gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setMinutes(b);
                    setPlan(null);
                  }}
                  aria-pressed={minutes === b}
                  className={`min-h-tap flex-1 rounded-xl border text-sm font-semibold ${
                    minutes === b
                      ? 'border-eddie-primary bg-eddie-primary-soft text-eddie-primary'
                      : 'border-eddie-line text-eddie-muted'
                  }`}
                >
                  {b < 60 ? `${b}분` : '1시간'}
                </button>
              ))}
            </div>
          </section>

          {/* 사진 업로드 */}
          <section className="card mb-4">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onPick}
            />
            {preview ? (
              <button onClick={() => fileRef.current?.click()} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="방 사진 미리보기" className="max-h-64 w-full rounded-xl object-cover" />
                <span className="mt-2 block text-center text-sm text-eddie-primary">다른 사진 고르기</span>
              </button>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="btn-soft w-full py-8 text-base">
                📷 방 사진 올리기
              </button>
            )}
            <p className="mt-2 text-center text-xs text-eddie-muted">
              사진은 분석에만 쓰이고 앱에 저장되지 않아.
            </p>
          </section>

          <button
            onClick={analyze}
            disabled={!image || loading}
            className="btn-primary mb-4 w-full disabled:opacity-40"
          >
            {loading ? '에디가 보는 중… 👀' : `${minutes < 60 ? `${minutes}분` : '1시간'} 계획 받기`}
          </button>

          {error && (
            <div className="card mb-4 border-eddie-accent/40 bg-eddie-accent/10">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {plan && <PlanView plan={plan} />}
        </>
      )}
    </div>
  );
}

function PlanView({ plan }: { plan: CleanPlan }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="card">
        <EddieBubble line={{ mood: 'cheer', text: plan.overall }} size="sm" />
      </section>

      {plan.tasks.length > 0 ? (
        <section className="card">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">이 순서로 해보자</p>
            <span className="text-sm text-eddie-muted">총 약 {plan.totalMinutes}분</span>
          </div>
          <ol className="flex flex-col gap-2">
            {plan.tasks.map((t) => (
              <li
                key={t.order}
                className="flex items-start gap-3 rounded-xl border border-eddie-line p-3 dark:border-neutral-700"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-eddie-primary text-sm font-bold text-white">
                  {t.order}
                </span>
                <div className="flex-1">
                  <p className="font-medium">
                    {t.area} <span className="text-eddie-muted">· {t.minutes}분</span>
                  </p>
                  <p className="text-sm text-eddie-muted">{t.action}</p>
                </div>
                <span className={`chip shrink-0 border-0 text-xs ${IMPACT_CLASS[t.impact]}`}>
                  {IMPACT_LABEL[t.impact]}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="card">
          <p className="text-sm text-eddie-muted">방이 잘 보이는 사진으로 다시 시도해줄래?</p>
        </section>
      )}

      <div className="flex items-center justify-between px-1">
        <EddieBubble line={{ mood: 'happy', text: plan.eddie }} size="sm" />
        <Link href="/more/tidy" className="shrink-0 text-sm text-eddie-primary">
          타이머 ▶
        </Link>
      </div>
    </div>
  );
}

function Setup({ hasKey, consented }: { hasKey: boolean; consented: boolean }) {
  const { updateSettings, state } = useStore();
  const [key, setKey] = useState(state.settings.apiKey);

  return (
    <section className="card mb-4 flex flex-col gap-3">
      <p className="font-semibold">정리 도우미 켜기</p>
      <p className="text-sm text-eddie-muted">
        사진 분석은 <strong>네 Anthropic API 키</strong>로 동작해. 키는 이 기기에만 저장되고, 사진은 분석을 위해
        Anthropic으로만 전송돼(앱에 저장 안 함).
      </p>

      <div>
        <p className="mb-1 text-xs text-eddie-muted">Anthropic API 키</p>
        <input
          className="field"
          type="password"
          placeholder="sk-ant-..."
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-eddie-primary"
        >
          키 발급받기 ↗
        </a>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 accent-eddie-primary"
          checked={consented}
          onChange={(e) => updateSettings({ aiConsent: e.target.checked })}
        />
        <span>사진을 분석을 위해 Anthropic으로 전송하는 데 동의해.</span>
      </label>

      <button
        onClick={() => updateSettings({ apiKey: key.trim() })}
        disabled={!key.trim()}
        className="btn-primary disabled:opacity-40"
      >
        {hasKey ? '키 업데이트' : '키 저장'}
      </button>
    </section>
  );
}
