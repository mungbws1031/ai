"""Reporting helpers for console output and markdown reports."""

from pathlib import Path
from typing import Any, Dict, List


def _write_list(lines: List[str], title: str, items: List[str], limit: int | None = None) -> None:
    """Append a markdown bullet list section."""
    lines.append(f"**{title}**")
    if items:
        selected = items[:limit] if limit else items
        for item in selected:
            lines.append(f"- {item}")
    else:
        lines.append("- None listed")
    lines.append("")


def print_ranked_summary(evaluated: List[Dict[str, Any]]) -> None:
    """Print a quick ranked summary to the terminal."""
    print("=== Ranked Concepts ===")
    for item in evaluated:
        print(
            f"#{item['rank']}: {item['name']} "
            f"(total: {item['total_score']}, recommendation: {item['recommendation']})"
        )


def _format_gating_flags(flags: Dict[str, bool]) -> List[str]:
    """Convert gating flag map into readable bullet rows."""
    return [f"{key}: {'yes' if value else 'no'}" for key, value in flags.items()]


def write_markdown_report(
    report_path: Path, evaluated: List[Dict[str, Any]], config: Dict[str, Any]
) -> None:
    """Write a beginner-friendly markdown report to disk."""
    criteria = config["criteria"]

    lines = [
        "# LFA AI Lab Concept Evaluation Report",
        "",
        "## Project Summary",
        (
            "Device-specific screening for dip-based urine LFA stick concepts. "
            "Scoring is heuristic for early design decisions only."
        ),
        "",
        "## Concise Ranking Table",
        "",
        "| Rank | Concept | Retained Volume (uL) | Total Score | Recommendation |",
        "|---:|---|---:|---:|---|",
    ]

    for item in evaluated:
        lines.append(
            f"| {item['rank']} | {item['name']} | {item.get('assumed_retained_volume_ul', 'N/A')} | "
            f"{item['total_score']} | {item['recommendation']} |"
        )

    lines.extend(["", "## Engineering Review by Concept", ""])

    for item in evaluated:
        lines.append(f"### Rank #{item['rank']}: {item['name']}")
        lines.append("")
        lines.append(f"**Summary:** {item.get('summary', 'N/A')}")
        lines.append("")
        lines.append(f"**Mechanism:** {item.get('mechanism', 'N/A')}")
        lines.append("")
        lines.append(f"**Assumed retained volume (uL):** {item.get('assumed_retained_volume_ul', 'N/A')}")
        lines.append(f"**Overflow strategy:** {item.get('overflow_strategy', 'N/A')}")
        lines.append(f"**Vent strategy:** {item.get('vent_strategy', 'N/A')}")
        lines.append(f"**Transfer interface:** {item.get('transfer_interface', 'N/A')}")
        lines.append("")

        lines.append("**Criterion scores**")
        for criterion in criteria:
            lines.append(f"- {criterion}: {item['scores'][criterion]}")
        lines.append(f"- total_weighted_score: {item['total_score']}")
        lines.append("")

        _write_list(lines, "Gating flag summary", _format_gating_flags(item["gating_flags"]))
        _write_list(lines, "Likely failure modes", item.get("likely_failure_modes", []), limit=3)
        _write_list(lines, "Top 3 prototype tests", item.get("prototype_tests", []), limit=3)

        next_experiments = list(item.get("prototype_tests", [])) + list(
            item.get("manufacturability_notes", [])
        )
        _write_list(lines, "Top 3 next experiments", next_experiments, limit=3)

        lines.append(f"**Recommendation:** {item['recommendation']}")
        lines.append("")

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text("\n".join(lines), encoding="utf-8")
