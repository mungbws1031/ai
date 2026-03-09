# FastAPI MVP 실행 가이드

## 실행
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 확인
- Health: `GET /health`
- Plan: `POST /plan-today`

## 샘플 요청
```bash
curl -X POST http://127.0.0.1:8000/plan-today \
  -H 'Content-Type: application/json' \
  -d '{
    "context": "오늘은 회의가 많아서 집중시간이 필요해",
    "calendar_events": [{"time":"10:30","title":"주간 스탠드업","attendees":["A","B"]}],
    "unread_emails": [
      {"sender":"ceo@company.com","subject":"오늘 긴급 검토","received_at":"2026-02-21T08:10:00"},
      {"sender":"hr@company.com","subject":"복지 설문 안내","received_at":"2026-02-21T07:30:00"}
    ]
  }'
```
