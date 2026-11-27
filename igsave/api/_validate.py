"""URL validation: only Instagram/Threads post links in, only their CDNs out."""
from urllib.parse import urlparse

POST_HOSTS = {
    "instagram.com", "www.instagram.com",
    "threads.net", "www.threads.net",
    "threads.com", "www.threads.com",
}
MEDIA_HOST_SUFFIXES = ("cdninstagram.com", "fbcdn.net")


def validate_post_url(url):
    """Return the URL if it is an https Instagram/Threads link, else None."""
    try:
        parsed = urlparse((url or "").strip())
    except ValueError:
        return None
    if parsed.scheme != "https" or (parsed.hostname or "") not in POST_HOSTS:
        return None
    return url.strip()


def is_allowed_media_host(url):
    """True only for https URLs on the Instagram/Facebook CDN domains."""
    try:
        parsed = urlparse(url or "")
    except ValueError:
        return False
    host = parsed.hostname or ""
    try:
        port = parsed.port
    except ValueError:
        return False
    if parsed.scheme != "https" or port not in (None, 443):
        return False
    return any(host == s or host.endswith("." + s) for s in MEDIA_HOST_SUFFIXES)
