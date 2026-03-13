from pathlib import Path
import json


class DriveService:
    def __init__(self, mode: str = "mock"):
        self.mode = mode

    def sync_project(self, mapping: dict, selected_folders: list[str] | None = None) -> dict:
        if self.mode != "mock":
            return {"files": [], "folders": [], "note": "Google API integration placeholder"}

        mock_file = Path("backend/data/mock_drive/index.json")
        index = json.loads(mock_file.read_text()) if mock_file.exists() else {"files": []}
        files = index.get("files", [])
        if selected_folders:
            allowed = {item.lower() for item in selected_folders}
            files = [f for f in files if f.get("folder", "").lower() in allowed or not f.get("folder")]
        return {"files": files, "folders": selected_folders or [], "mapping": mapping}

    def detect_file_kind(self, filename: str) -> str:
        name = filename.lower()
        if name.endswith(".docx"):
            return "template_or_prior_doc"
        if name.endswith(".pdf"):
            return "evidence_or_regulation"
        if name.endswith(".txt"):
            return "text_source"
        return "unknown"
