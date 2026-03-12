"""Entry point for the lfa_ai_lab project.

Default behavior:
- load local JSON config/concepts
- evaluate concepts
- write markdown report

Optional behavior:
- call an LLM API to generate additional concept idea text
"""

import sys
from pathlib import Path

from agents.concept_generator import load_concepts
from agents.documenter import print_ranked_summary, write_markdown_report
from agents.evaluator import evaluate_concepts
from agents.llm_generator import generate_concept_ideas_with_llm
from agents.researcher import load_project_config


def should_use_llm() -> bool:
    """Return True when user passes --use-llm in the command."""
    return "--use-llm" in sys.argv[1:]


def maybe_generate_llm_ideas(base_dir: Path) -> None:
    """Generate optional concept ideas text and save to outputs.

    If environment variables are missing, print a friendly message and continue.
    """
    output_path = base_dir / "outputs" / "llm_generated_ideas.md"

    try:
        llm_text = generate_concept_ideas_with_llm()
    except Exception as exc:  # Keep workflow beginner-friendly and non-blocking.
        print("\nLLM generation skipped.")
        print(f"Reason: {exc}")
        print("Tip: set LLM_API_KEY, LLM_API_URL, and LLM_MODEL to enable this feature.")
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(llm_text, encoding="utf-8")
    print(f"\nLLM concept ideas saved to: {output_path}")


def main() -> None:
    """Run the full concept evaluation workflow."""
    base_dir = Path(__file__).parent

    config_path = base_dir / "data" / "project_config.json"
    concepts_path = base_dir / "data" / "sample_concepts.json"
    report_path = base_dir / "outputs" / "final_report.md"

    # Existing local JSON workflow remains the default path.
    config = load_project_config(config_path)
    concepts = load_concepts(concepts_path)

    evaluated = evaluate_concepts(concepts, config)
    print_ranked_summary(evaluated)
    write_markdown_report(report_path, evaluated, config)

    print(f"\nReport written to: {report_path}")

    # Optional LLM generation path.
    if should_use_llm():
        maybe_generate_llm_ideas(base_dir)


if __name__ == "__main__":
    main()
