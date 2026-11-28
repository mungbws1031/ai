# 내레이션 작업실 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 원고를 줄 단위(직접 녹음 또는 ElevenLabs AI)로 만들어 화자별 효과를 걸고 WAV 한 개 + 자막 SRT로 내보내는 '내레이션' 탭.

**Architecture:** 기존 단일 `voice-maker/index.html`에 세 번째 탭을 추가한다. 효과 엔진 `buildGraph`를 전역 `fx` 대신 설정 객체를 받도록 바꿔 화자마다 재사용한다. 원고·화자·줄 메타는 localStorage, 오디오(녹음/AI 결과)는 IndexedDB.

**Tech Stack:** 바닐라 JS, Web Audio(OfflineAudioContext), MediaRecorder, IndexedDB, fetch(ElevenLabs REST), Node Playwright 회귀 테스트.

**Spec:** `docs/superpowers/specs/2026-11-28-voice-maker-narration-design.md`

## Global Constraints
- 단일 `index.html` PWA, 빌드 도구·서버·외부 라이브러리 없음.
- ElevenLabs: `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` 본문 `{"text", "model_id":"eleven_multilingual_v2"}`, 헤더 `xi-api-key`, 응답 audio/mpeg. 목록 `GET /v1/voices`, 남은 글자 `GET /v1/user/subscription` (`character_limit - character_count`).
- API 키는 localStorage `vm-el-key`에만. 화면 표시는 앞 4자 + `••••`.
- AI 생성 전 "N줄, M자" 확인. 텍스트·AI 목소리가 같은 줄은 재생성하지 않는다.
- 직접 녹음 오디오는 네트워크로 보내지 않는다.
- 쉼 기본: 문장 뒤 0.4초, 문단 끝 0.9초. 출력 WAV(모노 16bit), SRT `HH:MM:SS,mmm`.

## Review Focus
- 줄 일부만 오디오가 있을 때 내보내기 → 빈 줄은 건너뛰고 "N줄이 비어 있어요" 안내, 파일은 만든다.
- 네트워크/CORS 실패(fetch TypeError) → "브라우저에서 ElevenLabs에 연결하지 못했어요" + 대안 안내, 앱은 계속 동작.
- 401(잘못된 키)·429/402(한도 초과) → 원인별 문구, 해당 줄 상태 '실패'.
- 화자 삭제 시 그 화자를 쓰던 줄 → 기본 내레이터로 바뀜.
- 새로고침 후 오디오 복원(IndexedDB) 및 원고 수정 시 해당 줄 오디오 무효화.

---

### Task 1: 효과 엔진 설정 인자화
**Files:** Modify `voice-maker/index.html` (`buildGraph`, `tailSec`, `fxSave`, `playFx`)
**Interfaces:** Produces `buildGraph(ctx, buffer, dest, s = fx)`, `tailSec(s = fx)`, `renderFx(buffer, s) -> Promise<AudioBuffer>` (OfflineAudioContext 렌더, 기존 WAV 저장도 이것 사용).
- [ ] 기존 회귀 테스트 통과 확인(기준선) → 리팩터 → 다시 통과 → 커밋.

### Task 2: 데이터·저장소
**Interfaces:** Produces
- `splitScript(text) -> Line[]`, `Line = {id, text, speakerId, source:'ai'|'rec', pause, audioKey:null|string, aiSig:null|string, status:'empty'|'ready'|'busy'|'error'}`; 문장 끝(. ! ? 。 … 및 닫는 따옴표 포함)과 줄바꿈으로 나눔, 빈 줄(문단 경계) 앞 줄 pause 0.9.
- `Speaker = {id, name, fx:{pitch,echo,breath,nasal,eq[7],type}, aiVoiceId:null|string}`; 기본 `{id:'narrator', name:'내레이터'}`.
- `narr` 상태 `{lines, speakers}` ↔ localStorage `vm-narration`; `idb.put(key, Blob)`, `idb.get(key)`, `idb.del(key)` (DB `voice-maker`, store `audio`).
- [ ] 테스트: `splitScript('옛날 옛적에. "안녕!" 했어요.\n\n끝.')` → 3줄+1줄, 마지막 문단 앞 pause 0.9.

### Task 3: 화자 패널
- 목록·추가·이름 변경·삭제(내레이터 삭제 불가; 삭제 시 줄 재지정), 효과는 "캐릭터 프리셋 고르기"(기존 FX_PRESETS) + "'내 목소리 바꾸기' 지금 설정 가져오기", AI 목소리 선택(목록 불러온 뒤).
- [ ] 테스트: 화자 '토끼' 추가 → 헬륨 → 줄에 지정 → 토끼 삭제 시 줄이 내레이터로.

### Task 4: 줄 목록
- 줄마다: 번호, 화자 select, 텍스트(수정 가능, 바뀌면 오디오 무효), 소스 토글(AI/녹음), 녹음 버튼(녹음 중 다시 누르면 끝), ▶ 미리듣기(화자 효과 적용), 쉼 숫자, 다음 줄과 합치기, 삭제, 상태 표시.
- [ ] 테스트: 가짜 마이크로 2줄 녹음 → 상태 ready → 새로고침 후에도 ready.

### Task 5: ElevenLabs 연결
**Interfaces:** `el.voices(key) -> [{voice_id,name}]`, `el.remaining(key) -> number|null`, `el.tts(key, voiceId, text) -> Blob`; 에러는 `Error` with `.kind` ∈ `network|auth|quota|other`.
- 'AI 설정': 키 입력/지우기, 목록 불러오기, 남은 글자 표시.
- "빈 AI 줄 모두 생성 (N줄, M자)" → confirm → 순차 생성. aiSig = voiceId+'|'+text.
- [ ] 테스트(page.route 가짜 응답): 목록 → 생성 2줄 → 같은 버튼 다시 누르면 0줄; 401 → '키를 확인' 문구; route abort → 연결 실패 문구.

### Task 6: 전체 듣기·내보내기
**Interfaces:** `renderNarration() -> {buffer, cues:[{start,end,text}], skipped}`; `toSrt(cues) -> string`.
- 줄 오디오 decode → `renderFx(buffer, speaker.fx)` → 쉼 포함 이어붙이기(44.1k 모노 리샘플은 OfflineAudioContext로).
- 전체 듣기(현재 줄 강조), WAV 저장 `narration-<ts>.wav`, SRT 저장 `narration-<ts>.srt`.
- [ ] 테스트: 녹음 1줄 + AI 1줄 → WAV 길이 ≈ 합+쉼, SRT 2개 큐, 시간 오름차순; 빈 줄 있으면 skipped 안내.

### Task 7: 마무리
- sw 캐시 버전 올림, README·AGENTS 설명 갱신, 전체 회귀 테스트 통과, 스크린샷 확인(PC/폰), 커밋·푸시.
