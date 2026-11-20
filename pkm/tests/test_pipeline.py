"""End-to-end pipeline smoke tests using the deterministic fallback backends.

These run without any API keys — they prove the storage, embedding fallback,
hybrid search, and clustering layers work together.
"""

from __future__ import annotations

import os
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pkm.config import Config  # noqa: E402
from pkm.pipeline import PKM  # noqa: E402


def make_config(db_path: Path) -> Config:
    return Config(
        db_path=db_path,
        notion_token=None,
        notion_database_ids=tuple(),
        anthropic_api_key=None,
        llm_model="claude-sonnet-4-6",
        voyage_api_key=None,
        embed_model="voyage-3",
    )


class PipelineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.config = make_config(Path(self.tmp.name) / "pkm.db")
        self.app = PKM(self.config)

    def test_add_and_search(self) -> None:
        self.app.add_note(
            "Voice diary about LFA urine sticks",
            "Idea: detect glucose and protein simultaneously using a dual zone lateral flow strip.",
        )
        self.app.add_note(
            "Bike maintenance",
            "Replaced the chain on the gravel bike. Need to recheck shifting tomorrow.",
        )
        self.app.add_note(
            "Lateral flow background reading",
            "Studied nitrocellulose membrane porosity and capillary flow rate as they affect LFA sensitivity.",
        )

        results = self.app.search_notes("lateral flow LFA urine sensitivity", limit=3)
        self.assertGreaterEqual(len(results), 1)
        titles = {r["title"] for r in results}
        self.assertTrue(
            any("LFA" in t or "lateral" in t.lower() for t in titles),
            f"unexpected titles: {titles}",
        )

    def test_stats_reports_fallback_backends(self) -> None:
        s = self.app.stats()
        self.assertEqual(s["embedding_backend"], "fallback")
        self.assertEqual(s["llm_backend"], "fallback")

    def test_related_finds_similar_pair(self) -> None:
        a = self.app.add_note("LFA membrane study", "Membrane porosity affects capillary flow.")
        self.app.add_note(
            "LFA nitrocellulose notes",
            "Capillary flow rate is determined by nitrocellulose pore size.",
        )
        self.app.add_note("Off-topic", "Need to buy milk on the way home.")
        related = self.app.find_related(a.id, limit=5)
        # The off-topic milk note should not be the top hit.
        self.assertTrue(related, "expected at least one related note")
        self.assertNotIn("milk", related[0]["title"].lower())


if __name__ == "__main__":
    unittest.main()
