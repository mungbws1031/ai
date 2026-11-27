import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from _validate import is_allowed_media_host, validate_post_url


def test_accepts_instagram_reel_with_igsh():
    url = "https://www.instagram.com/reel/ABC123/?igsh=xyz"
    assert validate_post_url(url) == url


def test_accepts_threads_post():
    assert validate_post_url("https://www.threads.net/@user/post/XYZ") is not None
    assert validate_post_url("https://threads.com/@user/post/XYZ") is not None


def test_rejects_lookalike_domain():
    assert validate_post_url("https://evil.com/?u=instagram.com") is None
    assert validate_post_url("https://instagram.com.evil.com/p/x") is None
    assert validate_post_url("https://evilinstagram.com/p/x") is None


def test_rejects_http_and_non_url():
    assert validate_post_url("http://www.instagram.com/p/x") is None
    assert validate_post_url("not a url") is None
    assert validate_post_url("") is None


def test_media_host_allows_cdn_suffix_only():
    assert is_allowed_media_host("https://scontent.cdninstagram.com/v/a.jpg")
    assert is_allowed_media_host("https://scontent-icn1-1.xx.fbcdn.net/v/a.mp4")
    assert not is_allowed_media_host("https://localhost/a.jpg")
    assert not is_allowed_media_host("https://127.0.0.1/a.jpg")
    assert not is_allowed_media_host("https://evil.com/cdninstagram.com")
    assert not is_allowed_media_host("https://evilcdninstagram.com/a.jpg")
    assert not is_allowed_media_host("http://scontent.cdninstagram.com/a.jpg")


def test_media_host_rejects_non_default_port():
    assert not is_allowed_media_host("https://scontent.cdninstagram.com:22/x")
    assert is_allowed_media_host("https://scontent.cdninstagram.com:443/x")
