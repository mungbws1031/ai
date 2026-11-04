"""LLM-driven note classification and cluster summarization.

Uses the Anthropic Messages API when ANTHROPIC_API_KEY is configured.
When the key is missing, a deterministic keyword-frequency fallback runs so
the server stays functional offline (no tags rather than wrong tags).
"""

from __future__ import annotations

import json
import re
from collections import Counter
from dataclasses import dataclass
from typing import Sequence

from .store import Note

CLASSIFY_SYSTEM = (
    "You organize messy personal notes into a clean knowledge base. "
    "Return strict JSON only — no commentary, no markdown fences."
)

CLASSIFY_USER_TEMPLATE = """\
You receive ONE note. Produce JSON with this exact shape:

{{
  "category": "<one short noun phrase, e.g. 'product idea', 'meeting', 'research'>",
  "tags": ["<lowercase-kebab-or-korean tag>", "..."],
  "summary": "<one-sentence summary in the note's primary language>"
}}

Rules:
- 3 to 6 tags. Prefer reusing tags from the existing vocabulary when they fit.
- Tags should reflect topic, not sentiment.
- If the note is too short to summarize, return summary "".
- Output JSON only.

Existing tag vocabulary (most common first): {vocabulary}

Note title: {title}
Note body:
{body}
"""

CLUSTER_SYSTEM = (
    "You synthesize themes across personal notes. Be specific, not generic. "
    "Return strict JSON only."
)

CLUSTER_USER_TEMPLATE = """\
You are given a cluster of notes that an embedding model grouped together.
Produce JSON of this shape:

{{
  "theme": "<3-7 word theme name>",
  "summary": "<2-3 sentence synthesis in the dominant language>",
  "open_questions": ["<question 1>", "..."]
}}

Notes (id :: title :: snippet):
{notes_block}
"""


@dataclass
class Classification:
    category: str | None
    tags: list[str]
    summary: str | None


@dataclass
class ClusterInsight:
    theme: str
    summary: str
    open_questions: list[str]


class Classifier:
    def __init__(self, api_key: str | None, model: str) -> None:
        self.model = model
        self._client = None
        if api_key:
            try:
                import anthropic  # type: ignore

                self._client = anthropic.Anthropic(api_key=api_key)
            except Exception:
                self._client = None

    @property
    def active_backend(self) -> str:
        return "anthropic" if self._client is not None else "fallback"

    def classify(self, note: Note, vocabulary: Sequence[str]) -> Classification:
        if self._client is None:
            return _keyword_classify(note)
        prompt = CLASSIFY_USER_TEMPLATE.format(
            vocabulary=", ".join(vocabulary[:40]) if vocabulary else "(none yet)",
            title=note.title,
            body=_truncate(note.body, 4000),
        )
        try:
            response = self._client.messages.create(
                model=self.model,
                max_tokens=400,
                system=CLASSIFY_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            text = _join_text(response.content)
            data = _parse_json(text)
            return Classification(
                category=str(data.get("category") or "").strip() or None,
                tags=[str(t).strip() for t in data.get("tags", []) if str(t).strip()][:8],
                summary=str(data.get("summary") or "").strip() or None,
            )
        except Exception:
            return _keyword_classify(note)

    def cluster_insight(self, notes: Sequence[Note]) -> ClusterInsight:
        if not notes:
            return ClusterInsight(theme="(empty)", summary="", open_questions=[])
        if self._client is None:
            return _keyword_cluster(notes)
        notes_block = "\n".join(
            f"- {n.id[:8]} :: {n.title} :: {_truncate(n.body, 240)}" for n in notes[:20]
        )
        prompt = CLUSTER_USER_TEMPLATE.format(notes_block=notes_block)
        try:
            response = self._client.messages.create(
                model=self.model,
                max_tokens=500,
                system=CLUSTER_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            data = _parse_json(_join_text(response.content))
            return ClusterInsight(
                theme=str(data.get("theme") or "").strip() or "(theme)",
                summary=str(data.get("summary") or "").strip(),
                open_questions=[
                    str(q).strip() for q in data.get("open_questions", []) if str(q).strip()
                ][:6],
            )
        except Exception:
            return _keyword_cluster(notes)


# --- helpers ----------------------------------------------------------------


_TOKEN_RE = re.compile(r"[A-Za-z가-힣][A-Za-z0-9가-힣\-]{2,}", re.UNICODE)
_STOPWORDS = {
    "the", "and", "for", "with", "this", "that", "from", "have", "into",
    "about", "there", "their", "which", "would", "could", "should", "what",
    "when", "where", "your", "you", "are", "was", "were", "but", "not",
    "이것", "그것", "저것", "그리고", "하지만", "그래서", "이런", "저런",
}


def _keyword_classify(note: Note) -> Classification:
    tokens = [t.lower() for t in _TOKEN_RE.findall(f"{note.title}\n{note.body}")]
    tokens = [t for t in tokens if t not in _STOPWORDS]
    common = [tok for tok, _ in Counter(tokens).most_common(5)]
    snippet = note.body.strip().splitlines()[0] if note.body.strip() else ""
    return Classification(
        category=None,
        tags=common,
        summary=_truncate(snippet, 200) or None,
    )


def _keyword_cluster(notes: Sequence[Note]) -> ClusterInsight:
    tokens: list[str] = []
    for n in notes:
        tokens.extend(t.lower() for t in _TOKEN_RE.findall(f"{n.title}\n{n.body}"))
    tokens = [t for t in tokens if t not in _STOPWORDS]
    common = Counter(tokens).most_common(5)
    theme = " · ".join(tok for tok, _ in common[:3]) or "(theme)"
    summary = f"{len(notes)} notes sharing keywords: " + ", ".join(t for t, _ in common)
    return ClusterInsight(theme=theme, summary=summary, open_questions=[])


def _truncate(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def _join_text(content) -> str:
    parts: list[str] = []
    for block in content or []:
        if getattr(block, "type", None) == "text":
            parts.append(block.text)
    return "".join(parts)


_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _parse_json(text: str) -> dict:
    text = text.strip()
    if not text:
        return {}
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = _JSON_FENCE_RE.search(text)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    # Last resort: locate the first { ... } span.
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except json.JSONDecodeError:
            return {}
    return {}
