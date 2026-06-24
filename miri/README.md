# 미리 (MVP v0.1) — ADHD 워킹맘을 위한 외장 전두엽

> "미리 알려준다 + 미리미리." 잊어버리기 전에 앱이 **먼저 말 거는** 선제적 스케줄러.
> PRD: `PRD-MIRI-MVP-v0.1`. 이 디렉토리는 자체 완결형 PWA (local-first, 비출시).

ADHD 워킹맘의 두 가지 인지 실패 — **미래 망각**과 **착수 불능** — 을 겨냥한 코어 엔진 3개를 구현했다.

## 코어 엔진 (A·B·C)

| 엔진 | 내용 | 핵심 코드 |
|------|------|-----------|
| **A. 3-Step 리마인더** | 일정 등록 시 D-7/D-3/D-1 리마인더 자동 생성, 단계별 톤 에스컬레이션(순함→환기→다정한 재촉), 무죄책 스누즈 | `src/lib/reminders.ts`, `src/lib/tone.ts` |
| **B. 역산 스케줄러** | 마감만 입력하면 서브태스크로 분해해 **마감 기준 역방향**으로 캘린더에 배치. 주말·공휴일·기존 일정 충돌 자동 회피. 각 단계에 A 리마인더 자동 연결. 여행 전용 템플릿(D-150~) | `src/lib/scheduler.ts`, `src/lib/templates.ts` |
| **C. Someday 보관함** | 막연한 생각을 한 줄로 저장. 시즌 기반 되묻기 시점 추정(여름→직전 봄). 때가 되면 홈에서 "그거 진행할까?" 먼저 묻고 Yes → B 엔진으로 전달 | `src/lib/someday.ts` |

## 화면 (3 탭 + 빠른추가)

- **홈** — 오늘 떠야 할 카드 큐 (리마인더 + Someday 프롬프트). 동시 노출 ≤ 3장, 나머지는 "더 있어요(N)".
- **캘린더** — 역산 배치 결과를 날짜별 아젠다로. 서브태스크 완료 체크 / 날짜 옮기기.
- **보관함** — Someday seed 목록 + "막연한 생각 담기" 빠른 입력.
- **＋ 빠른 추가** — 어디서든. 제목+날짜만으로 즉시 등록, 세부 설정은 점진 공개.

## 기술 스택

React 18 + TypeScript + Vite · Zustand · **Dexie(IndexedDB, local-first)** · date-fns · Tailwind · vite-plugin-pwa(Service Worker 푸시 준비).

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm test           # 코어 엔진 유닛 테스트 (FR-A/B/C 검증)
npm run build      # 타입체크 + 프로덕션 빌드(PWA)
npm run preview    # 빌드 결과 미리보기
```

처음 켜면 설정(⚙︎) → **"샘플 데이터 넣어보기"** 로 PRD 시나리오(S1 상담 / S2 분기 보고서 / S3 가족여행)를 바로 볼 수 있다.

## 앱으로 쓰기

미리는 두 가지 방식으로 "앱"이 된다.

### 1) PWA 설치 (지금 바로, 빌드 불필요)
폰 브라우저로 열면 하단에 **"앱으로 설치할까요?"** 배너가 뜬다.
- **Android/Chrome**: "설치하기" → 홈 화면에 추가되어 전체화면 standalone 으로 실행.
- **iOS/Safari**: 공유 → "홈 화면에 추가". (iOS는 OS 정책상 자동 설치 프롬프트 없음 → 수동 안내)

설치하면 오프라인 동작 + 한 탭 실행. 별도 스토어/빌드 도구 없이 동작한다.

### 2) Capacitor 네이티브 앱 (Android / iOS)
기존 웹 빌드(`dist`)를 [Capacitor](https://capacitorjs.com)로 네이티브 셸에 담는다.
**OS 로컬 알림**으로 앱이 닫혀 있어도 리마인더가 발송된다 (FR-A07, `src/lib/native.ts`).

```bash
# Android (Android Studio + SDK 필요)
npm run android:open        # 빌드 → 동기화 → Android Studio 열기
npm run android:apk         # 디버그 APK 빌드 (android/app/build/outputs/apk/debug/)

# iOS (macOS + Xcode + CocoaPods 필요)
npx cap add ios             # 최초 1회 (Mac에서)
npm run ios:open            # 빌드 → 동기화 → Xcode 열기
```

> **참고**: 안드로이드 네이티브 프로젝트(`android/`)는 저장소에 포함되어 있다.
> iOS 프로젝트(`ios/`)는 macOS에서 `npx cap add ios`로 생성한다(빌드에 Mac 필수).
> 웹 자산을 바꾼 뒤에는 `npm run cap:sync`로 네이티브에 반영한다.

## ADHD-UX 원칙 (NFR)

- **무죄책 톤**: 미처리·지연 시 압박 카피 금지. 마스코트 톤 일관.
- **원클릭**: 카드 처리 1탭. 입력은 최소 필드부터.
- **선제성**: 홈이 곧 알림판 — 사용자가 찾아오기 전에 앱이 먼저 꺼낸다.
- **local-first**: 오프라인 완전 동작. 데이터 export/import(JSON) 제공.
- **접근성**: 색상 단독 정보 금지(단계는 텍스트 배지 병기), 또렷한 포커스 링.

## 데이터 / 백업

모든 데이터는 기기 안 IndexedDB에만 저장된다. 설정에서 JSON 백업 내보내기/불러오기로 기기 이전 가능.

## AI로 단계 나누기 (선택, FR-B02 두 번째 경로)

설정(⚙︎)에서 **"AI로 더 똑똑하게 단계 나누기"**를 켜고 Anthropic API 키를 넣으면,
마감을 규칙 템플릿 대신 Claude(`claude-sonnet-4-6`)가 분해한다 (`src/lib/llm.ts`).
- 호출 실패·키 오류·CORS 시 **규칙 템플릿으로 자동 fallback** — 항상 동작.
- 키는 **이 기기 localStorage에만** 저장되고 브라우저에서 직접 호출(SDK는 사용 시점에만 동적 로드).
  공용 기기에선 끄는 걸 권장 (PRD Q1 키 노출 고려).

## 앱 아이콘 재생성

브랜드 아이콘(미리 마크)은 순수 stdlib 스크립트로 생성한다 (외부 의존성 없음).
```bash
python3 gen_icons.py          # public/ PWA 아이콘 (192/512)
python3 gen_android_icons.py  # android/ 런처 아이콘 (전 해상도 + adaptive)
python3 gen_app_assets.py     # @capacitor/assets용 소스(assets/) — 필요 시
```

## MVP 범위 메모

- LLM 분해는 위 설정으로 실연결됨. 규칙 템플릿이 항상 fallback (PRD Q1).
- PWA 푸시(FR-A07)는 매니페스트/Service Worker까지 준비. 백그라운드 Notification 발송은 Phase 2.
- 가족공유·외부앱연동·호르몬 모듈은 Non-Goal (Phase 2+).
