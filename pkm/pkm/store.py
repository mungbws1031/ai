"""SQLite-backed note store with embeddings and full-text search."""

from __future__ import annotations

import json
import sqlite3
import struct
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Sequence


SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL,
    source_ref    TEXT,
    title         TEXT NOT NULL,
    body          TEXT NOT NULL,
    tags_json     TEXT NOT NULL DEFAULT '[]',
    category      TEXT,
    summary       TEXT,
    embedding     BLOB,
    embed_model   TEXT,
    created_at    REAL NOT NULL,
    updated_at    REAL NOT NULL,
    UNIQUE (source, source_ref)
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    title, body, tags, category, summary,
    content='', tokenize='unicode61'
);

CREATE TABLE IF NOT EXISTS related (
    note_id      TEXT NOT NULL,
    other_id     TEXT NOT NULL,
    score        REAL NOT NULL,
    PRIMARY KEY (note_id, other_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (other_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS related_note_idx ON related(note_id);
CREATE INDEX IF NOT EXISTS related_other_idx ON related(other_id);
"""


def _pack_vector(vec: Sequence[float]) -> bytes:
    return struct.pack(f"<I{len(vec)}f", len(vec), *vec)


def _unpack_vector(blob: bytes | None) -> list[float]:
    if not blob:
        return []
    (dim,) = struct.unpack_from("<I", blob, 0)
    return list(struct.unpack_from(f"<{dim}f", blob, 4))


@dataclass
class Note:
    id: str
    source: str
    source_ref: str | None
    title: str
    body: str
    tags: list[str] = field(default_factory=list)
    category: str | None = None
    summary: str | None = None
    embedding: list[float] = field(default_factory=list)
    embed_model: str | None = None
    created_at: float = 0.0
    updated_at: float = 0.0

    def fts_tags(self) -> str:
        return " ".join(self.tags)


class NoteStore:
    def __init__(self, db_path: Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._conn.executescript(SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    # --- writes -------------------------------------------------------------

    def upsert(self, note: Note) -> Note:
        now = time.time()
        if not note.id:
            note.id = str(uuid.uuid4())
        if not note.created_at:
            note.created_at = now
        note.updated_at = now

        existing = None
        if note.source_ref:
            row = self._conn.execute(
                "SELECT id, created_at FROM notes WHERE source = ? AND source_ref = ?",
                (note.source, note.source_ref),
            ).fetchone()
            if row:
                existing = row
                note.id = row["id"]
                note.created_at = row["created_at"]

        self._conn.execute(
            """
            INSERT INTO notes (id, source, source_ref, title, body, tags_json,
                               category, summary, embedding, embed_model,
                               created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                source     = excluded.source,
                source_ref = excluded.source_ref,
                title      = excluded.title,
                body       = excluded.body,
                tags_json  = excluded.tags_json,
                category   = excluded.category,
                summary    = excluded.summary,
                embedding  = excluded.embedding,
                embed_model= excluded.embed_model,
                updated_at = excluded.updated_at
            """,
            (
                note.id,
                note.source,
                note.source_ref,
                note.title,
                note.body,
                json.dumps(note.tags, ensure_ascii=False),
                note.category,
                note.summary,
                _pack_vector(note.embedding) if note.embedding else None,
                note.embed_model,
                note.created_at,
                note.updated_at,
            ),
        )

        # Refresh FTS row.
        self._conn.execute("DELETE FROM notes_fts WHERE rowid = ?", (self._rowid(note.id),))
        self._conn.execute(
            "INSERT INTO notes_fts (rowid, title, body, tags, category, summary)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                self._rowid(note.id),
                note.title,
                note.body,
                note.fts_tags(),
                note.category or "",
                note.summary or "",
            ),
        )
        self._conn.commit()
        return note

    def delete(self, note_id: str) -> bool:
        cur = self._conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        self._conn.commit()
        return cur.rowcount > 0

    def replace_related(self, note_id: str, edges: Iterable[tuple[str, float]]) -> None:
        self._conn.execute("DELETE FROM related WHERE note_id = ?", (note_id,))
        self._conn.executemany(
            "INSERT OR REPLACE INTO related (note_id, other_id, score) VALUES (?, ?, ?)",
            [(note_id, other, float(score)) for other, score in edges],
        )
        self._conn.commit()

    # --- reads --------------------------------------------------------------

    def _rowid(self, note_id: str) -> int:
        row = self._conn.execute("SELECT rowid FROM notes WHERE id = ?", (note_id,)).fetchone()
        if row is None:
            raise KeyError(note_id)
        return row["rowid"]

    def get(self, note_id: str) -> Note | None:
        row = self._conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
        return self._row_to_note(row) if row else None

    def all_notes(self) -> list[Note]:
        rows = self._conn.execute("SELECT * FROM notes ORDER BY updated_at DESC").fetchall()
        return [self._row_to_note(r) for r in rows]

    def fts_search(self, query: str, limit: int = 20) -> list[tuple[Note, float]]:
        if not query.strip():
            return []
        safe = _fts_query(query)
        rows = self._conn.execute(
            """
            SELECT notes.*, bm25(notes_fts) AS score
              FROM notes_fts
              JOIN notes ON notes.rowid = notes_fts.rowid
             WHERE notes_fts MATCH ?
             ORDER BY score
             LIMIT ?
            """,
            (safe, limit),
        ).fetchall()
        # bm25: lower is better → invert to a 0..1-ish similarity proxy.
        out: list[tuple[Note, float]] = []
        for r in rows:
            sim = 1.0 / (1.0 + float(r["score"]))
            out.append((self._row_to_note(r), sim))
        return out

    def related_of(self, note_id: str, limit: int = 10) -> list[tuple[Note, float]]:
        rows = self._conn.execute(
            """
            SELECT notes.*, related.score AS rel_score
              FROM related
              JOIN notes ON notes.id = related.other_id
             WHERE related.note_id = ?
             ORDER BY related.score DESC
             LIMIT ?
            """,
            (note_id, limit),
        ).fetchall()
        return [(self._row_to_note(r), float(r["rel_score"])) for r in rows]

    def count(self) -> int:
        return int(self._conn.execute("SELECT COUNT(*) AS c FROM notes").fetchone()["c"])

    def by_tag(self, tag: str, limit: int = 50) -> list[Note]:
        rows = self._conn.execute(
            "SELECT * FROM notes WHERE tags_json LIKE ? ORDER BY updated_at DESC LIMIT ?",
            (f'%"{tag}"%', limit),
        ).fetchall()
        return [self._row_to_note(r) for r in rows]

    def tags_histogram(self) -> dict[str, int]:
        hist: dict[str, int] = {}
        for row in self._conn.execute("SELECT tags_json FROM notes"):
            for tag in json.loads(row["tags_json"] or "[]"):
                hist[tag] = hist.get(tag, 0) + 1
        return hist

    def _row_to_note(self, row: sqlite3.Row) -> Note:
        return Note(
            id=row["id"],
            source=row["source"],
            source_ref=row["source_ref"],
            title=row["title"],
            body=row["body"],
            tags=json.loads(row["tags_json"] or "[]"),
            category=row["category"],
            summary=row["summary"],
            embedding=_unpack_vector(row["embedding"]),
            embed_model=row["embed_model"],
            created_at=float(row["created_at"]),
            updated_at=float(row["updated_at"]),
        )


def _fts_query(query: str) -> str:
    """Escape user query for FTS5 MATCH. Conservative quoting per token."""
    parts: list[str] = []
    for raw in query.split():
        token = raw.replace('"', "")
        if not token:
            continue
        parts.append(f'"{token}"')
    return " ".join(parts) if parts else '""'
