# kordoc PoC

`docs/KOREAN_AI_TOOLS_REVIEW.md`의 2단계: IVDR 백엔드의 문서 추출 단계에 kordoc을 붙여 본 PoC입니다.

## 구성

| 파일 | 역할 |
|---|---|
| `backend/tools/kordoc/package.json`, `package-lock.json` | kordoc `4.25.11`(MIT) 고정 설치. `npm ci`로 설치 |
| `backend/app/services/document_extract_service.py` | kordoc CLI를 서브프로세스로 호출해 `markdown`, `tables`, `chunks` 반환 |
| `backend/scripts/kordoc_poc.py` | 로컬 파일로 바로 시험하는 스크립트 |
| `backend/tests/test_document_extract_service.py` | 단위 테스트(서브프로세스 모킹) + 실제 kordoc 통합 테스트 |
| `app/core/config.py` | `KORDOC_BIN`, `KORDOC_TIMEOUT_SECONDS` 설정 추가 |

kordoc은 Node.js 도구라 Python 백엔드와는 서브프로세스(사이드카)로 연결합니다.

## 실행

```bash
cd backend/tools/kordoc && npm ci          # Node 필요
cd ../.. && python scripts/kordoc_poc.py path/to/doc.docx --chunks
pytest tests/test_document_extract_service.py
```

## 검증된 것 / 안 된 것

**검증됨** (이 환경에서 실행)
- 표가 있는 DOCX를 마크다운 표, 표 구조(rows/cols), RAG용 청크(제목 breadcrumb + 표 독립 청크)로 추출
- 테스트 5개 통과(실제 kordoc 호출 1개 포함)

**검증 안 됨 — 다음에 반드시 확인**
- **실제 HWP/HWPX/PDF 파일**: 이 환경에 샘플이 없어 DOCX만 시험했습니다. 이 PoC의 핵심 가설(HWP·HWPX 표 파싱)은 아직 입증되지 않았습니다. 실제 식약처 서식 몇 건으로 `scripts/kordoc_poc.py`를 돌려 보세요.
- 스캔 PDF용 `--ocr`는 첫 사용 시 모델(~18MB)을 내려받습니다. 이 PoC에서는 쓰지 않습니다.
- Drive 동기화(`DriveService`)와는 아직 연결하지 않았습니다.

## 다음 단계

1. 실제 HWP/HWPX 샘플로 표 보존과 한글 깨짐 여부 확인
2. 통과하면 `DriveService.sync_project` 이후 단계에서 `regulations`/`sop`/`evidence` 파일을 추출해 근거 텍스트로 저장 (소스 파일 ID 유지)
3. 추출 결과도 DRAFT 근거 자료로만 취급하고, 사람 승인 전 컴플라이언스를 단정하지 않는 기존 가드레일 유지

## 참고

- 이번에는 GitHub는 막혀 있었지만 npm 레지스트리는 접근 가능해, npm 패키지(`kordoc`)의 메타데이터와 `--help`로 CLI 사용법을 확인했습니다. 소스 저장소는 직접 읽지 못했습니다.
