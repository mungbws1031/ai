#!/usr/bin/env python3
"""DocBox — 개인용 웹 문서함 (클라우디움 스타일 문서중앙화의 1인용 버전).

외부 라이브러리 없이 Python 표준 라이브러리만 사용합니다.

    python3 server.py                      # http://127.0.0.1:8765
    DOCBOX_PASSWORD=비밀번호 python3 server.py --host 0.0.0.0

환경 변수
    DOCBOX_PASSWORD  설정하면 로그인 필요 (외부 접속 시 반드시 설정)
    DOCBOX_DATA      저장 폴더 (기본: 이 파일 옆의 data/)
    DOCBOX_MAX_MB    파일 1개 최대 크기 MB (기본 500)
"""
import argparse
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import shutil
import sqlite3
import tempfile
import threading
import time
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlparse

BASE = Path(__file__).resolve().parent
DATA = Path(os.environ.get("DOCBOX_DATA", BASE / "data")).resolve()
BLOBS = DATA / "blobs"
DB_PATH = DATA / "docbox.sqlite3"
STATIC = BASE / "static"
PASSWORD = os.environ.get("DOCBOX_PASSWORD", "")
MAX_BYTES = int(float(os.environ.get("DOCBOX_MAX_MB", "500")) * 1024 * 1024)
TEXT_INDEX_LIMIT = 2 * 1024 * 1024  # 검색용 본문은 앞 2MB까지만 저장

# 브라우저에서 바로 열어도 안전한 형식만 inline 미리보기 (html/svg 등은 다운로드 강제)
INLINE_SAFE = {
    "image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp",
    "application/pdf", "text/plain", "text/markdown", "text/csv",
    "audio/mpeg", "audio/wav", "audio/ogg", "video/mp4", "video/webm",
}
TEXT_EXT = {".txt", ".md", ".csv", ".json", ".log", ".py", ".js", ".ts", ".html",
            ".css", ".xml", ".yml", ".yaml", ".ini", ".tsv", ".sql", ".sh"}

SESSIONS: set[str] = set()
DB_LOCK = threading.Lock()


# ---------------------------------------------------------------- DB
def db():
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    return con


def init_db():
    BLOBS.mkdir(parents=True, exist_ok=True)
    with db() as con:
        con.executescript(
            """
            CREATE TABLE IF NOT EXISTS folders (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                parent_id INTEGER REFERENCES folders(id)
            );
            CREATE TABLE IF NOT EXISTS docs (
                id INTEGER PRIMARY KEY,
                folder_id INTEGER REFERENCES folders(id),
                name TEXT NOT NULL,
                tags TEXT NOT NULL DEFAULT '',
                starred INTEGER NOT NULL DEFAULT 0,
                deleted INTEGER NOT NULL DEFAULT 0,
                created REAL NOT NULL,
                updated REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS versions (
                id INTEGER PRIMARY KEY,
                doc_id INTEGER NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
                ver INTEGER NOT NULL,
                size INTEGER NOT NULL,
                sha256 TEXT NOT NULL,
                mime TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                created REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_docs_folder ON docs(folder_id);
            CREATE INDEX IF NOT EXISTS idx_ver_doc ON versions(doc_id);
            """
        )


def blob_path(sha: str) -> Path:
    return BLOBS / sha[:2] / sha


def gc_blob(con, sha: str):
    """어떤 버전도 참조하지 않는 원본 파일은 삭제."""
    n = con.execute("SELECT COUNT(*) FROM versions WHERE sha256=?", (sha,)).fetchone()[0]
    if n == 0:
        p = blob_path(sha)
        if p.exists():
            p.unlink()


def folder_descendants(con, fid: int) -> list[int]:
    out, stack = [], [fid]
    while stack:
        cur = stack.pop()
        out.append(cur)
        stack += [r[0] for r in con.execute("SELECT id FROM folders WHERE parent_id=?", (cur,))]
    return out


def doc_row(con, r) -> dict:
    v = con.execute(
        "SELECT id, ver, size, mime, created FROM versions WHERE doc_id=? ORDER BY ver DESC LIMIT 1",
        (r["id"],),
    ).fetchone()
    return {
        "id": r["id"], "name": r["name"], "folder_id": r["folder_id"],
        "tags": [t for t in r["tags"].split(",") if t], "starred": bool(r["starred"]),
        "deleted": bool(r["deleted"]), "created": r["created"], "updated": r["updated"],
        "ver": v["ver"] if v else 0, "size": v["size"] if v else 0,
        "mime": v["mime"] if v else "", "version_id": v["id"] if v else None,
    }


def clean_tags(tags) -> str:
    if isinstance(tags, str):
        tags = tags.split(",")
    seen = []
    for t in tags or []:
        t = str(t).strip().lstrip("#")[:40]
        if t and t not in seen:
            seen.append(t)
    return ",".join(seen)


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "DocBox/1.0"

    def log_message(self, fmt, *args):  # 조용한 로그
        print("%s - %s" % (self.address_string(), fmt % args))

    # ---- helpers
    def send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def err(self, status, msg):
        self.send_json({"error": msg}, status)

    def read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 1024 * 1024:
            raise ValueError("요청이 너무 큽니다")
        raw = self.rfile.read(n) if n else b"{}"
        return json.loads(raw or b"{}")

    def authed(self) -> bool:
        if not PASSWORD:
            return True
        c = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        tok = c.get("docbox")
        return bool(tok and tok.value in SESSIONS)

    def same_origin(self) -> bool:
        """쓰기 요청에 대한 간단한 CSRF 방어."""
        origin = self.headers.get("Origin")
        if not origin:
            return True
        return urlparse(origin).netloc == self.headers.get("Host")

    # ---- routing
    def do_GET(self):
        self.route("GET")

    def do_POST(self):
        self.route("POST")

    def do_PATCH(self):
        self.route("PATCH")

    def do_DELETE(self):
        self.route("DELETE")

    def route(self, method):
        u = urlparse(self.path)
        path, qs = u.path, parse_qs(u.query)
        try:
            if not path.startswith("/api/"):
                return self.static(path) if method == "GET" else self.err(405, "허용되지 않음")
            if method != "GET" and not self.same_origin():
                return self.err(403, "다른 출처의 요청은 거부됩니다")
            if path == "/api/me":
                return self.send_json({"authed": self.authed(), "needs_password": bool(PASSWORD)})
            if path == "/api/login" and method == "POST":
                return self.login()
            if path == "/api/logout" and method == "POST":
                return self.logout()
            if not self.authed():
                return self.err(401, "로그인이 필요합니다")
            parts = path.strip("/").split("/")[1:]  # ['docs', '3', 'restore']
            handler = getattr(self, f"api_{method.lower()}_{parts[0]}", None)
            if not handler:
                return self.err(404, "없는 API")
            return handler(parts[1:], qs)
        except (ValueError, KeyError, sqlite3.IntegrityError) as e:
            return self.err(400, str(e) or "잘못된 요청")
        except BrokenPipeError:
            pass

    def static(self, path):
        name = "index.html" if path in ("/", "") else path.lstrip("/")
        p = (STATIC / name).resolve()
        if STATIC not in p.parents or not p.is_file():
            return self.err(404, "없음")
        data = p.read_bytes()
        self.send_response(200)
        ctype = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype.endswith("javascript") or ctype.endswith("json"):
            ctype += "; charset=utf-8"
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ---- auth
    def login(self):
        body = self.read_json()
        if not PASSWORD or hmac.compare_digest(str(body.get("password", "")), PASSWORD):
            tok = secrets.token_urlsafe(32)
            SESSIONS.add(tok)
            self.send_response(200)
            self.send_header(
                "Set-Cookie",
                f"docbox={tok}; HttpOnly; SameSite=Strict; Path=/; Max-Age={60*60*24*30}",
            )
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", "11")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
        else:
            time.sleep(1)  # 무차별 대입 속도 늦추기
            self.err(401, "비밀번호가 틀렸습니다")

    def logout(self):
        c = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        if c.get("docbox"):
            SESSIONS.discard(c["docbox"].value)
        self.send_json({"ok": True})

    # ---- folders
    def api_get_folders(self, parts, qs):
        with db() as con:
            rows = con.execute("SELECT id, name, parent_id FROM folders ORDER BY name").fetchall()
            counts = dict(con.execute(
                "SELECT folder_id, COUNT(*) FROM docs WHERE deleted=0 GROUP BY folder_id").fetchall())
        self.send_json([{**dict(r), "count": counts.get(r["id"], 0)} for r in rows])

    def api_post_folders(self, parts, qs):
        b = self.read_json()
        name = str(b.get("name", "")).strip()[:100]
        if not name:
            raise ValueError("폴더 이름을 입력하세요")
        with DB_LOCK, db() as con:
            cur = con.execute("INSERT INTO folders(name, parent_id) VALUES(?, ?)",
                              (name, b.get("parent_id")))
        self.send_json({"id": cur.lastrowid})

    def api_patch_folders(self, parts, qs):
        fid, b = int(parts[0]), self.read_json()
        with DB_LOCK, db() as con:
            if "name" in b:
                con.execute("UPDATE folders SET name=? WHERE id=?", (str(b["name"]).strip()[:100], fid))
            if "parent_id" in b:
                pid = b["parent_id"]
                if pid is not None and int(pid) in folder_descendants(con, fid):
                    raise ValueError("자기 하위 폴더로는 옮길 수 없습니다")
                con.execute("UPDATE folders SET parent_id=? WHERE id=?", (pid, fid))
        self.send_json({"ok": True})

    def api_delete_folders(self, parts, qs):
        fid = int(parts[0])
        with DB_LOCK, db() as con:
            ids = folder_descendants(con, fid)
            q = ",".join("?" * len(ids))
            n = con.execute(f"SELECT COUNT(*) FROM docs WHERE folder_id IN ({q}) AND deleted=0", ids).fetchone()[0]
            if n:
                raise ValueError(f"폴더 안에 문서 {n}개가 있습니다. 먼저 옮기거나 삭제하세요")
            con.execute(f"UPDATE docs SET folder_id=NULL WHERE folder_id IN ({q})", ids)  # 휴지통 문서
            for i in reversed(ids):
                con.execute("DELETE FROM folders WHERE id=?", (i,))
        self.send_json({"ok": True})

    # ---- docs
    def api_get_docs(self, parts, qs):
        with db() as con:
            if parts:
                r = con.execute("SELECT * FROM docs WHERE id=?", (int(parts[0]),)).fetchone()
                if not r:
                    return self.err(404, "문서 없음")
                vers = con.execute(
                    "SELECT id, ver, size, mime, note, created, sha256 FROM versions WHERE doc_id=? ORDER BY ver DESC",
                    (r["id"],)).fetchall()
                return self.send_json({**doc_row(con, r), "versions": [dict(v) for v in vers]})

            where, args = [], []
            view = qs.get("view", ["all"])[0]
            where.append("d.deleted=?")
            args.append(1 if view == "trash" else 0)
            if view == "starred":
                where.append("d.starred=1")
            if "folder" in qs and view == "all":
                f = qs["folder"][0]
                if f == "root":
                    where.append("d.folder_id IS NULL")
                else:
                    ids = folder_descendants(con, int(f)) if qs.get("deep", ["0"])[0] == "1" else [int(f)]
                    where.append(f"d.folder_id IN ({','.join('?' * len(ids))})")
                    args += ids
            if qs.get("tag"):
                where.append("(',' || d.tags || ',') LIKE ?")
                args.append(f"%,{qs['tag'][0]},%")
            q = qs.get("q", [""])[0].strip()
            if q:
                for word in q.split():
                    like = f"%{word}%"
                    where.append(
                        "(d.name LIKE ? OR d.tags LIKE ? OR EXISTS (SELECT 1 FROM versions v "
                        "WHERE v.doc_id=d.id AND (v.body LIKE ? OR v.note LIKE ?)))")
                    args += [like, like, like, like]
            sort = {"name": "d.name COLLATE NOCASE", "created": "d.created DESC"}.get(
                qs.get("sort", [""])[0], "d.updated DESC")
            rows = con.execute(
                f"SELECT d.* FROM docs d WHERE {' AND '.join(where)} ORDER BY {sort} LIMIT 2000", args
            ).fetchall()
            self.send_json([doc_row(con, r) for r in rows])

    def api_patch_docs(self, parts, qs):
        did, b = int(parts[0]), self.read_json()
        with DB_LOCK, db() as con:
            if "name" in b and str(b["name"]).strip():
                con.execute("UPDATE docs SET name=? WHERE id=?", (str(b["name"]).strip()[:255], did))
            if "tags" in b:
                con.execute("UPDATE docs SET tags=? WHERE id=?", (clean_tags(b["tags"]), did))
            if "folder_id" in b:
                con.execute("UPDATE docs SET folder_id=? WHERE id=?", (b["folder_id"], did))
            if "starred" in b:
                con.execute("UPDATE docs SET starred=? WHERE id=?", (1 if b["starred"] else 0, did))
        self.send_json({"ok": True})

    def api_delete_docs(self, parts, qs):
        did = int(parts[0])
        with DB_LOCK, db() as con:
            if qs.get("purge", ["0"])[0] == "1":
                shas = [r[0] for r in con.execute("SELECT DISTINCT sha256 FROM versions WHERE doc_id=?", (did,))]
                con.execute("DELETE FROM versions WHERE doc_id=?", (did,))
                con.execute("DELETE FROM docs WHERE id=?", (did,))
                for s in shas:
                    gc_blob(con, s)
            else:
                con.execute("UPDATE docs SET deleted=1, updated=? WHERE id=?", (time.time(), did))
        self.send_json({"ok": True})

    def api_post_docs(self, parts, qs):
        """POST /api/docs/<id>/restore  (휴지통 복원)"""
        if len(parts) == 2 and parts[1] == "restore":
            with DB_LOCK, db() as con:
                con.execute("UPDATE docs SET deleted=0, updated=? WHERE id=?", (time.time(), int(parts[0])))
            return self.send_json({"ok": True})
        self.err(404, "없는 API")

    def api_post_versions(self, parts, qs):
        """POST /api/versions/<vid>/restore → 예전 버전을 최신 버전으로 복사"""
        if len(parts) != 2 or parts[1] != "restore":
            return self.err(404, "없는 API")
        with DB_LOCK, db() as con:
            v = con.execute("SELECT * FROM versions WHERE id=?", (int(parts[0]),)).fetchone()
            if not v:
                return self.err(404, "버전 없음")
            nxt = con.execute("SELECT MAX(ver) FROM versions WHERE doc_id=?", (v["doc_id"],)).fetchone()[0] + 1
            now = time.time()
            con.execute(
                "INSERT INTO versions(doc_id, ver, size, sha256, mime, note, body, created) VALUES(?,?,?,?,?,?,?,?)",
                (v["doc_id"], nxt, v["size"], v["sha256"], v["mime"], f"v{v['ver']}에서 복원", v["body"], now))
            con.execute("UPDATE docs SET updated=? WHERE id=?", (now, v["doc_id"]))
        self.send_json({"ok": True, "ver": nxt})

    # ---- upload: 원본 바이트를 그대로 POST (헤더로 파일명/폴더 전달)
    def api_post_upload(self, parts, qs):
        name = unquote(self.headers.get("X-Filename", "")).strip().replace("/", "_").replace("\\", "_")[:255]
        if not name:
            raise ValueError("파일 이름이 없습니다")
        folder = self.headers.get("X-Folder") or None
        folder_id = int(folder) if folder and folder.isdigit() else None
        if folder_id is not None:
            with db() as con:
                if not con.execute("SELECT 1 FROM folders WHERE id=?", (folder_id,)).fetchone():
                    self.close_connection = True
                    return self.err(400, "없는 폴더입니다")
        note = unquote(self.headers.get("X-Note", ""))[:300]
        length = int(self.headers.get("Content-Length") or -1)
        if length < 0:
            raise ValueError("Content-Length가 필요합니다")
        if length > MAX_BYTES:
            # 본문을 읽지 않고 거절
            self.close_connection = True
            return self.err(413, f"파일이 너무 큽니다 (최대 {MAX_BYTES // 1024 // 1024}MB)")

        h = hashlib.sha256()
        head = bytearray()
        tmp = tempfile.NamedTemporaryFile(dir=DATA, delete=False)
        try:
            remaining = length
            while remaining > 0:
                chunk = self.rfile.read(min(1024 * 1024, remaining))
                if not chunk:
                    raise ValueError("업로드가 중간에 끊겼습니다")
                h.update(chunk)
                tmp.write(chunk)
                if len(head) < TEXT_INDEX_LIMIT:
                    head += chunk[: TEXT_INDEX_LIMIT - len(head)]
                remaining -= len(chunk)
            tmp.close()
            sha = h.hexdigest()
            dest = blob_path(sha)
            dest.parent.mkdir(parents=True, exist_ok=True)
            if dest.exists():
                os.unlink(tmp.name)  # 같은 내용이 이미 있음 (중복 저장 안 함)
            else:
                shutil.move(tmp.name, dest)
        except Exception:
            tmp.close()
            if os.path.exists(tmp.name):
                os.unlink(tmp.name)
            raise

        mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
        body = ""
        if Path(name).suffix.lower() in TEXT_EXT or mime.startswith("text/"):
            body = bytes(head).decode("utf-8", errors="ignore")

        now = time.time()
        with DB_LOCK, db() as con:
            cond = "folder_id IS NULL" if folder_id is None else "folder_id=?"
            args = [name] + ([] if folder_id is None else [folder_id])
            d = con.execute(f"SELECT id FROM docs WHERE name=? AND {cond} AND deleted=0", args).fetchone()
            if d:
                did = d["id"]
                last = con.execute(
                    "SELECT ver, sha256 FROM versions WHERE doc_id=? ORDER BY ver DESC LIMIT 1", (did,)).fetchone()
                if last and last["sha256"] == sha:
                    return self.send_json({"id": did, "ver": last["ver"], "unchanged": True})
                ver = (last["ver"] if last else 0) + 1
                con.execute("UPDATE docs SET updated=? WHERE id=?", (now, did))
            else:
                did = con.execute(
                    "INSERT INTO docs(folder_id, name, created, updated) VALUES(?,?,?,?)",
                    (folder_id, name, now, now)).lastrowid
                ver = 1
            con.execute(
                "INSERT INTO versions(doc_id, ver, size, sha256, mime, note, body, created) VALUES(?,?,?,?,?,?,?,?)",
                (did, ver, length, sha, mime, note, body, now))
        self.send_json({"id": did, "ver": ver})

    # ---- file download / preview
    def api_get_file(self, parts, qs):
        vid = int(parts[0])
        with db() as con:
            v = con.execute(
                "SELECT v.*, d.name FROM versions v JOIN docs d ON d.id=v.doc_id WHERE v.id=?", (vid,)).fetchone()
        if not v:
            return self.err(404, "파일 없음")
        p = blob_path(v["sha256"])
        if not p.exists():
            return self.err(410, "원본 파일이 사라졌습니다")
        inline = qs.get("dl", ["0"])[0] != "1" and v["mime"] in INLINE_SAFE
        mime = v["mime"]
        if mime.startswith("text/"):
            mime += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", mime if inline else "application/octet-stream")
        self.send_header("Content-Length", str(p.stat().st_size))
        self.send_header("X-Content-Type-Options", "nosniff")
        if v["mime"] != "application/pdf":  # 크롬 PDF 뷰어는 sandbox 에서 안 열림
            self.send_header("Content-Security-Policy", "sandbox")
        self.send_header("Cache-Control", "private, max-age=3600")
        disp = "inline" if inline else "attachment"
        self.send_header("Content-Disposition", f"{disp}; filename*=UTF-8''{quote(v['name'])}")
        self.end_headers()
        with open(p, "rb") as f:
            shutil.copyfileobj(f, self.wfile, 1024 * 1024)

    # ---- stats
    def api_get_stats(self, parts, qs):
        with db() as con:
            docs = con.execute("SELECT COUNT(*) FROM docs WHERE deleted=0").fetchone()[0]
            trash = con.execute("SELECT COUNT(*) FROM docs WHERE deleted=1").fetchone()[0]
            vers = con.execute("SELECT COUNT(*) FROM versions").fetchone()[0]
            tags = {}
            for (t,) in con.execute("SELECT tags FROM docs WHERE deleted=0"):
                for x in filter(None, t.split(",")):
                    tags[x] = tags.get(x, 0) + 1
        used = sum(f.stat().st_size for f in BLOBS.rglob("*") if f.is_file())
        self.send_json({"docs": docs, "trash": trash, "versions": vers, "bytes": used,
                        "tags": sorted(tags.items(), key=lambda kv: -kv[1])})


def main():
    ap = argparse.ArgumentParser(description="DocBox 개인 문서함")
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 이면 같은 네트워크 기기에서 접속 가능")
    ap.add_argument("--port", type=int, default=8765)
    a = ap.parse_args()
    if a.host not in ("127.0.0.1", "localhost") and not PASSWORD:
        print("⚠️  외부 접속을 허용하면서 비밀번호가 없습니다. DOCBOX_PASSWORD 를 설정하세요.")
    init_db()
    print(f"DocBox 실행 중 → http://{a.host}:{a.port}   (저장 위치: {DATA})")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
