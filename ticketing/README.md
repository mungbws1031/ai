# 🎫 티켓팅 · 예약/발권 관리 시스템

직접 운영하는 공연·행사용 **예약/발권 관리** 도구입니다. 표준 라이브러리만
사용하므로 별도 설치 없이 Python 3.10+ 만 있으면 바로 실행됩니다.
(외부 예매 사이트를 자동 조작하는 매크로/봇이 아니라, 내가 운영하는
행사의 좌석을 관리하는 시스템입니다.)

## 기능
- **행사 등록**: 제목·장소·일시·총 좌석·가격
- **예약 접수**: 예약자/연락처/매수 — 잔여 좌석을 초과하면 서버가 자동 차단
- **발권(티켓 발행)**: 예약 매수만큼 고유 티켓 코드 생성
- **취소**: 좌석이 다시 잔여로 환원되어 재예약 가능
- **현황 조회**: 행사별 잔여 좌석·예약 목록·티켓 코드
- 내장 웹 UI + JSON API (Node 빌드 불필요)

## 실행
```bash
cd ticketing
python app.py --seed          # 데모 데이터와 함께 시작
# 브라우저에서 http://127.0.0.1:8000 접속
```

옵션:
```bash
python app.py --port 9000     # 포트 변경
python app.py --host 0.0.0.0  # 외부 접속 허용
python app.py --db /tmp/t.db  # DB 파일 위치 지정 (기본: data/ticketing.db)
```

## 🎮 티켓팅 가상 연습 (연습용 시뮬레이터)
실제 예매 사이트를 **자동 조작하지 않는** 순수 연습 도구입니다. 실전 흐름을
손에 익히기 위한 것으로, 표시되는 모든 정보는 가짜이며 어떤 사이트에도
접속하지 않습니다. (매크로/봇이 아닙니다.)

- 오픈 카운트다운 → **정시 클릭(반응속도 ms 측정)** → 보안문자(캡차) 입력
  → 좌석 선택 → 모의 결제 → 단계별 소요시간·등급 리포트
- 경쟁자(동시 접속자) 시뮬레이션으로 좌석이 실시간으로 줄어듭니다.
- 보안문자 길이·좌석 수·경쟁 강도·카운트다운 시간 조절 가능.

여는 방법:
```bash
# 1) 서버로 접속:  python app.py  ->  http://127.0.0.1:8000/practice
# 2) 또는 파일을 브라우저로 직접 열기:  ticketing/practice/index.html
```

## 테스트
```bash
cd ticketing
python -m unittest discover -s tests -v
```

## 구조
| 파일 | 역할 |
|------|------|
| `store.py` | SQLite 데이터 계층 + 좌석 배정/초과예약 방지 규칙 |
| `app.py`   | `http.server` 기반 JSON API + 웹 UI 서빙 |
| `web.py`   | 단일 페이지 웹 UI (HTML/CSS/JS 문자열) |
| `tests/`   | `unittest` 비즈니스 규칙 테스트 |

## API 요약
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET  | `/api/events` | 행사 목록(잔여 좌석 포함) |
| POST | `/api/events` | 행사 등록 |
| GET  | `/api/reservations?event_id=1` | 예약 목록 |
| POST | `/api/reservations` | 예약 접수 |
| POST | `/api/reservations/{id}/issue` | 발권 |
| POST | `/api/reservations/{id}/cancel` | 취소 |

### 예시
```bash
curl -X POST localhost:8000/api/events \
  -H 'Content-Type: application/json' \
  -d '{"title":"봄밤 콘서트","total_seats":50,"price":45000,"venue":"시민회관","starts_at":"2026-06-20 19:30"}'

curl -X POST localhost:8000/api/reservations \
  -H 'Content-Type: application/json' \
  -d '{"event_id":1,"customer_name":"홍길동","quantity":2,"customer_phone":"010-1234-5678"}'

curl -X POST localhost:8000/api/reservations/1/issue
```

## 설계 메모
- 좌석 잔여 수는 **활성(RESERVED/ISSUED) 예약의 매수 합**으로 계산하므로,
  취소 시 좌석이 자동으로 환원됩니다.
- 예약 생성·발권·취소는 스레드 락으로 보호되어, 동시 요청이 좌석을
  초과 배정하지 못합니다.
