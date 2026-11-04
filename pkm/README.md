# PKM — Personal Knowledge Management MCP server

A self-hosted "second brain" exposed as a Model Context Protocol (MCP) server.
Plug it into Claude Code, Claude Desktop, or any MCP-aware client to:

- Pull pages from a Notion workspace into a local SQLite index
- Add free-form notes from any client
- Auto-tag, categorize, and one-line-summarize every note (LLM)
- Find related notes via embedding similarity
- Hybrid search (vector + BM25 keyword) over the whole knowledge base
- Cluster notes by theme and synthesize each cluster

The server is **hybrid**: it uses Voyage embeddings + Anthropic Claude when
their API keys are configured, and falls back to deterministic local
implementations otherwise — so it boots and runs end-to-end even offline.

## Layout

```
pkm/
├── server.py            # MCP entry point (FastMCP)
├── requirements.txt
├── .env.example
├── pkm/
│   ├── config.py        # .env loader + dataclass
│   ├── store.py         # SQLite + FTS5 + embedding BLOBs
│   ├── notion_client.py # urllib-only Notion API wrapper
│   ├── embeddings.py    # Voyage + hashing fallback
│   ├── classifier.py    # Anthropic tagging + cluster synthesis
│   ├── search.py        # Hybrid search + single-link clustering
│   └── pipeline.py      # Orchestration glue used by the server
└── tests/
    └── test_pipeline.py # Offline smoke tests
```

## Setup

```bash
cd pkm
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in the keys you have
```

All keys are optional. Fill what you have:

| Variable           | Purpose                                            |
|--------------------|----------------------------------------------------|
| `NOTION_TOKEN`     | Internal Notion integration token                  |
| `NOTION_DATABASE_IDS` | Comma-separated DB ids to limit sync scope      |
| `ANTHROPIC_API_KEY`| Enables real LLM tagging + cluster summaries       |
| `VOYAGE_API_KEY`   | Enables high-quality embeddings (voyage-3)         |
| `PKM_DB_PATH`      | SQLite file location (default `./pkm.db`)          |

## Run as an MCP server

Standalone:

```bash
python server.py
```

Wire into a Claude Code config (`~/.claude.json` or workspace `.mcp.json`):

```json
{
  "mcpServers": {
    "pkm": {
      "command": "python",
      "args": ["/absolute/path/to/pkm/server.py"]
    }
  }
}
```

## Tools exposed

| Tool                | Description                                          |
|---------------------|------------------------------------------------------|
| `stats`             | Counts, backend selection, top tags                  |
| `add_note`          | Add a free-form note; auto-embeds + auto-tags        |
| `sync_notion`       | Pull Notion pages into the index                     |
| `search_notes`      | Hybrid vector + keyword search                       |
| `related`           | Top-N similar notes for a given id                   |
| `reclassify_all`    | Re-run LLM tagging across the store                  |
| `rebuild_index`     | Recompute every embedding and relation edge          |
| `cluster_overview`  | Theme clusters with synthesized summaries            |

Plus MCP resources `pkm://notes` (list) and `pkm://note/{id}` (full body).

## Tests

```bash
cd pkm
python -m unittest discover tests
```

The suite uses the offline fallback backends only — no API keys required.

## Notes

- Vectors live as BLOBs inside SQLite; there's no separate vector DB.
- The Notion client is stdlib-only (`urllib`); no third-party HTTP libs.
- Tag vocabulary is fed back to the classifier on every call to encourage
  reuse, so the tag set converges instead of fragmenting.
- The hashing embedding fallback exists so the server stays useful when no
  API is configured; expect noticeably weaker semantics than Voyage.
