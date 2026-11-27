"""Resolve an Instagram/Threads post link into downloadable media items."""
import json
import subprocess
import sys

from _validate import is_allowed_media_host, validate_post_url

TIMEOUT_SEC = 12  # two extractors in sequence must fit Vercel maxDuration (30s)
VIDEO_EXT = (".mp4", ".mov", ".webm", ".m4v")


class ExtractorError(Exception):
    """Raised with a reason code: blocked, private_or_login, not_found."""


def classify_error(message):
    m = (message or "").lower()
    if "login" in m or "private" in m or "401" in m or "authentication" in m or "cookies" in m:
        return "private_or_login"
    if "429" in m or "too many" in m or "rate limit" in m or "403" in m or "challenge" in m or "proxy" in m:
        return "blocked"
    if "404" in m or "not found" in m or "unavailable" in m:
        return "not_found"
    return "unknown"


def _kind(url):
    path = url.split("?", 1)[0].lower()
    return "video" if path.endswith(VIDEO_EXT) else "image"


def _gallery_dl(url):
    proc = subprocess.run(
        [sys.executable, "-m", "gallery_dl", "-j", url],
        capture_output=True, text=True, timeout=TIMEOUT_SEC,
    )
    if proc.returncode != 0 and not proc.stdout.strip():
        raise ExtractorError(classify_error(proc.stderr))
    try:
        entries = json.loads(proc.stdout or "[]")
    except json.JSONDecodeError:
        raise ExtractorError("not_found")
    items = []
    for e in entries:
        if isinstance(e, list) and len(e) >= 2 and e[0] == 3 and isinstance(e[1], str):
            meta = e[2] if len(e) > 2 and isinstance(e[2], dict) else {}
            items.append({"type": _kind(e[1]), "url": e[1], "thumb": meta.get("display_url")})
    return items


def _yt_dlp(url):
    import yt_dlp

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "skip_download": True, "socket_timeout": TIMEOUT_SEC}) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as exc:  # yt-dlp raises many types
        raise ExtractorError(classify_error(str(exc)))
    entries = info.get("entries") or [info]
    return [
        {"type": "video", "url": e["url"], "thumb": e.get("thumbnail")}
        for e in entries if e and e.get("url")
    ]


def _run_extractors(url):
    """Try gallery-dl first (photos/carousels/threads), then yt-dlp (reels)."""
    last = None
    try:
        items = _gallery_dl(url)
        if items:
            return items
    except ExtractorError as exc:
        last = exc
    except (subprocess.TimeoutExpired, FileNotFoundError):
        last = ExtractorError("blocked")
    try:
        return _yt_dlp(url)
    except ExtractorError as exc:
        # keep the more specific reason; "unknown" never hides a real one
        if str(exc) == "unknown" and last is not None:
            raise last
        raise
    except ImportError:
        if last:
            raise last
        return []


def resolve(url):
    clean = validate_post_url(url)
    if clean is None:
        return {"ok": False, "error": "unsupported_url"}
    try:
        raw = _run_extractors(clean)
    except ExtractorError as exc:
        return {"ok": False, "error": str(exc)}
    items = [i for i in raw if is_allowed_media_host(i.get("url", ""))]
    for i in items:
        if i.get("thumb") and not is_allowed_media_host(i["thumb"]):
            i["thumb"] = None
    if not items:
        return {"ok": False, "error": "not_found"}
    return {"ok": True, "items": items}
