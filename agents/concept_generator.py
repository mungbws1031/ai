"""Load concept candidates from disk."""

import json
from pathlib import Path
from typing import Any, Dict, List


REQUIRED_CONCEPT_FIELDS = [
    "name",
    "summary",
    "mechanism",
    "assumed_retained_volume_ul",
    "overflow_strategy",
    "vent_strategy",
    "transfer_interface",
    "likely_failure_modes",
    "manufacturability_notes",
    "prototype_tests",
    "scores",
]


def load_concepts(concepts_path: Path) -> List[Dict[str, Any]]:
    """Load concept candidates from JSON file with basic validation."""
    if not concepts_path.exists():
        raise FileNotFoundError(f"Concept file not found: {concepts_path}")

    try:
        with concepts_path.open("r", encoding="utf-8") as f:
            concepts = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in concept file: {concepts_path}") from exc

    if not isinstance(concepts, list):
        raise ValueError("Concept JSON should be a list of concept objects.")

    for idx, concept in enumerate(concepts, start=1):
        if not isinstance(concept, dict):
            raise ValueError(f"Concept #{idx} is not a valid object.")

        for field in REQUIRED_CONCEPT_FIELDS:
            if field not in concept:
                raise ValueError(
                    f"Concept #{idx} ('{concept.get('name', 'unknown')}') is missing '{field}'."
                )

        if not isinstance(concept["scores"], dict):
            raise ValueError(f"Concept '{concept['name']}' has invalid 'scores' object.")

    return concepts
