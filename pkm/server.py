"""PKM MCP server entry point.

Run with:
    python -m pkm.server          # if installed as a package
    python server.py              # from this directory

Add to a Claude Code (or other MCP host) settings under `mcpServers`:

    "pkm": {
        "command": "python",
        "args": ["/absolute/path/to/pkm/server.py"]
    }
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running this file directly without installation.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pkm.config import load_config  # noqa: E402
from pkm.pipeline import PKM  # noqa: E402

try:
    from mcp.server.fastmcp import FastMCP
except ImportError as exc:  # pragma: no cover - surfaced at boot
    sys.stderr.write(
        "ERROR: the `mcp` package is required. Install it with:\n"
        "    pip install -r requirements.txt\n"
    )
    raise


CONFIG = load_config()
PKM_APP = PKM(CONFIG)

mcp = FastMCP("pkm")


def _dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


@mcp.tool()
def stats() -> str:
    """Return store counts, backend selection, and top tags."""
    return _dump(PKM_APP.stats())


@mcp.tool()
def add_note(title: str, body: str, source: str = "manual") -> str:
    """Add a free-form note. Auto-embeds and auto-tags it.

    Args:
        title: Short headline for the note.
        body:  Full note text. Markdown is fine.
        source: Origin label, e.g. "manual", "voice", "clipboard".
    """
    note = PKM_APP.add_note(title=title, body=body, source=source)
    return _dump(
        {
            "id": note.id,
            "title": note.title,
            "category": note.category,
            "tags": note.tags,
            "summary": note.summary,
        }
    )


@mcp.tool()
def sync_notion(force: bool = False) -> str:
    """Pull pages from Notion into the local index.

    Requires NOTION_TOKEN. Optionally limit to NOTION_DATABASE_IDS.
    `force=True` re-imports unchanged pages.
    """
    report = PKM_APP.sync_notion(force=force)
    return _dump(report.to_dict())


@mcp.tool()
def search_notes(query: str, limit: int = 10) -> str:
    """Hybrid search (embedding similarity + keyword BM25)."""
    return _dump(PKM_APP.search_notes(query=query, limit=limit))


@mcp.tool()
def related(note_id: str, limit: int = 8) -> str:
    """Return notes most similar to the given note id (embedding cosine)."""
    return _dump(PKM_APP.find_related(note_id=note_id, limit=limit))


@mcp.tool()
def reclassify_all() -> str:
    """Re-run LLM classification across every stored note. Returns count."""
    return _dump({"reclassified": PKM_APP.reclassify_all()})


@mcp.tool()
def rebuild_index() -> str:
    """Recompute embeddings and relation edges for every note."""
    return _dump(PKM_APP.rebuild_index())


@mcp.tool()
def cluster_overview(threshold: float = 0.6, max_clusters: int = 8) -> str:
    """Cluster notes by embedding similarity and synthesize each theme."""
    return _dump(PKM_APP.cluster_overview(threshold=threshold, max_clusters=max_clusters))


@mcp.resource("pkm://notes")
def list_notes_resource() -> str:
    """Lightweight listing of every note (id, title, tags) as JSON."""
    notes = PKM_APP.store.all_notes()
    return _dump(
        [
            {
                "id": n.id,
                "title": n.title,
                "source": n.source,
                "category": n.category,
                "tags": n.tags,
                "updated_at": n.updated_at,
            }
            for n in notes
        ]
    )


@mcp.resource("pkm://note/{note_id}")
def note_resource(note_id: str) -> str:
    """Return the full content of a single note as JSON."""
    note = PKM_APP.store.get(note_id)
    if not note:
        return _dump({"error": "not found", "id": note_id})
    return _dump(
        {
            "id": note.id,
            "title": note.title,
            "source": note.source,
            "source_ref": note.source_ref,
            "category": note.category,
            "tags": note.tags,
            "summary": note.summary,
            "body": note.body,
            "created_at": note.created_at,
            "updated_at": note.updated_at,
        }
    )


if __name__ == "__main__":
    mcp.run()
