"""High-level orchestration that ties storage, embeddings, classifier and search."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .classifier import Classifier
from .config import Config
from .embeddings import Embedder
from .notion_client import NotionClient, NotionError, NotionPage
from .search import HybridSearch, cluster_by_threshold
from .store import Note, NoteStore


@dataclass
class SyncReport:
    pulled: int
    added: int
    updated: int
    skipped: int
    errors: list[str]

    def to_dict(self) -> dict:
        return {
            "pulled": self.pulled,
            "added": self.added,
            "updated": self.updated,
            "skipped": self.skipped,
            "errors": self.errors,
        }


class PKM:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.store = NoteStore(config.db_path)
        self.embedder = Embedder(config.voyage_api_key, config.embed_model)
        self.classifier = Classifier(config.anthropic_api_key, config.llm_model)
        self.search = HybridSearch(self.store, self.embedder)

    # --- ingestion ----------------------------------------------------------

    def add_note(
        self,
        title: str,
        body: str,
        source: str = "manual",
        source_ref: str | None = None,
        auto_classify: bool = True,
    ) -> Note:
        title = (title or "").strip() or "(untitled)"
        body = body or ""
        note = Note(id="", source=source, source_ref=source_ref, title=title, body=body)
        self._embed(note)
        if auto_classify:
            self._classify(note)
        return self.store.upsert(note)

    def sync_notion(self, force: bool = False) -> SyncReport:
        if not self.config.has_notion:
            return SyncReport(0, 0, 0, 0, ["NOTION_TOKEN not configured"])

        client = NotionClient(self.config.notion_token or "")
        report = SyncReport(pulled=0, added=0, updated=0, skipped=0, errors=[])
        try:
            for page in client.fetch_pages(self.config.notion_database_ids):
                report.pulled += 1
                action = self._upsert_notion_page(page, force=force)
                if action == "added":
                    report.added += 1
                elif action == "updated":
                    report.updated += 1
                else:
                    report.skipped += 1
        except NotionError as exc:
            report.errors.append(str(exc))
        return report

    def _upsert_notion_page(self, page: NotionPage, force: bool) -> str:
        body = (page.text or "").strip()
        if not body and not force:
            return "skipped"

        existing = next(
            (
                n
                for n in self.store.all_notes()
                if n.source == "notion" and n.source_ref == page.id
            ),
            None,
        )
        action = "added"
        if existing is not None:
            unchanged = (
                existing.title == page.title
                and existing.body == body
                and not force
            )
            if unchanged:
                return "skipped"
            existing.title = page.title
            existing.body = body
            self._embed(existing)
            self._classify(existing)
            self.store.upsert(existing)
            return "updated"

        note = Note(
            id="",
            source="notion",
            source_ref=page.id,
            title=page.title,
            body=body,
        )
        self._embed(note)
        self._classify(note)
        self.store.upsert(note)
        return action

    # --- maintenance --------------------------------------------------------

    def reclassify_all(self) -> int:
        notes = self.store.all_notes()
        for note in notes:
            self._classify(note)
            self.store.upsert(note)
        return len(notes)

    def rebuild_index(self) -> dict:
        notes = self.store.all_notes()
        for note in notes:
            self._embed(note)
            self.store.upsert(note)
        edges = self.search.rebuild_relations()
        return {"notes": len(notes), "edges": edges}

    # --- read paths ---------------------------------------------------------

    def find_related(self, note_id: str, limit: int = 8) -> list[dict]:
        return [h.to_dict() for h in self.search.related_to(note_id, limit=limit)]

    def search_notes(self, query: str, limit: int = 10) -> list[dict]:
        return [h.to_dict() for h in self.search.search(query, limit=limit)]

    def cluster_overview(self, threshold: float = 0.6, max_clusters: int = 8) -> list[dict]:
        clusters = cluster_by_threshold(self.store.all_notes(), threshold=threshold)
        clusters.sort(key=len, reverse=True)
        output: list[dict] = []
        for group in clusters[:max_clusters]:
            insight = self.classifier.cluster_insight(group)
            output.append(
                {
                    "size": len(group),
                    "theme": insight.theme,
                    "summary": insight.summary,
                    "open_questions": insight.open_questions,
                    "note_ids": [n.id for n in group],
                    "titles": [n.title for n in group],
                }
            )
        return output

    def stats(self) -> dict:
        notes = self.store.all_notes()
        return {
            "notes": len(notes),
            "sources": _counts(n.source for n in notes),
            "categories": _counts(n.category or "(unset)" for n in notes),
            "top_tags": sorted(
                self.store.tags_histogram().items(), key=lambda kv: kv[1], reverse=True
            )[:20],
            "embedding_backend": self.embedder.active_backend,
            "llm_backend": self.classifier.active_backend,
            "db_path": str(self.config.db_path),
        }

    # --- internals ----------------------------------------------------------

    def _embed(self, note: Note) -> None:
        text = f"{note.title}\n\n{note.body}".strip()
        if not text:
            note.embedding = []
            note.embed_model = None
            return
        result = self.embedder.embed_one(text)
        note.embedding = result.vector
        note.embed_model = result.model

    def _classify(self, note: Note) -> None:
        vocabulary = [t for t, _ in sorted(
            self.store.tags_histogram().items(), key=lambda kv: kv[1], reverse=True
        )]
        result = self.classifier.classify(note, vocabulary)
        note.category = result.category or note.category
        if result.tags:
            note.tags = result.tags
        if result.summary:
            note.summary = result.summary


def _counts(values: Iterable[str]) -> dict[str, int]:
    out: dict[str, int] = {}
    for v in values:
        out[v] = out.get(v, 0) + 1
    return out
