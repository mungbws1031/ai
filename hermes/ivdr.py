"""Async client for the IVDR FastAPI backend.

Used for the /status command and the scheduled digest. The backend base URL
comes from HERMES_IVDR_API_URL (for example: http://localhost:8000/api).
"""

import httpx

from .config import HermesConfig


class IVDRError(RuntimeError):
    """Raised when the IVDR backend is unreachable or returns an error."""


async def _get(config: HermesConfig, path: str):
    url = f"{config.ivdr_api_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url)
    except httpx.HTTPError as exc:
        raise IVDRError(f"IVDR backend connection error: {exc}") from exc
    if resp.status_code >= 400:
        raise IVDRError(f"IVDR backend HTTP {resp.status_code} for {path}")
    try:
        return resp.json()
    except ValueError as exc:
        raise IVDRError("IVDR backend returned non-JSON response") from exc


async def build_status_summary(config: HermesConfig) -> str:
    """Return a human-readable summary of projects and their workflow runs."""
    if not config.ivdr_enabled:
        raise IVDRError(
            "IVDR backend not configured. Set HERMES_IVDR_API_URL."
        )

    projects = await _get(config, "/projects")
    if not projects:
        return "No IVDR projects found."

    lines: list[str] = ["*IVDR status*"]
    for project in projects[:10]:
        pid = project.get("id")
        name = project.get("name", f"project {pid}")
        lines.append(f"\n*{name}* (#{pid})")
        try:
            runs = await _get(config, f"/projects/{pid}/workflow-runs")
        except IVDRError:
            lines.append("  - (could not load runs)")
            continue
        if not runs:
            lines.append("  - no workflow runs")
            continue
        for run in runs[:5]:
            rid = run.get("id")
            status = run.get("status", "unknown")
            doc = run.get("document_type", run.get("doc_type", ""))
            label = f" {doc}" if doc else ""
            lines.append(f"  - run #{rid}{label}: {status}")

    return "\n".join(lines)
