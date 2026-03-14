from pathlib import Path
import json
from typing import Any

from app.core.config import settings


class DriveService:
    """Google Drive connector with mock fallback for local development/tests."""

    REQUIRED_FOLDERS = ("templates", "regulations", "sop", "evidence", "outputs")

    def __init__(self, mode: str | None = None):
        self.mode = (mode or settings.google_drive_mode or "mock").lower()
        self._service = None

    def connect_project_folder(self, folder_id: str) -> dict:
        """Return canonical mapping for the IVDR_PROJECT folder structure."""
        if not folder_id:
            raise ValueError("folder_id is required")

        mapping = {"root": folder_id}
        if self.mode == "mock":
            for name in self.REQUIRED_FOLDERS:
                mapping[name] = f"mock-{name}"
            mapping["structure_valid"] = True
            return mapping

        folders = self._scan_folder_children(folder_id, only_folders=True)
        by_name = {item["name"].lower(): item["id"] for item in folders}
        missing = [name for name in self.REQUIRED_FOLDERS if name not in by_name]
        mapping.update({name: by_name.get(name, "") for name in self.REQUIRED_FOLDERS})
        mapping["structure_valid"] = len(missing) == 0
        mapping["missing_folders"] = missing
        return mapping

    def sync_project(self, mapping: dict, selected_folders: list[str] | None = None) -> dict:
        if self.mode == "mock":
            return self._sync_mock(mapping, selected_folders)

        root = mapping.get("root") or settings.google_drive_root_id
        if not root:
            raise ValueError("Drive root folder is not configured")

        index = self.index_project_files(mapping)
        files = index["files"]
        if selected_folders:
            allowed = {item.lower() for item in selected_folders}
            files = [f for f in files if f.get("folder", "").lower() in allowed or f.get("folder_name", "").lower() in allowed]
        return {"files": files, "folders": selected_folders or [], "mapping": mapping or {"root": root}}

    def index_project_files(self, mapping: dict) -> dict:
        if self.mode == "mock":
            data = self._sync_mock(mapping, None)
            data["templates"] = [f for f in data["files"] if f.get("type") == "template"]
            return data

        folder_ids = self._resolve_folder_ids(mapping)
        files: list[dict[str, Any]] = []

        for folder_name, folder_id in folder_ids.items():
            if not folder_id:
                continue
            for item in self._scan_folder_children(folder_id):
                kind = self.detect_file_kind(item["name"])
                files.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "folder": folder_name,
                        "folder_name": folder_name,
                        "type": "template" if folder_name == "templates" else kind,
                        "mime_type": item.get("mimeType", ""),
                    }
                )

        return {
            "files": files,
            "folders": list(folder_ids.keys()),
            "mapping": mapping,
            "templates": [f for f in files if f["folder"] == "templates"],
        }

    def list_templates(self, mapping: dict) -> list[dict]:
        return self.index_project_files(mapping).get("templates", [])

    def resolve_template_path(self, mapping: dict, template_name: str) -> str | None:
        """Download selected drive template to local cache and return local file path."""
        if self.mode == "mock":
            return None

        templates = self.list_templates(mapping)
        template_id = ""
        if template_name.startswith("drive:"):
            template_id = template_name.split(":", 1)[1].strip()
        else:
            for item in templates:
                if item["name"] == template_name:
                    template_id = item["id"]
                    break

        if not template_id:
            return None

        cache_dir = Path(settings.storage_path) / "templates"
        cache_dir.mkdir(parents=True, exist_ok=True)
        output_path = cache_dir / f"{template_id}.docx"
        self._download_file(template_id, output_path)
        return str(output_path)

    def upload_output(self, mapping: dict, output_path: str) -> dict:
        if self.mode == "mock":
            return {"uploaded": False, "mode": "mock", "output_path": output_path}

        output_folder = (mapping or {}).get("outputs")
        if not output_folder:
            raise ValueError("Drive outputs folder is missing from mapping")

        file_id = self._upload_file(Path(output_path), output_folder)
        return {"uploaded": True, "file_id": file_id, "folder_id": output_folder}

    def detect_file_kind(self, filename: str) -> str:
        name = filename.lower()
        if name.endswith(".docx"):
            return "template_or_prior_doc"
        if name.endswith(".pdf"):
            return "evidence_or_regulation"
        if name.endswith(".txt"):
            return "text_source"
        return "unknown"

    def _sync_mock(self, mapping: dict, selected_folders: list[str] | None) -> dict:
        mock_file = Path("backend/data/mock_drive/index.json")
        index = json.loads(mock_file.read_text()) if mock_file.exists() else {"files": []}
        files = index.get("files", [])
        if selected_folders:
            allowed = {item.lower() for item in selected_folders}
            files = [f for f in files if f.get("folder", "").lower() in allowed or not f.get("folder")]
        return {"files": files, "folders": selected_folders or [], "mapping": mapping}

    def _resolve_folder_ids(self, mapping: dict) -> dict:
        root_id = (mapping or {}).get("root") or settings.google_drive_root_id
        if not root_id:
            raise ValueError("Drive root folder is not configured")

        result = {name: (mapping or {}).get(name, "") for name in self.REQUIRED_FOLDERS}
        if all(result.values()):
            return result

        children = self._scan_folder_children(root_id, only_folders=True)
        by_name = {item["name"].lower(): item["id"] for item in children}
        for name in self.REQUIRED_FOLDERS:
            result[name] = result[name] or by_name.get(name, "")
        return result

    def _build_service(self):
        if self._service is not None:
            return self._service

        try:
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build
        except Exception as exc:
            raise RuntimeError("Google Drive client libraries are not installed") from exc

        if not settings.google_service_account_json:
            raise RuntimeError("GOOGLE_SERVICE_ACCOUNT_JSON is not configured")

        creds = Credentials.from_service_account_file(
            settings.google_service_account_json,
            scopes=["https://www.googleapis.com/auth/drive"],
        )
        self._service = build("drive", "v3", credentials=creds, cache_discovery=False)
        return self._service

    def _scan_folder_children(self, folder_id: str, only_folders: bool = False) -> list[dict]:
        service = self._build_service()
        q = [f"'{folder_id}' in parents", "trashed = false"]
        if only_folders:
            q.append("mimeType = 'application/vnd.google-apps.folder'")

        fields = "files(id,name,mimeType)"
        params = {
            "q": " and ".join(q),
            "fields": fields,
            "pageSize": 1000,
            "includeItemsFromAllDrives": True,
            "supportsAllDrives": True,
        }
        if settings.google_drive_shared_drive_id:
            params["corpora"] = "drive"
            params["driveId"] = settings.google_drive_shared_drive_id

        response = service.files().list(**params).execute()
        return response.get("files", [])

    def _download_file(self, file_id: str, output_path: Path) -> None:
        service = self._build_service()
        from googleapiclient.http import MediaIoBaseDownload

        request = service.files().get_media(fileId=file_id, supportsAllDrives=True)
        with output_path.open("wb") as handle:
            downloader = MediaIoBaseDownload(handle, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()

    def _upload_file(self, path: Path, parent_folder_id: str) -> str:
        service = self._build_service()
        from googleapiclient.http import MediaFileUpload

        media = MediaFileUpload(str(path), mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        body = {"name": path.name, "parents": [parent_folder_id]}
        response = service.files().create(body=body, media_body=media, fields="id", supportsAllDrives=True).execute()
        return response["id"]
