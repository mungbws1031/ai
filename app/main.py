from datetime import datetime
from typing import List

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="AI Agent MVP", version="0.1.0")


class CalendarEvent(BaseModel):
    time: str = Field(..., description="HH:MM format")
    title: str
    attendees: List[str] = []


class EmailItem(BaseModel):
    sender: str
    subject: str
    received_at: str = Field(..., description="ISO datetime string")


class PlanTodayRequest(BaseModel):
    context: str = ""
    calendar_events: List[CalendarEvent] = []
    unread_emails: List[EmailItem] = []


class PlanTodayResponse(BaseModel):
    summary: List[str]
    urgent_emails: List[str]
    top_tasks: List[str]
    focus_blocks: List[str]


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


def _priority_score(subject: str, context: str) -> int:
    score = 0
    lowered = f"{subject} {context}".lower()
    for kw in ["urgent", "asap", "오늘", "긴급", "deadline", "마감"]:
        if kw in lowered:
            score += 2
    for kw in ["review", "confirm", "승인", "검토"]:
        if kw in lowered:
            score += 1
    return score


@app.post("/plan-today", response_model=PlanTodayResponse)
def plan_today(req: PlanTodayRequest) -> PlanTodayResponse:
    summary = [
        f"오늘 일정 {len(req.calendar_events)}건, 미확인 메일 {len(req.unread_emails)}건입니다.",
        "오전엔 중요한 일정 우선, 오후엔 처리성 업무를 배치하세요.",
        f"추가 컨텍스트: {req.context or '없음'}",
    ]

    sorted_emails = sorted(
        req.unread_emails,
        key=lambda e: (
            _priority_score(e.subject, req.context),
            datetime.fromisoformat(e.received_at),
        ),
        reverse=True,
    )

    urgent_emails = [f"{e.sender} | {e.subject}" for e in sorted_emails[:3]]

    tasks = []
    for event in req.calendar_events:
        tasks.append((2, f"일정 준비: {event.title} ({event.time})"))
    for email in sorted_emails:
        score = _priority_score(email.subject, req.context)
        tasks.append((score, f"메일 처리: {email.subject} ({email.sender})"))

    tasks = [t for _, t in sorted(tasks, key=lambda x: x[0], reverse=True)][:5]

    if len(tasks) < 5:
        tasks.extend([
            "핵심 업무 1개 25분 집중 실행",
            "회의 전 아젠다 3줄 정리",
            "업무 종료 전 내일 우선순위 점검",
        ])
        tasks = tasks[:5]

    focus_blocks = ["10:00-10:25", "15:00-15:25"]

    return PlanTodayResponse(
        summary=summary,
        urgent_emails=urgent_emails,
        top_tasks=tasks,
        focus_blocks=focus_blocks,
    )
