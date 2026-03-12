"""Utilities for loading project configuration."""

import json
from pathlib import Path
from typing import Any, Dict


REQUIRED_CRITERIA = [
    "metering_accuracy",
    "moldability",
    "bubble_robustness",
    "carry_stability",
    "transfer_quality",
    "ux_clarity",
]


def _validate_thresholds(config: Dict[str, Any]) -> None:
    """Validate optional recommendation thresholds in config."""
    thresholds = config.get("recommendation_thresholds")
    if thresholds is None:
        return

    if not isinstance(thresholds, dict):
        raise ValueError("'recommendation_thresholds' must be an object if provided.")

    prototype_min = thresholds.get("prototype_min")
    explore_min = thresholds.get("explore_min")

    if not isinstance(prototype_min, (int, float)):
        raise ValueError("'recommendation_thresholds.prototype_min' must be numeric.")
    if not isinstance(explore_min, (int, float)):
        raise ValueError("'recommendation_thresholds.explore_min' must be numeric.")
    if prototype_min <= explore_min:
        raise ValueError("'prototype_min' should be greater than 'explore_min'.")


def load_project_config(config_path: Path) -> Dict[str, Any]:
    """Load and validate project configuration from JSON.

    Raises:
        FileNotFoundError: If config file does not exist.
        ValueError: If JSON is invalid or missing expected keys.
    """
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    try:
        with config_path.open("r", encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in config file: {config_path}") from exc

    if "criteria_weights" not in config:
        raise ValueError("Config must include 'criteria_weights'.")

    weights = config["criteria_weights"]
    for criterion in REQUIRED_CRITERIA:
        if criterion not in weights:
            raise ValueError(f"Missing weight for criterion: {criterion}")

        weight = weights[criterion]
        if not isinstance(weight, (int, float)) or weight <= 0:
            raise ValueError(
                f"Weight for '{criterion}' must be a positive number. Got: {weight}"
            )

    _validate_thresholds(config)

    # Keep a single source of truth for criteria order in downstream steps.
    config["criteria"] = REQUIRED_CRITERIA
    return config
