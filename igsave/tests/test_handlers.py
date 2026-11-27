import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

import _core as core

CDN = "https://scontent.cdninstagram.com/v/a.jpg"


def test_resolve_maps_error_codes_to_status(monkeypatch):
    monkeypatch.setattr(core, "resolve", lambda url: {"ok": False, "error": "blocked"})
    status, body = core.handle_resolve({"url": ["https://www.instagram.com/p/x/"]})
    assert status == 429 and body["error"] == "blocked"
    monkeypatch.setattr(core, "resolve", lambda url: {"ok": False, "error": "private_or_login"})
    assert core.handle_resolve({"url": ["https://www.instagram.com/p/x/"]})[0] == 403
    monkeypatch.setattr(core, "resolve", lambda url: {"ok": False, "error": "unsupported_url"})
    assert core.handle_resolve({"url": ["x"]})[0] == 400
    monkeypatch.setattr(core, "resolve", lambda url: {"ok": False, "error": "not_found"})
    assert core.handle_resolve({"url": ["x"]})[0] == 404


def test_resolve_missing_param_is_400():
    assert core.handle_resolve({})[0] == 400


def test_download_rejects_localhost_and_private_ip():
    for bad in ["https://localhost/a.jpg", "https://127.0.0.1/a.jpg",
                "https://169.254.169.254/latest", "http://scontent.cdninstagram.com/a.jpg"]:
        status, _headers, _body = core.handle_download({"u": [bad]}, opener=lambda u: (_ for _ in ()).throw(AssertionError))
        assert status == 400


def test_download_sets_attachment_header():
    class Resp:
        headers = {"Content-Type": "image/jpeg"}

        def read(self, n=-1):
            return b"bytes"

    status, headers, body = core.handle_download({"u": [CDN], "name": ["my pic.jpg"]}, opener=lambda u: Resp())
    assert status == 200
    assert headers["Content-Disposition"].startswith("attachment;")
    assert headers["Content-Type"] == "image/jpeg"
    assert body == b"bytes"


def test_download_filename_is_sanitized():
    class Resp:
        headers = {"Content-Type": "image/jpeg"}

        def read(self, n=-1):
            return b"x"

    _s, headers, _b = core.handle_download({"u": [CDN], "name": ['a"/../b\r\nX: y.jpg']}, opener=lambda u: Resp())
    disp = headers["Content-Disposition"]
    assert "\r" not in disp and "\n" not in disp and ".." not in disp and "/" not in disp


def test_download_rejects_oversized_by_content_length():
    class Big:
        headers = {"Content-Type": "video/mp4", "Content-Length": str(core.MAX_BYTES + 1)}

        def read(self, n=-1):
            raise AssertionError("must not read body")

    status, _h, _b = core.handle_download({"u": [CDN]}, opener=lambda u: Big())
    assert status == 413


def test_download_rejects_oversized_without_content_length():
    class Big:
        headers = {"Content-Type": "video/mp4"}

        def read(self, n=-1):
            return b"x" * (core.MAX_BYTES + 1)

    status, _h, _b = core.handle_download({"u": [CDN]}, opener=lambda u: Big())
    assert status == 413


def test_download_sets_nosniff_and_survives_incomplete_read():
    import http.client

    class Ok:
        headers = {"Content-Type": "image/jpeg"}

        def read(self, n=-1):
            return b"x"

    _s, headers, _b = core.handle_download({"u": [CDN]}, opener=lambda u: Ok())
    assert headers["X-Content-Type-Options"] == "nosniff"

    class Cut:
        headers = {}

        def read(self, n=-1):
            raise http.client.IncompleteRead(b"par")

    assert core.handle_download({"u": [CDN]}, opener=lambda u: Cut())[0] == 502
