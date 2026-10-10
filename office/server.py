"""AI 오피스 서버: index.html을 서빙하고 Claude API 호출을 대신 수행합니다.

API 키는 서버 환경변수(ANTHROPIC_API_KEY)에만 두고 브라우저로는 보내지 않습니다.

실행:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-ant-...
    python office/server.py            # http://127.0.0.1:8765
"""
import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import anthropic

HERE = Path(__file__).parent
MODEL = os.environ.get("OFFICE_MODEL", "claude-opus-5-5")
EFFORT = os.environ.get("OFFICE_EFFORT", "medium")
HOST = os.environ.get("OFFICE_HOST", "127.0.0.1")
PORT = int(os.environ.get("OFFICE_PORT", "8765"))
MAX_BODY = 64 * 1024

COMPANY = """당신은 의료·바이오 전자제품을 개발하는 소규모 스튜디오의 전문가 직원입니다.
핵심 가치: 사용성, 제조 가능성, 안전, 미적 완성도, 정밀함, 최소 부품 수, 명확한 문서화.
기본 프로젝트: 슬림한 펜형 의료/바이오 전자기기 (흰색 슬림 바디, 작은 디스플레이, 버튼, 내부 PCB, CR2032 가능, 후면 배터리 접근 구조).

규칙:
1. 구조를 제안하면 반드시 조립 순서를 설명한다.
2. 제품 디자인은 외관, 내부 구조, 제조성을 함께 검토한다.
3. 불가능하거나 약하거나 모호한 구조는 분명히 지적한다.
4. 부품 수가 늘면 그 이유를 설명한다.
5. 세척성, 이물 끼임, 날카로운 모서리, 배터리 접근, 사용자 안전을 고려한다.
6. 규격/규제는 최신 원문으로 확인되기 전에는 적합하다고 단정하지 말고 '검증 필요'로 표시한다.
7. 근거가 부족한 부분은 가정이라고 명시한다.
8. 실무에 바로 쓸 수 있을 만큼 구체적으로, 직설적으로 쓴다."""

ROLE_GUIDE = {
    "Product Planner": "사용자, 사용 상황, 필수/제거 가능 기능, 차별점, 개발 우선순위를 검토한다.",
    "Industrial Designer": "비율, 버튼 위치, 디스플레이-버튼 관계, 배터리 커버가 형태를 해치는지, CMF, 파팅라인, 손가락 동선을 검토한다.",
    "Mechanical Engineer": "사출 가능성, 스냅핏, 조립 순서, 공차 누적, 버튼 감, 배터리 접근 구조, 파손/언더컷 위험을 검토한다.",
    "Electronics Engineer": "PCB 배치, 택트 스위치 위치, 배터리 홀더/클립, 부품 간섭, 접점 안정성, 조립 중 PCB 손상 가능성을 검토한다.",
    "Regulatory and QA": "사용자 안전, 배터리 접근, 어린이 안전, 세척성, 오염 위험, 내구성, RoHS/UL/ISO/IEC/IVDR 관련 확인 항목을 검토한다. 설계 고려사항과 검증 항목을 구분한다.",
    "Researcher": "유사 실제 제품, 의료기기/바이오 장비/오디오/소비자 전자제품의 구조 레퍼런스, 경쟁사 장단점을 정리한다. 확인하지 못한 사례를 지어내지 않는다.",
    "Documentation Manager": "제목, 배경, 요구사항, 결정사항, 미해결 이슈, 다음 액션, 담당, 일정 순서로 문서화한다.",
}

client = anthropic.Anthropic() if (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")) else None


def clip(value, n):
    return str(value or "")[:n]


def call_claude(system, user, max_tokens=4000):
    """Claude를 한 번 호출해 텍스트를 돌려줍니다. 거절/오류는 예외로 올립니다."""
    resp = client.beta.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        output_config={"effort": EFFORT},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    if resp.stop_reason == "refusal":
        raise RuntimeError("모델이 이 요청을 거절했습니다.")
    text = "".join(b.text for b in resp.content if b.type == "text").strip()
    if not text:
        raise RuntimeError("빈 응답이 왔습니다.")
    if resp.stop_reason == "max_tokens":
        text += "\n\n(응답이 길이 제한으로 잘렸습니다.)"
    return text


def work(body):
    task = clip(body.get("task"), 4000)
    team = body.get("team") or {}
    name, role, out = clip(team.get("name"), 30), clip(team.get("role"), 40), clip(team.get("out"), 60)
    guide = ROLE_GUIDE.get(role, f"'{name}' 담당 관점에서 업무를 검토한다.")
    system = (
        f"{COMPANY}\n\n당신의 소속/역할: {name} ({role})\n역할 지침: {guide}\n"
        f"산출물: {out}\n"
        "형식: 한국어, 600단어 이내. 핵심 결론을 먼저 쓰고, 근거와 위험, 다음 액션을 간결한 목록으로 정리한다."
    )
    return call_claude(system, f"총괄이 배정한 업무:\n{task}")


def synthesize(body):
    task = clip(body.get("task"), 4000)
    parts = body.get("results") or []
    joined = "\n\n".join(f"## {clip(r.get('team'), 30)}\n{clip(r.get('text'), 6000)}" for r in parts[:8])
    system = (
        f"{COMPANY}\n\n당신은 총괄(Chief of Staff)입니다. 각 팀의 검토를 종합해 의견 충돌을 정리하고 "
        "실행 가능한 결론을 냅니다. 팀 결과에 없는 사실을 새로 지어내지 않습니다.\n"
        "형식: 한국어, 500단어 이내. 1) 통합 결론 2) 팀 간 충돌/쟁점 3) 액션 플랜 4) 리스크 5) 다음 액션."
    )
    return call_claude(system, f"요청:\n{task}\n\n팀별 검토 결과:\n{joined}", max_tokens=3000)


def describe_error(e):
    if isinstance(e, anthropic.AuthenticationError):
        return "API 키가 올바르지 않습니다."
    if isinstance(e, anthropic.RateLimitError):
        return "요청이 너무 많습니다. 잠시 후 다시 시도하세요."
    if isinstance(e, anthropic.BadRequestError):
        return f"요청이 거부되었습니다: {e.message}"
    if isinstance(e, anthropic.APIConnectionError):
        return "Anthropic API에 연결하지 못했습니다."
    if isinstance(e, anthropic.APIStatusError):
        return f"API 오류({e.status_code}): {e.message}"
    return str(e)


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, payload, ctype="application/json; charset=utf-8"):
        data = payload if isinstance(payload, bytes) else json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self._send(200, (HERE / "index.html").read_bytes(), "text/html; charset=utf-8")
        elif self.path == "/api/status":
            self._send(200, {"live": client is not None, "model": MODEL})
        else:
            self._send(404, {"error": "not found"})

    def do_POST(self):
        routes = {"/api/work": work, "/api/synthesize": synthesize}
        fn = routes.get(self.path)
        if not fn:
            return self._send(404, {"error": "not found"})
        if client is None:
            return self._send(503, {"error": "ANTHROPIC_API_KEY가 설정되지 않았습니다."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > MAX_BODY:
                return self._send(413, {"error": "요청이 너무 큽니다."})
            body = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"error": "잘못된 요청입니다."})
        try:
            self._send(200, {"text": fn(body)})
        except Exception as e:  # noqa: BLE001 - 브라우저에 사람이 읽을 메시지로 전달
            self._send(502, {"error": describe_error(e)})

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    mode = f"실제 Claude 모드 ({MODEL})" if client else "ANTHROPIC_API_KEY 없음 → 시뮬레이션 모드"
    print(f"AI 오피스: http://{HOST}:{PORT}  [{mode}]")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
