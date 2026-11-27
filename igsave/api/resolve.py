import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, os.path.dirname(__file__))
from _core import handle_resolve  # noqa: E402


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        status, body = handle_resolve(parse_qs(urlparse(self.path).query))
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)
