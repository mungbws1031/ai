# 에디의 하루 (Eddie's Day) — MVP Alpha

ADHD 사용자의 하루 루틴 동행 앱. 시간 블라인드·복약 누락·루틴 이탈을 캐릭터 **에디**와 함께 완화한다.

> 본 구현은 `PRD-EDDIE-0.1`의 **MVP Alpha 범위(§10)** 를 **Next.js 14 + TypeScript + Tailwind** 웹앱으로 구현한 것이다.
> 데이터는 기기 로컬(localStorage)에 저장되며, 알림은 브라우저 Notification API + 인앱 스케줄링으로 동작한다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3100
npm run build    # 프로덕션 빌드
npm test         # 핵심 로직 유닛 테스트 (vitest)
```

## 화면 구성

하단 탭 6개로 구성된다.

- **오늘** (`/`) — 에디 시계, 출발 카운트다운, 오늘 약, 오늘 일정, 아침 루틴
- **루틴** (`/routines`) — 아침/저녁 루틴 빌더 + 원탭 체크인
- **달력** (`/calendar`) — 월 뷰 + 일자별 마커 + 일정 추가/완료
- **정리** (`/clean`) — 방 사진 AI 분석(BYOK)으로 시간별 청소 우선순위 제안
- **에디** (`/eddie`) — 캐릭터 반응, 너그러운 스트릭
- **더보기** (`/more`) — 복약·출발·제자리·취침·5분 정리·알림 설정·면책/개인정보
- **온보딩** (`/onboarding`) — 어려움 선택 기반 첫 설정

## 정리 도우미 — 방 사진 AI 분석 (BYOK)

`/clean` 탭은 방 사진을 올리면 **10/30/60분** 시간 예산에 맞춰 "어디부터 치우면 가장 깨끗해 보일지"
순서·소요시간·기여도(효과 큼/보통/마무리)를 제안한다.

- **모델**: `claude-opus-4-8` (vision), 구조화 출력(`output_config.format`)으로 계획을 받는다 (`lib/clean-ai.ts`).
- **BYOK**: 정적 사이트라 서버가 없어, 사용자 본인 Anthropic API 키로 브라우저에서 직접 호출한다
  (`anthropic-dangerous-direct-browser-access`). 키는 기기 localStorage에만 저장된다.
- **프라이버시**: 사진 전송 전 명시 동의를 받으며(NFR-PR-001), 사진은 분석 목적으로 Anthropic API에만
  전송되고 앱에 저장하지 않는다. 업로드 이미지는 전송 전 긴 변 1568px로 축소한다. 데이터 내보내기에서 API 키는 제외된다.
- 향후 백엔드/프록시를 두면 키 노출 없이 공용 서비스로 전환할 수 있다.

## MVP Alpha 기능 요구사항 커버리지

| FR | 내용 | 구현 위치 |
|----|------|-----------|
| FR-101 | 랜덤 빠른 시계 (5~10분, 일별, 오프셋 비노출) | `lib/clock.ts`, `components/EddieClock.tsx` |
| FR-102 | 출발 역산 알림 | `lib/departure.ts`, `app/more/departure`, `components/DepartureCard.tsx` |
| FR-104 | OS 시계 미변경, 앱 내 계산에만 오프셋 | `lib/clock.ts` (시스템 시계 미접근) |
| FR-201 | 복약 알림 설정 (시간·요일·약 이름) | `app/more/medications` |
| FR-202 | 원탭 복용 확인 | `components/MedicationToday.tsx` |
| FR-203 | 놓침 시 부드러운 재알림 + 회복(`recovered`) | `lib/store-context.tsx`, `lib/notifications.ts` |
| FR-205 | 복약 면책 고정 표시 | `components/MedDisclaimer.tsx` |
| FR-501 | 아침/저녁 루틴 빌더 (온보딩 1~2개 강제) | `app/routines`, `app/onboarding` |
| FR-502 | 원탭 루틴 체크인 + 진행률 | `components/RoutineCheckList.tsx` |
| FR-503 | 에디 캐릭터 반응 (긍정 톤) | `lib/eddie.ts`, `components/EddieBubble.tsx` |
| FR-504 | 너그러운 스트릭 (0 리셋 없음, 회복) | `lib/streak.ts`, `app/eddie` |
| FR-601 | 어려움 선택 기반 온보딩 (최대 2개) | `app/onboarding` |
| FR-602 | 알림 권한 안내 | `app/onboarding`, `app/more/notifications` |

비기능 일부도 반영: 큰 탭 타겟(≥48dp)·저자극 UI·다크모드(NFR-A), 알림 총량 상한(NFR-A-003), 로컬 우선 저장·내보내기·삭제(NFR-PR), 비난 없는 카피(NFR-W).

## 핵심 설계 노트

### 빠른 시계 (FR-101 / UO-3)
- 오프셋은 **날짜를 시드로 한 결정적 난수**로 5~10 정수 분에 매핑한다(`lib/clock.ts`). 서버 의존이 없다.
- 모듈은 **raw 오프셋을 반환하는 export를 제공하지 않는다.** 외부에는 "오프셋이 적용된 시각"만 노출되어 어떤 화면·로그에서도 정확한 분을 알 수 없다. (테스트로 검증 — `clock.test.ts`)
- 출발 카운트다운도 에디 시계 기준으로 계산해 앱 전체가 일관되게 "조금 빠르게" 느껴진다.

### 너그러운 스트릭 (FR-504)
- `total`(누적 잘 보낸 하루)은 **절대 0으로 리셋되지 않는다.**
- `momentum`(요즘 흐름)은 하루 빈칸을 **다리 놓아 이어주고**, 연속 2일 비활동에서만 쉬어가며 음수가 되지 않는다.
- 압박형 연속일수를 강조하지 않는다.

### 알림 (FR-102/201/203)
- 총량 상한·중복 방지·톤(부드럽게/단호하게)을 지킨다(`lib/notifications.ts`).
- 놓친 복약을 늦게 기록하면 `recovered` 상태로 보존한다(삭제 아님, PRD §8).

## 알려진 한계 (웹 / MVP)

- **알림 신뢰성(NFR-R-001/002)**: 브라우저 로컬 알림은 "탭이 열려 있을 때" 안정적으로 동작한다. PRD가 요구하는 OS 백그라운드/재부팅 후 알림 보장은 네이티브(React Native/Flutter) 또는 Service Worker + Web Push로 확장해야 한다. 권한이 없으면 인앱 토스트로 대체 안내한다.
- 제자리 맵·취침·5분 정리(Should/Could)와 리필·하루 회고(Could)는 본 MVP Alpha 범위 밖이다(Beta 이후).

## 테스트

`npm test` — 빠른 시계 범위/일별 갱신/오프셋 비노출, 출발 역산, 너그러운 스트릭 로직을 검증한다 (16 케이스).
