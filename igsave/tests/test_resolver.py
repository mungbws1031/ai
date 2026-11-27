import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

import _resolver as resolver
from _resolver import ExtractorError, resolve

CDN = "https://scontent.cdninstagram.com/v/"


def _patch(monkeypatch, result=None, error=None):
    def fake(url):
        if error:
            raise ExtractorError(error)
        return result

    monkeypatch.setattr(resolver, "_run_extractors", fake)


def test_carousel_returns_all_items(monkeypatch):
    _patch(monkeypatch, [
        {"type": "image", "url": CDN + "1.jpg", "thumb": None},
        {"type": "image", "url": CDN + "2.jpg", "thumb": None},
        {"type": "video", "url": CDN + "3.mp4", "thumb": CDN + "3.jpg"},
    ])
    out = resolve("https://www.instagram.com/p/ABC/?igsh=x")
    assert out["ok"] is True
    assert len(out["items"]) == 3


def test_blocked_and_private_reasons(monkeypatch):
    _patch(monkeypatch, error="blocked")
    assert resolve("https://www.instagram.com/p/ABC/") == {"ok": False, "error": "blocked"}
    _patch(monkeypatch, error="private_or_login")
    assert resolve("https://www.instagram.com/p/ABC/")["error"] == "private_or_login"


def test_unsupported_url_never_calls_extractor(monkeypatch):
    def boom(url):
        raise AssertionError("must not be called")

    monkeypatch.setattr(resolver, "_run_extractors", boom)
    assert resolve("https://evil.com/?u=instagram.com") == {"ok": False, "error": "unsupported_url"}


def test_items_on_foreign_hosts_are_dropped(monkeypatch):
    _patch(monkeypatch, [
        {"type": "image", "url": "https://evil.com/a.jpg", "thumb": None},
        {"type": "image", "url": CDN + "ok.jpg", "thumb": None},
    ])
    out = resolve("https://www.instagram.com/p/ABC/")
    assert [i["url"] for i in out["items"]] == [CDN + "ok.jpg"]


def test_empty_result_is_not_found_not_blank_success(monkeypatch):
    _patch(monkeypatch, [])
    assert resolve("https://www.instagram.com/p/ABC/") == {"ok": False, "error": "not_found"}


def test_classify_error_maps_messages():
    assert resolver.classify_error("HTTP Error 429: Too Many Requests") == "blocked"
    assert resolver.classify_error("login required") == "private_or_login"
    assert resolver.classify_error("Private account") == "private_or_login"
    assert resolver.classify_error("HTTP Error 404") == "not_found"


def test_classify_prefers_private_over_403_and_unknown_is_not_blocked():
    assert resolver.classify_error("HTTP Error 403: Forbidden ... login required") == "private_or_login"
    assert resolver.classify_error("something weird happened") == "unknown"
    assert resolver.classify_error("No module named gallery_dl") == "unknown"


def test_specific_error_beats_unknown(monkeypatch):
    monkeypatch.setattr(resolver, "_gallery_dl", lambda u: (_ for _ in ()).throw(resolver.ExtractorError("unknown")))
    monkeypatch.setattr(resolver, "_yt_dlp", lambda u: (_ for _ in ()).throw(resolver.ExtractorError("private_or_login")))
    assert resolver.resolve("https://www.instagram.com/p/ABC/")["error"] == "private_or_login"
