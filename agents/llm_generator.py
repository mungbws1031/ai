"""Optional LLM concept generation helpers.

This module is intentionally vendor-neutral and uses only Python's standard library.
To connect to a specific provider, update:
- API endpoint URL
- request headers
- request payload shape
- response parsing logic

You can keep the local JSON workflow even if this module is never used.
"""

import json
import os
import urllib.error
import urllib.request
from typing import Dict


def get_llm_settings() -> Dict[str, str]:
    """Read LLM settings from environment variables.

    Expected environment variables (customize as needed):
    - LLM_API_KEY
    - LLM_API_URL
    - LLM_MODEL
    """
    return {
        "api_key": os.getenv("LLM_API_KEY", ""),
        "api_url": os.getenv("LLM_API_URL", ""),
        "model": os.getenv("LLM_MODEL", ""),
    }


def build_default_prompt() -> str:
    """Build a baseline prompt for LFA urine metering concept generation."""
    return (
        "Generate 3 concept ideas for an LFA urine metering stick. "
        "Constraints: 120 uL target, flat plastic stick, max thickness around 5.5 mm, "
        "width around 17.89 mm, dip sampling, stable carry behavior before reader insertion, "
        "stable transfer to LFA strip/pad, UX is important. "
        "For each concept include: name, summary, mechanism, strengths, weaknesses, "
        "likely failure modes, notes for prototyping."
    )


def send_prompt_to_llm(prompt: str, settings: Dict[str, str]) -> str:
    """Send a prompt to an LLM API and return plain text.

    This function contains placeholders for model-specific request/response formats.
    Adjust payload fields and response parsing for your provider.
    """
    api_key = settings.get("api_key", "")
    api_url = settings.get("api_url", "")
    model = settings.get("model", "")

    if not api_key:
        raise ValueError("Missing LLM_API_KEY environment variable.")
    if not api_url:
        raise ValueError("Missing LLM_API_URL environment variable.")
    if not model:
        raise ValueError("Missing LLM_MODEL environment variable.")

    # Placeholder payload shape: customize based on vendor.
    payload = {
        "model": model,
        "input": prompt,
        # Add provider-specific fields here (temperature, max_tokens, etc.)
    }

    data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        api_url,
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            # Placeholder auth style (common pattern). Adjust if needed.
            "Authorization": f"Bearer {api_key}",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"LLM API HTTP error: {exc.code} - {body}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"LLM API connection error: {exc.reason}") from exc

    # Placeholder response parsing:
    # Try to read a common shape first; fallback to raw text.
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict):
            if "output_text" in obj and isinstance(obj["output_text"], str):
                return obj["output_text"]
            if "text" in obj and isinstance(obj["text"], str):
                return obj["text"]
        return raw
    except json.JSONDecodeError:
        return raw


def generate_concept_ideas_with_llm(prompt: str = "") -> str:
    """Generate concept ideas using LLM settings from environment variables."""
    settings = get_llm_settings()
    final_prompt = prompt or build_default_prompt()
    return send_prompt_to_llm(final_prompt, settings)
