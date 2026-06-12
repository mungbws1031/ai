"""HTTP server for the ticketing system.

Standard-library only (http.server). Exposes a small JSON API and serves a
single-page web UI so the whole thing runs with just `python ticketing/app.py`.

Run:
    python ticketing/app.py            # http://127.0.0.1:8000
    python ticketing/app.py --port 9000
    python ticketing/app.py --seed     # add demo data on first run

API:
    GET  /api/events
    POST /api/events                      {title,total_seats,venue,starts_at,price}
    GET  /api/reservations?event_id=1
    POST /api/reservations                {event_id,customer_name,quantity,customer_phone}
    POST /api/reservations/{id}/issue     -> 발권
    POST /api/reservations/{id}/cancel    -> 취소
"""

from __future__ import annotations

import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from store import Store, StoreError
from web import INDEX_HTML

# Module-level store shared across worker threads (Store guards its own state).
STORE: Store


# Route table: (method, compiled-path-regex, handler-name).
def _make_routes():
    return [
        ("GET", re.compile(r"^/api/events$"), "list_events"),
        ("POST", re.compile(r"^/api/events$"), "create_event"),
        ("GET", re.compile(r"^/api/reservations$"), "list_reservations"),
        ("POST", re.compile(r"^/api/reservations$"), "create_reservation"),
        ("POST", re.compile(r"^/api/reservations/(?P<id>\d+)/issue$"), "issue_tickets"),
        ("POST", re.compile(r"^/api/reservations/(?P<id>\d+)/cancel$"), "cancel_reservation"),
    ]


class Handler(BaseHTTPRequestHandler):
    server_version = "TicketingServer/1.0"
    routes = _make_routes()

    # ----- helpers ----------------------------------------------------------
    def _send_json(self, payload, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html: str, status: int = 200) -> None:
        body = html.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise StoreError(f"잘못된 JSON 요청입니다: {exc}")
        if not isinstance(data, dict):
            raise StoreError("JSON 객체가 필요합니다.")
        return data

    # ----- dispatch ---------------------------------------------------------
    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            self._send_html(INDEX_HTML)
            return
        self._dispatch("GET", path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        self._dispatch("POST", path)

    def _dispatch(self, method: str, path: str) -> None:
        for route_method, pattern, handler_name in self.routes:
            if route_method != method:
                continue
            match = pattern.match(path)
            if match:
                try:
                    getattr(self, handler_name)(**match.groupdict())
                except StoreError as exc:
                    self._send_json({"error": str(exc)}, status=400)
                except Exception as exc:  # noqa: BLE001 - surface as 500 JSON
                    self._send_json({"error": f"서버 오류: {exc}"}, status=500)
                return
        self._send_json({"error": "not found"}, status=404)

    # ----- route handlers ---------------------------------------------------
    def list_events(self) -> None:
        self._send_json({"events": STORE.list_events()})

    def create_event(self) -> None:
        data = self._read_json_body()
        event = STORE.create_event(
            title=data.get("title", ""),
            total_seats=int(data.get("total_seats", 0)),
            venue=data.get("venue", ""),
            starts_at=data.get("starts_at", ""),
            price=int(data.get("price", 0)),
        )
        self._send_json({"event": event}, status=201)

    def list_reservations(self) -> None:
        query = parse_qs(urlparse(self.path).query)
        event_id = query.get("event_id", [None])[0]
        event_id_int = int(event_id) if event_id else None
        self._send_json({"reservations": STORE.list_reservations(event_id_int)})

    def create_reservation(self) -> None:
        data = self._read_json_body()
        reservation = STORE.create_reservation(
            event_id=int(data.get("event_id", 0)),
            customer_name=data.get("customer_name", ""),
            quantity=int(data.get("quantity", 0)),
            customer_phone=data.get("customer_phone", ""),
        )
        self._send_json({"reservation": reservation}, status=201)

    def issue_tickets(self, id: str) -> None:  # noqa: A002 - matches route group
        self._send_json({"reservation": STORE.issue_tickets(int(id))})

    def cancel_reservation(self, id: str) -> None:  # noqa: A002
        self._send_json({"reservation": STORE.cancel_reservation(int(id))})

    # Quieter logging than the noisy default.
    def log_message(self, fmt: str, *args) -> None:
        print(f"[ticketing] {self.address_string()} - {fmt % args}")


def seed_demo_data(store: Store) -> None:
    if store.list_events():
        return  # already has data; don't duplicate
    concert = store.create_event(
        title="봄밤 콘서트", total_seats=50, venue="시민회관 대극장",
        starts_at="2026-06-20 19:30", price=45000,
    )
    store.create_event(
        title="재즈 나이트", total_seats=20, venue="라이브 클럽 블루",
        starts_at="2026-06-25 20:00", price=30000,
    )
    r = store.create_reservation(concert["id"], "홍길동", 2, "010-1234-5678")
    store.issue_tickets(r["id"])
    store.create_reservation(concert["id"], "김영희", 3, "010-9876-5432")
    print("[ticketing] 데모 데이터를 생성했습니다.")


def main() -> None:
    parser = argparse.ArgumentParser(description="티켓팅(예약/발권) 관리 서버")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--seed", action="store_true", help="데모 데이터 추가")
    parser.add_argument("--db", default=None, help="SQLite 파일 경로 (기본: data/ticketing.db)")
    args = parser.parse_args()

    global STORE
    STORE = Store(args.db) if args.db else Store()
    if args.seed:
        seed_demo_data(STORE)

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"[ticketing] 서버 시작: http://{args.host}:{args.port}  (Ctrl+C 종료)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[ticketing] 종료합니다.")
    finally:
        server.server_close()
        STORE.close()


if __name__ == "__main__":
    main()
