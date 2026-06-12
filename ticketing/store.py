"""Data layer and business rules for the ticketing system.

Standard-library only (sqlite3). Holds all persistence and the seat-allocation
rules that prevent overbooking. Kept separate from the HTTP layer so the rules
can be tested directly with unittest.
"""

from __future__ import annotations

import secrets
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB_PATH = Path(__file__).parent / "data" / "ticketing.db"

# Reservation lifecycle states.
STATUS_RESERVED = "RESERVED"
STATUS_ISSUED = "ISSUED"
STATUS_CANCELLED = "CANCELLED"

ACTIVE_STATUSES = (STATUS_RESERVED, STATUS_ISSUED)


class StoreError(Exception):
    """Raised for expected business-rule failures (e.g. sold out)."""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Store:
    """SQLite-backed store for events, reservations, and tickets.

    A single lock guards seat allocation so two concurrent requests can never
    push an event past its capacity, even though the HTTP server is threaded.
    """

    def __init__(self, db_path: Path | str = DEFAULT_DB_PATH) -> None:
        self._db_path = str(db_path)
        if self._db_path != ":memory:":
            Path(self._db_path).parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False because the threaded HTTP server shares it.
        self._conn = sqlite3.connect(self._db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._lock = threading.Lock()
        self._create_schema()

    # ----- schema -----------------------------------------------------------
    def _create_schema(self) -> None:
        with self._conn:
            self._conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    title       TEXT    NOT NULL,
                    venue       TEXT    NOT NULL DEFAULT '',
                    starts_at   TEXT    NOT NULL DEFAULT '',
                    total_seats INTEGER NOT NULL,
                    price       INTEGER NOT NULL DEFAULT 0,
                    created_at  TEXT    NOT NULL
                );

                CREATE TABLE IF NOT EXISTS reservations (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_id      INTEGER NOT NULL REFERENCES events(id),
                    customer_name TEXT    NOT NULL,
                    customer_phone TEXT   NOT NULL DEFAULT '',
                    quantity      INTEGER NOT NULL,
                    status        TEXT    NOT NULL,
                    created_at    TEXT    NOT NULL
                );

                CREATE TABLE IF NOT EXISTS tickets (
                    id             INTEGER PRIMARY KEY AUTOINCREMENT,
                    reservation_id INTEGER NOT NULL REFERENCES reservations(id),
                    code           TEXT    NOT NULL UNIQUE,
                    seat_label     TEXT    NOT NULL,
                    created_at     TEXT    NOT NULL
                );
                """
            )

    def close(self) -> None:
        self._conn.close()

    # ----- events -----------------------------------------------------------
    def create_event(
        self,
        title: str,
        total_seats: int,
        venue: str = "",
        starts_at: str = "",
        price: int = 0,
    ) -> dict:
        title = (title or "").strip()
        if not title:
            raise StoreError("행사 제목을 입력하세요.")
        if total_seats <= 0:
            raise StoreError("총 좌석 수는 1 이상이어야 합니다.")
        if price < 0:
            raise StoreError("가격은 0 이상이어야 합니다.")
        with self._conn:
            cur = self._conn.execute(
                "INSERT INTO events (title, venue, starts_at, total_seats, price, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (title, venue.strip(), starts_at.strip(), total_seats, price, _now()),
            )
        return self.get_event(cur.lastrowid)

    def get_event(self, event_id: int) -> dict:
        row = self._conn.execute(
            "SELECT * FROM events WHERE id = ?", (event_id,)
        ).fetchone()
        if row is None:
            raise StoreError(f"행사를 찾을 수 없습니다: id={event_id}")
        return self._event_to_dict(row)

    def list_events(self) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM events ORDER BY id DESC"
        ).fetchall()
        return [self._event_to_dict(r) for r in rows]

    def _seats_taken(self, event_id: int) -> int:
        row = self._conn.execute(
            "SELECT COALESCE(SUM(quantity), 0) AS taken FROM reservations"
            " WHERE event_id = ? AND status IN (?, ?)",
            (event_id, STATUS_RESERVED, STATUS_ISSUED),
        ).fetchone()
        return int(row["taken"])

    def _event_to_dict(self, row: sqlite3.Row) -> dict:
        taken = self._seats_taken(row["id"])
        total = row["total_seats"]
        return {
            "id": row["id"],
            "title": row["title"],
            "venue": row["venue"],
            "starts_at": row["starts_at"],
            "total_seats": total,
            "price": row["price"],
            "seats_taken": taken,
            "seats_remaining": total - taken,
            "created_at": row["created_at"],
        }

    # ----- reservations -----------------------------------------------------
    def create_reservation(
        self,
        event_id: int,
        customer_name: str,
        quantity: int,
        customer_phone: str = "",
    ) -> dict:
        customer_name = (customer_name or "").strip()
        if not customer_name:
            raise StoreError("예약자 이름을 입력하세요.")
        if quantity <= 0:
            raise StoreError("예약 매수는 1 이상이어야 합니다.")

        # The lock makes the read-check-then-write below atomic so two requests
        # cannot both pass the availability check and overbook the event.
        with self._lock, self._conn:
            self.get_event(event_id)  # raises if missing
            remaining = self.get_event(event_id)["seats_remaining"]
            if quantity > remaining:
                raise StoreError(
                    f"잔여 좌석이 부족합니다. (요청 {quantity}석 / 잔여 {remaining}석)"
                )
            cur = self._conn.execute(
                "INSERT INTO reservations"
                " (event_id, customer_name, customer_phone, quantity, status, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?)",
                (
                    event_id,
                    customer_name,
                    customer_phone.strip(),
                    quantity,
                    STATUS_RESERVED,
                    _now(),
                ),
            )
        return self.get_reservation(cur.lastrowid)

    def get_reservation(self, reservation_id: int) -> dict:
        row = self._conn.execute(
            "SELECT * FROM reservations WHERE id = ?", (reservation_id,)
        ).fetchone()
        if row is None:
            raise StoreError(f"예약을 찾을 수 없습니다: id={reservation_id}")
        tickets = self._tickets_for(reservation_id)
        return self._reservation_to_dict(row, tickets)

    def list_reservations(self, event_id: int | None = None) -> list[dict]:
        if event_id is None:
            rows = self._conn.execute(
                "SELECT * FROM reservations ORDER BY id DESC"
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM reservations WHERE event_id = ? ORDER BY id DESC",
                (event_id,),
            ).fetchall()
        return [
            self._reservation_to_dict(r, self._tickets_for(r["id"])) for r in rows
        ]

    def cancel_reservation(self, reservation_id: int) -> dict:
        with self._lock, self._conn:
            row = self._conn.execute(
                "SELECT * FROM reservations WHERE id = ?", (reservation_id,)
            ).fetchone()
            if row is None:
                raise StoreError(f"예약을 찾을 수 없습니다: id={reservation_id}")
            if row["status"] == STATUS_CANCELLED:
                raise StoreError("이미 취소된 예약입니다.")
            self._conn.execute(
                "UPDATE reservations SET status = ? WHERE id = ?",
                (STATUS_CANCELLED, reservation_id),
            )
        return self.get_reservation(reservation_id)

    # ----- tickets (발권) ---------------------------------------------------
    def issue_tickets(self, reservation_id: int) -> dict:
        """Issue one ticket per reserved seat. Idempotent-safe: refuses to
        re-issue an already issued or cancelled reservation."""
        with self._lock, self._conn:
            row = self._conn.execute(
                "SELECT * FROM reservations WHERE id = ?", (reservation_id,)
            ).fetchone()
            if row is None:
                raise StoreError(f"예약을 찾을 수 없습니다: id={reservation_id}")
            if row["status"] == STATUS_CANCELLED:
                raise StoreError("취소된 예약은 발권할 수 없습니다.")
            if row["status"] == STATUS_ISSUED:
                raise StoreError("이미 발권된 예약입니다.")

            event = self.get_event(row["event_id"])
            for i in range(row["quantity"]):
                code = self._unique_code()
                seat_label = f"{event['title'][:3].upper() or 'TKT'}-{reservation_id}-{i + 1}"
                self._conn.execute(
                    "INSERT INTO tickets (reservation_id, code, seat_label, created_at)"
                    " VALUES (?, ?, ?, ?)",
                    (reservation_id, code, seat_label, _now()),
                )
            self._conn.execute(
                "UPDATE reservations SET status = ? WHERE id = ?",
                (STATUS_ISSUED, reservation_id),
            )
        return self.get_reservation(reservation_id)

    def _unique_code(self) -> str:
        # Loop is defensive; collisions on a 12-char token are astronomically rare.
        for _ in range(10):
            code = secrets.token_hex(6).upper()
            exists = self._conn.execute(
                "SELECT 1 FROM tickets WHERE code = ?", (code,)
            ).fetchone()
            if exists is None:
                return code
        raise StoreError("티켓 코드 생성에 실패했습니다. 다시 시도하세요.")

    def _tickets_for(self, reservation_id: int) -> list[dict]:
        rows = self._conn.execute(
            "SELECT * FROM tickets WHERE reservation_id = ? ORDER BY id",
            (reservation_id,),
        ).fetchall()
        return [
            {
                "id": r["id"],
                "code": r["code"],
                "seat_label": r["seat_label"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def _reservation_to_dict(self, row: sqlite3.Row, tickets: list[dict]) -> dict:
        return {
            "id": row["id"],
            "event_id": row["event_id"],
            "customer_name": row["customer_name"],
            "customer_phone": row["customer_phone"],
            "quantity": row["quantity"],
            "status": row["status"],
            "created_at": row["created_at"],
            "tickets": tickets,
        }
