"""Try kordoc extraction on a local file: python scripts/kordoc_poc.py <file> [--chunks]"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.document_extract_service import DocumentExtractError, DocumentExtractService  # noqa: E402


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        return 2
    try:
        result = DocumentExtractService().extract(args[0])
    except DocumentExtractError as exc:
        print(f"ERROR: {exc}")
        return 1
    print(f"# {result['source_file']} ({result['file_type']}) - tables: {len(result['tables'])}, chunks: {len(result['chunks'])}\n")
    print(result["markdown"])
    if "--chunks" in sys.argv:
        for chunk in result["chunks"]:
            print(f"\n[{chunk['id']}] {chunk['type']} {' > '.join(chunk['breadcrumb'])}\n{chunk['text']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
