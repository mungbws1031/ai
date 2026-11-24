"""PoC: extract Markdown/chunks from Korean office documents with the kordoc CLI.

kordoc is a Node.js tool, so it runs as a subprocess ("sidecar") from the pinned
install in backend/tools/kordoc. Extracted text is evidence material only: it is
never treated as approved content and keeps the source file name for traceability.
"""
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

from app.core.config import settings

SUPPORTED_SUFFIXES = {".hwp", ".hwpx", ".pdf", ".docx", ".xlsx"}
_LOCAL_BIN = Path(__file__).resolve().parents[2] / "tools" / "kordoc" / "node_modules" / ".bin" / "kordoc"


class DocumentExtractError(RuntimeError):
    pass


class DocumentExtractService:
    def __init__(self, kordoc_bin: str | None = None, timeout: int | None = None):
        self.kordoc_bin = kordoc_bin or settings.kordoc_bin or self._default_bin()
        self.timeout = timeout or settings.kordoc_timeout_seconds

    @staticmethod
    def _default_bin() -> str:
        if _LOCAL_BIN.exists():
            return str(_LOCAL_BIN)
        return shutil.which("kordoc") or ""

    def is_available(self) -> bool:
        return bool(self.kordoc_bin) and Path(self.kordoc_bin).exists()

    def extract(self, path: str | Path) -> dict[str, Any]:
        """Return {source_file, file_type, markdown, tables, chunks} for one document."""
        source = Path(path)
        if source.suffix.lower() not in SUPPORTED_SUFFIXES:
            raise DocumentExtractError(f"Unsupported file type: {source.suffix or '(none)'}")
        if not source.is_file():
            raise DocumentExtractError(f"File not found: {source}")
        if not self.is_available():
            raise DocumentExtractError("kordoc CLI not found; run `npm ci` in backend/tools/kordoc or set KORDOC_BIN")

        parsed = self._run(source, "json")
        if not parsed.get("success", False):
            raise DocumentExtractError(f"kordoc failed for {source.name}: {parsed.get('error', 'unknown error')}")
        chunks = self._run(source, "chunks")

        tables = [block["table"] for block in parsed.get("blocks", []) if block.get("type") == "table"]
        return {
            "source_file": source.name,
            "file_type": parsed.get("fileType", source.suffix.lstrip(".").lower()),
            "markdown": parsed.get("markdown", ""),
            "tables": tables,
            "chunks": chunks,
        }

    def _run(self, source: Path, output_format: str) -> Any:
        try:
            proc = subprocess.run(
                [self.kordoc_bin, str(source), "--format", output_format],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise DocumentExtractError(f"kordoc timed out after {self.timeout}s for {source.name}") from exc
        if proc.returncode != 0:
            raise DocumentExtractError(f"kordoc exited with {proc.returncode}: {proc.stderr.strip()[:300]}")
        try:
            return json.loads(proc.stdout)
        except json.JSONDecodeError as exc:
            raise DocumentExtractError(f"kordoc returned non-JSON output for {source.name}") from exc
