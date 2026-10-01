"""Environment-driven configuration for the Hermes Telegram bot.

All settings come from environment variables (or a local .env file loaded by
python-dotenv if present). Nothing here is secret-by-default; fill values in
your own .env.
"""

import os
from dataclasses import dataclass

try:  # Optional: load .env if python-dotenv is installed.
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # pragma: no cover - dotenv is optional.
    pass


def _split_ids(raw: str) -> list[int]:
    """Parse a comma-separated list of chat IDs into ints, skipping blanks."""
    ids: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            continue
    return ids


@dataclass(frozen=True)
class HermesConfig:
    # --- Telegram ---
    bot_token: str
    # Chat IDs allowed to receive notifications / scheduled posts.
    # Telegram group IDs are negative (supergroups start with -100).
    notify_chat_ids: list[int]
    # When set, only these chat IDs may use the bot (allowlist). Empty = open.
    allowed_chat_ids: list[int]

    # --- LLM (OpenAI-compatible chat completions) ---
    llm_api_key: str
    llm_api_url: str
    llm_model: str
    llm_system_prompt: str

    # --- IVDR backend ---
    ivdr_api_url: str

    # --- Scheduling ---
    # Interval in seconds for the periodic status digest. 0 disables it.
    digest_interval_seconds: int

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key and self.llm_api_url and self.llm_model)

    @property
    def ivdr_enabled(self) -> bool:
        return bool(self.ivdr_api_url)


def load_config() -> HermesConfig:
    """Build a HermesConfig from environment variables.

    Raises ValueError if the bot token is missing, since the bot cannot run
    without it (this is the single most common reason the bot "does nothing").
    """
    token = os.getenv("HERMES_BOT_TOKEN", "").strip()
    if not token:
        raise ValueError(
            "HERMES_BOT_TOKEN is not set. Create a bot with @BotFather, "
            "then export HERMES_BOT_TOKEN=<token>."
        )

    return HermesConfig(
        bot_token=token,
        notify_chat_ids=_split_ids(os.getenv("HERMES_NOTIFY_CHAT_IDS", "")),
        allowed_chat_ids=_split_ids(os.getenv("HERMES_ALLOWED_CHAT_IDS", "")),
        llm_api_key=os.getenv("LLM_API_KEY", "").strip(),
        llm_api_url=os.getenv("LLM_API_URL", "").strip(),
        llm_model=os.getenv("LLM_MODEL", "").strip(),
        llm_system_prompt=os.getenv(
            "HERMES_SYSTEM_PROMPT",
            "You are Hermes, a concise assistant for an IVDR regulatory "
            "document automation team. Answer clearly. If unsure, say so.",
        ),
        ivdr_api_url=os.getenv("HERMES_IVDR_API_URL", "").strip().rstrip("/"),
        digest_interval_seconds=int(
            os.getenv("HERMES_DIGEST_INTERVAL_SECONDS", "0") or "0"
        ),
    )
