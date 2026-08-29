"""Minimal Notion API client using only the standard library."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Iterable, Iterator

NOTION_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


class NotionError(RuntimeError):
    pass


@dataclass
class NotionPage:
    id: str
    title: str
    url: str
    text: str
    last_edited_at: str


class NotionClient:
    def __init__(self, token: str) -> None:
        if not token:
            raise NotionError("NOTION_TOKEN is not set")
        self._token = token

    def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
        url = f"{NOTION_BASE}{path}"
        data = None
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Notion-Version": NOTION_VERSION,
            "Accept": "application/json",
        }
        if payload is not None:
            data = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")
            raise NotionError(f"Notion API {exc.code} at {path}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise NotionError(f"Notion network error at {path}: {exc}") from exc

    # --- discovery ----------------------------------------------------------

    def search_pages(self, page_size: int = 50) -> Iterator[dict]:
        cursor: str | None = None
        while True:
            payload: dict = {
                "filter": {"value": "page", "property": "object"},
                "page_size": page_size,
            }
            if cursor:
                payload["start_cursor"] = cursor
            resp = self._request("POST", "/search", payload)
            for result in resp.get("results", []):
                yield result
            if not resp.get("has_more"):
                return
            cursor = resp.get("next_cursor")

    def query_database(self, database_id: str, page_size: int = 50) -> Iterator[dict]:
        cursor: str | None = None
        while True:
            payload: dict = {"page_size": page_size}
            if cursor:
                payload["start_cursor"] = cursor
            resp = self._request("POST", f"/databases/{database_id}/query", payload)
            for result in resp.get("results", []):
                yield result
            if not resp.get("has_more"):
                return
            cursor = resp.get("next_cursor")

    # --- page content -------------------------------------------------------

    def get_page(self, page_id: str) -> dict:
        return self._request("GET", f"/pages/{page_id}")

    def list_blocks(self, block_id: str, page_size: int = 100) -> Iterator[dict]:
        cursor: str | None = None
        while True:
            query = f"?page_size={page_size}"
            if cursor:
                query += f"&start_cursor={cursor}"
            resp = self._request("GET", f"/blocks/{block_id}/children{query}")
            for block in resp.get("results", []):
                yield block
            if not resp.get("has_more"):
                return
            cursor = resp.get("next_cursor")

    # --- materialization ---------------------------------------------------

    def fetch_pages(self, database_ids: Iterable[str] = ()) -> Iterator[NotionPage]:
        seen: set[str] = set()
        sources: Iterator[dict]
        if database_ids:
            def _from_dbs() -> Iterator[dict]:
                for db_id in database_ids:
                    yield from self.query_database(db_id)
            sources = _from_dbs()
        else:
            sources = self.search_pages()

        for raw in sources:
            page_id = raw.get("id")
            if not page_id or page_id in seen:
                continue
            seen.add(page_id)
            title = _extract_title(raw)
            text = "\n".join(self._iter_block_text(page_id))
            yield NotionPage(
                id=page_id,
                title=title or "(untitled)",
                url=raw.get("url", ""),
                text=text,
                last_edited_at=raw.get("last_edited_time", ""),
            )

    def _iter_block_text(self, block_id: str, depth: int = 0) -> Iterator[str]:
        if depth > 6:
            return
        try:
            blocks = list(self.list_blocks(block_id))
        except NotionError:
            return
        for block in blocks:
            text = _block_plaintext(block)
            if text:
                yield text
            if block.get("has_children"):
                yield from self._iter_block_text(block["id"], depth + 1)


def _extract_title(page: dict) -> str:
    props = page.get("properties", {}) or {}
    # Most databases expose a "title" property; pages sometimes use "Name".
    for prop in props.values():
        if prop.get("type") == "title":
            return _rich_to_text(prop.get("title", []))
    return ""


def _block_plaintext(block: dict) -> str:
    btype = block.get("type")
    if not btype:
        return ""
    content = block.get(btype) or {}
    rich = content.get("rich_text")
    if isinstance(rich, list):
        text = _rich_to_text(rich)
        prefix = _bullet_for(btype)
        return f"{prefix}{text}" if prefix and text else text
    if btype == "code":
        return _rich_to_text(content.get("rich_text", []))
    return ""


def _rich_to_text(rich: list[dict]) -> str:
    return "".join(part.get("plain_text", "") for part in rich)


def _bullet_for(btype: str) -> str:
    return {
        "bulleted_list_item": "• ",
        "numbered_list_item": "- ",
        "to_do": "[ ] ",
        "quote": "> ",
        "heading_1": "# ",
        "heading_2": "## ",
        "heading_3": "### ",
    }.get(btype, "")
