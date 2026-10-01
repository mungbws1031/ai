"""Embedding interface with Voyage AI primary and a deterministic fallback.

The fallback maps tokens into a fixed-dimensional vector via stable hashing
so the rest of the stack (similarity, clustering) works end-to-end even with
no API keys configured. Quality is materially lower than a real model — the
fallback is intended as a developer-friendly default, not production search.
"""

from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Sequence

FALLBACK_DIM = 256
TOKEN_RE = re.compile(r"[A-Za-z0-9가-힣]+", re.UNICODE)


@dataclass
class EmbeddingResult:
    vector: list[float]
    model: str


def _normalize(vec: list[float]) -> list[float]:
    norm = math.sqrt(sum(v * v for v in vec))
    if norm == 0:
        return vec
    return [v / norm for v in vec]


def _hash_index(token: str, dim: int) -> int:
    digest = hashlib.blake2b(token.encode("utf-8"), digest_size=4).digest()
    return int.from_bytes(digest, "big") % dim


def _hash_sign(token: str) -> int:
    digest = hashlib.blake2b(token.encode("utf-8"), digest_size=1, person=b"sign").digest()
    return 1 if digest[0] & 1 else -1


def _fallback_embed(text: str, dim: int = FALLBACK_DIM) -> list[float]:
    vec = [0.0] * dim
    tokens = TOKEN_RE.findall(text.lower())
    if not tokens:
        return vec
    for tok in tokens:
        idx = _hash_index(tok, dim)
        vec[idx] += _hash_sign(tok)
    return _normalize(vec)


class Embedder:
    """Embeds text using Voyage AI when available, falling back otherwise."""

    def __init__(self, api_key: str | None, model: str) -> None:
        self.model = model
        self._client = None
        if api_key:
            try:
                import voyageai  # type: ignore

                self._client = voyageai.Client(api_key=api_key)
            except Exception:
                self._client = None

    @property
    def active_backend(self) -> str:
        return "voyage" if self._client is not None else "fallback"

    def embed(self, texts: Sequence[str]) -> list[EmbeddingResult]:
        if not texts:
            return []
        if self._client is not None:
            try:
                resp = self._client.embed(list(texts), model=self.model, input_type="document")
                return [
                    EmbeddingResult(vector=_normalize(list(v)), model=self.model)
                    for v in resp.embeddings
                ]
            except Exception:
                # Fall through to deterministic fallback on transient errors.
                pass
        return [EmbeddingResult(vector=_fallback_embed(t), model="hash-fallback") for t in texts]

    def embed_one(self, text: str) -> EmbeddingResult:
        return self.embed([text])[0]


def cosine(a: Sequence[float], b: Sequence[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    return sum(x * y for x, y in zip(a, b))  # vectors are pre-normalized
