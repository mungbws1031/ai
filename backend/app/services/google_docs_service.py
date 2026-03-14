from datetime import datetime
from typing import Any

from app.core.config import settings


class GoogleDocsService:
    """Simple Google Docs comment sync service with mock fallback."""

    def __init__(self, mode: str | None = None):
        self.mode = (mode or settings.google_drive_mode or "mock").lower()
        self._service = None
        self._mock_comments: dict[str, list[dict[str, Any]]] = {}

    def create_comment(
        self,
        doc_file_id: str,
        body: str,
        quoted_text: str = "",
        evidence_refs: list[str] | None = None,
        author: str = "reviewer",
    ) -> dict:
        if self.mode == "mock":
            return self._create_mock_comment(doc_file_id, body, quoted_text, evidence_refs or [], author)

        service = self._build_service()
        request_body = {"content": body}
        created = service.comments().create(
            fileId=doc_file_id,
            body=request_body,
            fields="id,content,createdTime,modifiedTime,author/displayName,resolved",
            supportsAllDrives=True,
        ).execute()
        return {
            "id": created.get("id", ""),
            "author": created.get("author", {}).get("displayName", author),
            "body": created.get("content", body),
            "quoted_text": quoted_text,
            "evidence_refs": evidence_refs or [],
            "status": "resolved" if created.get("resolved") else "open",
            "updated_at": created.get("modifiedTime") or created.get("createdTime") or datetime.utcnow().isoformat(),
        }

    def list_comments(self, doc_file_id: str) -> list[dict]:
        if self.mode == "mock":
            return list(self._mock_comments.get(doc_file_id, []))

        service = self._build_service()
        response = service.comments().list(
            fileId=doc_file_id,
            fields="comments(id,content,createdTime,modifiedTime,author/displayName,resolved)",
            supportsAllDrives=True,
            includeDeleted=False,
        ).execute()

        comments = []
        for item in response.get("comments", []):
            comments.append(
                {
                    "id": item.get("id", ""),
                    "author": item.get("author", {}).get("displayName", "reviewer"),
                    "body": item.get("content", ""),
                    "quoted_text": "",
                    "evidence_refs": [],
                    "status": "resolved" if item.get("resolved") else "open",
                    "updated_at": item.get("modifiedTime") or item.get("createdTime") or datetime.utcnow().isoformat(),
                }
            )
        return comments

    def resolve_comment(self, doc_file_id: str, comment_id: str) -> dict:
        if self.mode == "mock":
            rows = self._mock_comments.get(doc_file_id, [])
            for row in rows:
                if row["id"] == comment_id:
                    row["status"] = "resolved"
                    row["updated_at"] = datetime.utcnow().isoformat()
                    return row
            raise ValueError("Comment not found")

        service = self._build_service()
        updated = service.comments().update(
            fileId=doc_file_id,
            commentId=comment_id,
            body={"resolved": True},
            fields="id,content,modifiedTime,resolved,author/displayName",
            supportsAllDrives=True,
        ).execute()
        return {
            "id": updated.get("id", comment_id),
            "author": updated.get("author", {}).get("displayName", "reviewer"),
            "body": updated.get("content", ""),
            "quoted_text": "",
            "evidence_refs": [],
            "status": "resolved" if updated.get("resolved") else "open",
            "updated_at": updated.get("modifiedTime") or datetime.utcnow().isoformat(),
        }

    def _create_mock_comment(self, doc_file_id: str, body: str, quoted_text: str, evidence_refs: list[str], author: str) -> dict:
        rows = self._mock_comments.setdefault(doc_file_id, [])
        comment_id = f"c-{len(rows) + 1}"
        item = {
            "id": comment_id,
            "author": author,
            "body": body,
            "quoted_text": quoted_text,
            "evidence_refs": evidence_refs,
            "status": "open",
            "updated_at": datetime.utcnow().isoformat(),
        }
        rows.append(item)
        return item

    def _build_service(self):
        if self._service is not None:
            return self._service

        try:
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
        except Exception as exc:
            raise RuntimeError("Google API client libraries are not installed") from exc

        if not settings.google_service_account_json:
            raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured")

        creds = Credentials.from_service_account_file(
            settings.google_service_account_json,
            scopes=["https://www.googleapis.com/auth/drive"],
        )
        self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
        return self._service
