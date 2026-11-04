"""Minimal async LLM client for an OpenAI-compatible chat endpoint.

Uses httpx (already a project dependency). The endpoint, key, and model are
read from the standard LLM_* environment variables so the bot reuses the same
configuration as the rest of the project.
"""

import httpx

from .config import HermesConfig


class LLMError(RuntimeError):
    """Raised when the LLM call fails or is not configured."""


async def ask_llm(config: HermesConfig, question: str) -> str:
    """Send a single question to the chat endpoint and return the reply text.

    Expects an OpenAI-compatible /chat/completions response shape. Raises
    LLMError on misconfiguration or transport/HTTP failure so the caller can
    surface a friendly message in the chat.
    """
    if not config.llm_enabled:
        raise LLMError(
            "LLM is not configured. Set LLM_API_KEY, LLM_API_URL, LLM_MODEL."
        )

    payload = {
        "model": config.llm_model,
        "messages": [
            {"role": "system", "content": config.llm_system_prompt},
            {"role": "user", "content": question},
        ],
    }
    headers = {
        "Authorization": f"Bearer {config.llm_api_key}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                config.llm_api_url, json=payload, headers=headers
            )
    except httpx.HTTPError as exc:
        raise LLMError(f"LLM connection error: {exc}") from exc

    if resp.status_code >= 400:
        raise LLMError(
            f"LLM API HTTP {resp.status_code}: {resp.text[:500]}"
        )

    try:
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise LLMError(
            f"Unexpected LLM response shape: {resp.text[:500]}"
        ) from exc
