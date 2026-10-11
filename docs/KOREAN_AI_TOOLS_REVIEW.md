# 한국어 AI 도구 도입 검토

세 가지 오픈소스 도구를 이 저장소의 앱에 붙일 수 있는지 검토한 메모입니다.

> **검증 한계**: 작성 시점에 GitHub 접근이 막혀 각 저장소를 직접 열어 보지 못했습니다.
> 도구 설명은 소개 글 기준이며, 실제 API·라이선스·최신 사용법은 도입 전에 확인해야 합니다.

## 대상 도구

| 도구 | 설명 | 저장소 |
|---|---|---|
| korean-law-mcp | 법제처 Open API 연동 MCP 서버. 법령·판례·조례 검색과 인용 검증 | chrisryugj/korean-law-mcp |
| kordoc | 관공서 문서용 마크다운 파서. HWP·HWPX·PDF 표 구조 파싱, HWPX 역변환 | chrisryugj/kordoc |
| k-skill | 한국 생활·업무 자동화 에이전트 스킬 모음 (재고, 실거래가, KTX 시간표 등 125개+) | NomaDamas/k-skill |

## 앱별 적합도

| 앱 | korean-law-mcp | kordoc | k-skill | 비고 |
|---|---|---|---|---|
| `backend/` + `frontend/` (IVDR 문서 자동화) | ★★★ | ★★★ | ✗ | 가장 적합 |
| `ticketing/` | ✗ | ✗ | ★ | 자체 예약 관리 도구라 거의 무관 |
| `eddie/` | ✗ | ✗ | ★ | 출발 카운트다운에 교통 정보 연계 정도 |
| `miri/` | ✗ | ✗ | ★★ | 여행 템플릿(D-150~)과 연계 가능 |
| `tina/`, `scent-mixer/`, `site/` | ✗ | ✗ | ✗ | 해당 없음 |
| LFA 코어 (`main.py`, `agents/`) | ✗ | ✗ | ✗ | AGENTS.md의 "프레임워크·웹앱 추가 금지" 규칙에 저촉 |

## 1순위: IVDR 워크플로 (`backend/`)

### kordoc — 문서 추출 단계

- `DriveService`(`backend/app/services/drive_service.py`)는 `templates`, `regulations`, `sop`, `evidence`, `outputs` 폴더를 동기화하고 소스 파일 ID를 추적성용으로 보존합니다.
- 한국 규제 자료는 HWP·HWPX·PDF로 오는 경우가 많습니다. Drive 동기화 직후의 텍스트 추출 단계에 kordoc을 붙이면 표 구조까지 근거 텍스트로 쓸 수 있습니다.
- 주의: kordoc은 JS 라이브러리로 보이고 백엔드는 Python입니다. Node CLI 서브프로세스 호출 또는 작은 사이드카가 필요합니다.

### korean-law-mcp — 인용 검증

- `ai_service.py`의 `ivdr_review`와 근거 링크 구조가 있어 인용 검증이 들어갈 자리가 이미 있습니다.
- 한국 법령을 인용하는 섹션(체외진단의료기기법, 시행규칙 등)에서 조문 존재 여부를 확인하는 단계로 씁니다.
- 검증 결과가 없으면 기존 가드레일 문구 `insufficient evidence`를 유지합니다.
- 앱의 핵심은 EU IVDR이므로 한국 법령이 직접 쓰이는 범위는 한국 시장 제출용 문서로 제한됩니다.
- MCP 서버이므로 앱에 내장하기보다 Claude Code 세션에 연결해 리뷰어가 쓰는 방식이 더 간단합니다.

### 지켜야 할 가드레일

- 도구가 가져온 내용도 사람 승인 전까지 모두 DRAFT로 둡니다.
- 컴플라이언스·제출 준비 완료를 단정하지 않습니다.
- Drive의 사내 문서를 외부 API로 보내는지 먼저 확인합니다. `korean-law-mcp`는 법제처 Open API를 쓰므로 질의에 사내 정보가 섞이지 않게 해야 합니다.

## 2순위

- **`miri/` + k-skill**: 여행 템플릿에서 KTX 시간표 등을 일정 제안에 연결할 수 있습니다. miri는 로컬 우선(Dexie) PWA이므로 외부 호출은 사용자가 직접 요청하는 선택 기능으로만 넣습니다.
- **`eddie/`**: 교통 정보 연계 정도라 우선순위가 낮습니다.

## 제안하는 다음 단계

1. Claude Code 세션에 `korean-law-mcp`를 MCP로 연결해 IVDR 초안 리뷰에 써 봅니다. 앱 코드 변경이 필요 없는 가장 싼 검증입니다.
2. 효과가 있으면 `kordoc`을 `backend/app/services/`의 문서 추출 단계에 붙이는 PoC를 만듭니다.
3. 두 단계 모두 `github.com`이 네트워크 허용 목록에 있어야 합니다. 라이선스와 최신 사용법은 그때 저장소에서 확인합니다.
