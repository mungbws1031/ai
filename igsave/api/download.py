import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(__file__))
from _core import handle_download  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status, headers, body = handle_download(parse_qs(urlparse(self.path).query))
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)
