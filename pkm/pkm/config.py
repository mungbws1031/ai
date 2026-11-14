"""Runtime configuration loaded from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _read_env_file(path: Path) -> None:
    """Load a .env file into os.environ without overwriting existing values."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


@dataclass(frozen=True)
class Config:
    db_path: Path
    notion_token: str | None
    notion_database_ids: tuple[str, ...]
    anthropic_api_key: str | None
    llm_model: str
    voyage_api_key: str | None
    embed_model: str

    @property
    def has_notion(self) -> bool:
        return bool(self.notion_token)

    @property
    def has_llm(self) -> bool:
        return bool(self.anthropic_api_key)

    @property
    def has_voyage(self) -> bool:
        return bool(self.voyage_api_key)


def load_config(env_file: Path | None = None) -> Config:
    if env_file is None:
        env_file = Path.cwd() / ".env"
    _read_env_file(env_file)

    db_path = Path(os.environ.get("PKM_DB_PATH", "./pkm.db")).expanduser().resolve()
    raw_ids = os.environ.get("NOTION_DATABASE_IDS", "")
    db_ids = tuple(part.strip() for part in raw_ids.split(",") if part.strip())

    return Config(
        db_path=db_path,
        notion_token=os.environ.get("NOTION_TOKEN") or None,
        notion_database_ids=db_ids,
        anthropic_api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
        llm_model=os.environ.get("PKM_LLM_MODEL", "claude-sonnet-4-6"),
        voyage_api_key=os.environ.get("VOYAGE_API_KEY") or None,
        embed_model=os.environ.get("PKM_EMBED_MODEL", "voyage-3"),
    )
