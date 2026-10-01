"""Hybrid search and relation building over the note store."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

from .embeddings import Embedder, cosine
from .store import Note, NoteStore


@dataclass
class SearchHit:
    note: Note
    score: float
    vector_score: float
    keyword_score: float

    def to_dict(self) -> dict:
        return {
            "id": self.note.id,
            "title": self.note.title,
            "source": self.note.source,
            "source_ref": self.note.source_ref,
            "category": self.note.category,
            "tags": self.note.tags,
            "summary": self.note.summary,
            "score": round(self.score, 4),
            "vector_score": round(self.vector_score, 4),
            "keyword_score": round(self.keyword_score, 4),
        }


class HybridSearch:
    """Combine vector similarity with FTS keyword scores."""

    def __init__(
        self,
        store: NoteStore,
        embedder: Embedder,
        vector_weight: float = 0.65,
        keyword_weight: float = 0.35,
    ) -> None:
        self.store = store
        self.embedder = embedder
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight

    def search(self, query: str, limit: int = 10) -> list[SearchHit]:
        query = query.strip()
        if not query:
            return []
        q_vec = self.embedder.embed_one(query).vector
        keyword_hits = {n.id: score for n, score in self.store.fts_search(query, limit=limit * 3)}

        notes = self.store.all_notes()
        scored: list[SearchHit] = []
        for note in notes:
            v_score = cosine(q_vec, note.embedding) if note.embedding else 0.0
            k_score = keyword_hits.get(note.id, 0.0)
            if v_score <= 0 and k_score <= 0:
                continue
            combined = self.vector_weight * v_score + self.keyword_weight * k_score
            scored.append(
                SearchHit(
                    note=note,
                    score=combined,
                    vector_score=v_score,
                    keyword_score=k_score,
                )
            )
        scored.sort(key=lambda h: h.score, reverse=True)
        return scored[:limit]

    def related_to(self, note_id: str, limit: int = 8) -> list[SearchHit]:
        target = self.store.get(note_id)
        if target is None or not target.embedding:
            return []
        notes = self.store.all_notes()
        out: list[SearchHit] = []
        for other in notes:
            if other.id == target.id or not other.embedding:
                continue
            sim = cosine(target.embedding, other.embedding)
            if sim <= 0:
                continue
            out.append(SearchHit(note=other, score=sim, vector_score=sim, keyword_score=0.0))
        out.sort(key=lambda h: h.score, reverse=True)
        return out[:limit]

    def rebuild_relations(self, threshold: float = 0.55, neighbors: int = 8) -> int:
        """Recompute the related-notes edge table. Returns total edges written."""
        notes = [n for n in self.store.all_notes() if n.embedding]
        total = 0
        for note in notes:
            neighbors_list: list[tuple[str, float]] = []
            for other in notes:
                if other.id == note.id:
                    continue
                sim = cosine(note.embedding, other.embedding)
                if sim >= threshold:
                    neighbors_list.append((other.id, sim))
            neighbors_list.sort(key=lambda t: t[1], reverse=True)
            neighbors_list = neighbors_list[:neighbors]
            self.store.replace_related(note.id, neighbors_list)
            total += len(neighbors_list)
        return total


def cluster_by_threshold(
    notes: Sequence[Note], threshold: float = 0.6
) -> list[list[Note]]:
    """Single-link clustering on cosine similarity. Returns clusters of >=2."""
    notes = [n for n in notes if n.embedding]
    parent: dict[str, str] = {n.id: n.id for n in notes}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: str, b: str) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for i, a in enumerate(notes):
        for b in notes[i + 1 :]:
            if cosine(a.embedding, b.embedding) >= threshold:
                union(a.id, b.id)

    groups: dict[str, list[Note]] = {}
    for n in notes:
        groups.setdefault(find(n.id), []).append(n)
    return [g for g in groups.values() if len(g) >= 2]
