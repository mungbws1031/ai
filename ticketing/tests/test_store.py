"""Unit tests for the ticketing business rules. Standard-library unittest.

Run from the ticketing/ directory:
    python -m unittest discover -s tests
"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from store import (  # noqa: E402
    STATUS_CANCELLED,
    STATUS_ISSUED,
    STATUS_RESERVED,
    Store,
    StoreError,
)


class TicketingStoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.store = Store(":memory:")

    def tearDown(self) -> None:
        self.store.close()

    def test_create_event_computes_remaining(self):
        ev = self.store.create_event("콘서트", total_seats=10)
        self.assertEqual(ev["seats_remaining"], 10)
        self.assertEqual(ev["seats_taken"], 0)

    def test_create_event_validates_input(self):
        with self.assertRaises(StoreError):
            self.store.create_event("", total_seats=10)
        with self.assertRaises(StoreError):
            self.store.create_event("x", total_seats=0)

    def test_reservation_reduces_remaining(self):
        ev = self.store.create_event("콘서트", total_seats=10)
        self.store.create_reservation(ev["id"], "홍길동", 3)
        self.assertEqual(self.store.get_event(ev["id"])["seats_remaining"], 7)

    def test_overbooking_is_blocked(self):
        ev = self.store.create_event("소극장", total_seats=2)
        self.store.create_reservation(ev["id"], "A", 2)
        with self.assertRaises(StoreError):
            self.store.create_reservation(ev["id"], "B", 1)
        self.assertEqual(self.store.get_event(ev["id"])["seats_remaining"], 0)

    def test_cancel_restores_seats(self):
        ev = self.store.create_event("콘서트", total_seats=5)
        r = self.store.create_reservation(ev["id"], "홍길동", 4)
        self.assertEqual(self.store.get_event(ev["id"])["seats_remaining"], 1)
        self.store.cancel_reservation(r["id"])
        self.assertEqual(self.store.get_event(ev["id"])["seats_remaining"], 5)
        self.assertEqual(self.store.get_reservation(r["id"])["status"], STATUS_CANCELLED)

    def test_cancelled_seat_can_be_rebooked(self):
        ev = self.store.create_event("소극장", total_seats=2)
        r = self.store.create_reservation(ev["id"], "A", 2)
        self.store.cancel_reservation(r["id"])
        # Seats freed, so a new reservation now fits.
        r2 = self.store.create_reservation(ev["id"], "B", 2)
        self.assertEqual(r2["status"], STATUS_RESERVED)

    def test_issue_creates_one_ticket_per_seat(self):
        ev = self.store.create_event("콘서트", total_seats=10)
        r = self.store.create_reservation(ev["id"], "홍길동", 3)
        issued = self.store.issue_tickets(r["id"])
        self.assertEqual(issued["status"], STATUS_ISSUED)
        self.assertEqual(len(issued["tickets"]), 3)
        codes = {t["code"] for t in issued["tickets"]}
        self.assertEqual(len(codes), 3, "ticket codes must be unique")

    def test_cannot_issue_twice(self):
        ev = self.store.create_event("콘서트", total_seats=10)
        r = self.store.create_reservation(ev["id"], "홍길동", 1)
        self.store.issue_tickets(r["id"])
        with self.assertRaises(StoreError):
            self.store.issue_tickets(r["id"])

    def test_cannot_issue_cancelled(self):
        ev = self.store.create_event("콘서트", total_seats=10)
        r = self.store.create_reservation(ev["id"], "홍길동", 1)
        self.store.cancel_reservation(r["id"])
        with self.assertRaises(StoreError):
            self.store.issue_tickets(r["id"])

    def test_cannot_cancel_twice(self):
        ev = self.store.create_event("콘서트", total_seats=10)
        r = self.store.create_reservation(ev["id"], "홍길동", 1)
        self.store.cancel_reservation(r["id"])
        with self.assertRaises(StoreError):
            self.store.cancel_reservation(r["id"])

    def test_issued_reservation_still_holds_seats(self):
        ev = self.store.create_event("콘서트", total_seats=5)
        r = self.store.create_reservation(ev["id"], "홍길동", 2)
        self.store.issue_tickets(r["id"])
        self.assertEqual(self.store.get_event(ev["id"])["seats_remaining"], 3)

    def test_list_reservations_filters_by_event(self):
        a = self.store.create_event("A", total_seats=10)
        b = self.store.create_event("B", total_seats=10)
        self.store.create_reservation(a["id"], "x", 1)
        self.store.create_reservation(b["id"], "y", 1)
        self.assertEqual(len(self.store.list_reservations(a["id"])), 1)
        self.assertEqual(len(self.store.list_reservations()), 2)


if __name__ == "__main__":
    unittest.main()
