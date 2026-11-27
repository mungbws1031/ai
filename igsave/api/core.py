"""Framework-free request logic, shared by the Vercel handlers and server.py."""
import re
import urllib.error
import urllib.request
from urllib.parse import quote

from resolver import resolve
from validate import is_allowed_media_host

STATUS_BY_ERROR = {
    "unsupported_url": 400,
    "private_or_login": 403,
    "not_found": 404,
    "blocked": 429,
}


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None  # never follow: a redirect could leave the allowed CDN hosts


def _default_opener(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.build_opener(_NoRedirect).open(req, timeout=25)


def _first(query, key):
    values = query.get(key) or []
    return values[0] if values else ""


def handle_resolve(query):
    url = _first(query, "url")
    if not url:
        return 400, {"ok": False, "error": "unsupported_url"}
    result = resolve(url)
    if result.get("ok"):
        return 200, result
    return STATUS_BY_ERROR.get(result.get("error"), 502), result


def _safe_name(name):
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name or "")
    name = name.replace("..", "_").strip("._")
    return name[:80] or "igsave-media"


def handle_download(query, opener=_default_opener):
    url = _first(query, "u")
    if not is_allowed_media_host(url):
        return 400, {"Content-Type": "text/plain"}, b"blocked host"
    try:
        resp = opener(url)
        body = resp.read()
    except (urllib.error.URLError, OSError):
        return 502, {"Content-Type": "text/plain"}, b"fetch failed"
    name = _safe_name(_first(query, "name"))
    headers = {
        "Content-Type": resp.headers.get("Content-Type", "application/octet-stream"),
        "Content-Disposition": "attachment; filename*=UTF-8''" + quote(name),
    }
    return 200, headers, body
