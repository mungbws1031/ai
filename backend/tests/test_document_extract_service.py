import json
import subprocess

import pytest

from app.services.document_extract_service import DocumentExtractError, DocumentExtractService


def _make_docx(path):
    import docx

    doc = docx.Document()
    doc.add_heading("성능평가 계획서", 1)
    doc.add_paragraph("제1조(목적) 체외진단의료기기 성능평가")
    table = doc.add_table(rows=2, cols=2)
    for i, row in enumerate([("항목", "기준"), ("민감도", ">=95%")]):
        for j, text in enumerate(row):
            table.cell(i, j).text = text
    doc.save(path)


def test_rejects_unsupported_suffix(tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("x")
    with pytest.raises(DocumentExtractError, match="Unsupported"):
        DocumentExtractService(kordoc_bin="/bin/true").extract(f)


def test_reports_missing_cli(tmp_path):
    f = tmp_path / "a.pdf"
    f.write_bytes(b"%PDF-1.4")
    with pytest.raises(DocumentExtractError, match="kordoc CLI not found"):
        DocumentExtractService(kordoc_bin=str(tmp_path / "missing")).extract(f)


def test_extract_combines_json_and_chunks(tmp_path, monkeypatch):
    f = tmp_path / "a.hwpx"
    f.write_bytes(b"x")
    outputs = {
        "json": {"success": True, "fileType": "hwpx", "markdown": "# T", "blocks": [{"type": "table", "table": {"rows": 2, "cols": 2}}]},
        "chunks": [{"id": "c0001", "type": "heading", "breadcrumb": [], "text": "# T"}],
    }

    def fake_run(cmd, **kwargs):
        return subprocess.CompletedProcess(cmd, 0, stdout=json.dumps(outputs[cmd[-1]]), stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = DocumentExtractService(kordoc_bin="/bin/true").extract(f)

    assert result["source_file"] == "a.hwpx"
    assert result["tables"] == [{"rows": 2, "cols": 2}]
    assert result["chunks"][0]["id"] == "c0001"


def test_extract_surfaces_cli_failure(tmp_path, monkeypatch):
    f = tmp_path / "a.pdf"
    f.write_bytes(b"x")
    monkeypatch.setattr(subprocess, "run", lambda cmd, **kw: subprocess.CompletedProcess(cmd, 1, stdout="", stderr="boom"))
    with pytest.raises(DocumentExtractError, match="boom"):
        DocumentExtractService(kordoc_bin="/bin/true").extract(f)


def test_real_kordoc_extracts_table_from_docx(tmp_path):
    service = DocumentExtractService()
    if not service.is_available():
        pytest.skip("kordoc not installed (run `npm ci` in backend/tools/kordoc)")
    f = tmp_path / "plan.docx"
    _make_docx(f)

    result = service.extract(f)

    assert "| 민감도 | >=95% |" in result["markdown"]
    assert result["tables"][0]["rows"] == 2
    assert any(c["type"] == "table" for c in result["chunks"])
