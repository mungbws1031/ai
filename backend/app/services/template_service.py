from pathlib import Path
from docx import Document


class TemplateService:
    STAGE_CODES = {
        "Draft": "v0.1",
        "Reviewed": "v0.2",
        "Revised": "v0.3",
    }

    def parse_template(self, template_name: str) -> dict:
        return {
            "template": template_name,
            "headings": [
                "1. Purpose",
                "2. Intended Use",
                "3. Performance Claims",
                "4. Risk Summary",
                "5. Evidence Table",
            ],
            "placeholders": ["{{PROJECT_NAME}}", "{{DOCUMENT_TYPE}}"],
            "table_mapping": {"Document Type": "{{DOCUMENT_TYPE}}", "Status": "{{STATUS}}"},
            "editable_regions": ["BODY", "TABLE_EVIDENCE"],
        }

    def build_versioned_output_path(self, output_root: str, document_type: str, stage: str) -> tuple[str, str]:
        safe_doc_type = document_type.replace(" ", "_")
        version = self.STAGE_CODES.get(stage, "v0.1")
        filename = f"{safe_doc_type}_{stage}_{version}.docx"
        root = Path(output_root)
        if root.suffix.lower() == ".docx":
            root = root.parent
        root.mkdir(parents=True, exist_ok=True)
        return str(root / filename), version

    def generate_docx(
        self,
        template_name: str,
        output_root: str,
        document_type: str,
        stage: str,
        sections: list[dict],
        placeholders: dict,
        change_summary: list[str],
    ) -> tuple[str, str]:
        output_path, version = self.build_versioned_output_path(output_root, document_type, stage)
        template_path = Path("backend/data/templates") / template_name
        document = Document(template_path) if template_path.exists() else Document()

        placeholder_values = {"{{DOCUMENT_TYPE}}": document_type, "{{STATUS}}": stage}
        placeholder_values.update(placeholders)

        for paragraph in document.paragraphs:
            for key, value in placeholder_values.items():
                if key in paragraph.text:
                    paragraph.text = paragraph.text.replace(key, value)

        for table in document.tables:
            for row in table.rows:
                for cell in row.cells:
                    for key, value in placeholder_values.items():
                        if key in cell.text:
                            cell.text = cell.text.replace(key, value)

        document.add_heading(f"{document_type} - {stage}", level=1)
        for section in sections:
            document.add_heading(section["section_title"], level=2)
            document.add_paragraph(section["generated_text"])
            refs = ", ".join(section["evidence_refs"]) if section["evidence_refs"] else "No linked evidence"
            document.add_paragraph(f"Evidence links: {refs}")
            if section.get("unresolved_gaps"):
                document.add_paragraph("Missing evidence notes: " + "; ".join(section["unresolved_gaps"]))

        document.add_heading("Revision Notes", level=2)
        for line in change_summary:
            document.add_paragraph(line, style="List Bullet")

        document.save(output_path)
        return output_path, version
