// FR-205 / NG2 / R-03 — 복약 면책 고정 표시
export default function MedDisclaimer() {
  return (
    <p className="rounded-xl2 border border-eddie-accent/40 bg-eddie-accent/10 px-4 py-3 text-xs leading-relaxed text-eddie-ink dark:text-eddie-bg">
      ⚠️ 본 앱은 의료기기가 아니며 처방을 대체하지 않습니다. 복약 기능은 알림·기록 보조용입니다.
    </p>
  );
}
