"""Heuristic scoring and engineering gating for LFA urine stick concepts."""

from typing import Any, Dict, List, Tuple


def _validate_score(value: Any, concept_name: str, criterion: str) -> float:
    """Ensure each criterion score is numeric and inside 1..5."""
    if not isinstance(value, (int, float)):
        raise ValueError(
            f"Score for '{criterion}' in concept '{concept_name}' must be numeric."
        )
    if value < 1 or value > 5:
        raise ValueError(
            f"Score for '{criterion}' in concept '{concept_name}' must be between 1 and 5."
        )
    return float(value)


def calculate_weighted_score(
    scores: Dict[str, Any], weights: Dict[str, Any], criteria: List[str], concept_name: str
) -> Tuple[Dict[str, float], float]:
    """Return normalized scores and weighted total score for one concept."""
    total = 0.0
    normalized_scores: Dict[str, float] = {}

    for criterion in criteria:
        if criterion not in scores:
            raise ValueError(
                f"Concept '{concept_name}' missing score for criterion: {criterion}"
            )

        score = _validate_score(scores[criterion], concept_name, criterion)
        weight = float(weights[criterion])

        normalized_scores[criterion] = score
        total += score * weight

    return normalized_scores, round(total, 3)


def build_gating_flags(concept: Dict[str, Any], scores: Dict[str, float]) -> Dict[str, bool]:
    """Build simple engineering flags used in recommendation screening."""
    vent_text = str(concept.get("vent_strategy", "")).lower()
    overflow_text = str(concept.get("overflow_strategy", "")).lower()
    transfer_text = str(concept.get("transfer_interface", "")).strip().lower()

    needs_vent = True
    overflow_control_present = "no explicit" not in overflow_text and "no dedicated" not in overflow_text
    likely_bubble_trap = scores.get("bubble_robustness", 5) <= 3
    high_molding_risk = scores.get("moldability", 5) <= 3
    transfer_interface_defined = transfer_text not in {"", "n/a", "none"}

    # If vent strategy explicitly says none, treat as missing vent approach.
    if vent_text in {"none", "no vent", "n/a"}:
        needs_vent = True

    return {
        "needs_vent": needs_vent,
        "overflow_control_present": overflow_control_present,
        "likely_bubble_trap": likely_bubble_trap,
        "high_molding_risk": high_molding_risk,
        "transfer_interface_defined": transfer_interface_defined,
    }


def infer_risks(
    concept: Dict[str, Any], normalized_scores: Dict[str, float], gating_flags: Dict[str, bool]
) -> List[str]:
    """Create a practical risk list from concept data + low scores + gating flags."""
    risk_items = list(concept.get("likely_failure_modes", []))

    if not gating_flags["overflow_control_present"]:
        risk_items.append("No dedicated overflow control may increase retained-volume variance.")
    if gating_flags["likely_bubble_trap"]:
        risk_items.append("Bubble trapping risk is elevated under real dip/carry handling.")
    if not gating_flags["transfer_interface_defined"]:
        risk_items.append("Transfer interface is undefined, so downstream transfer risk is high.")
    if gating_flags["high_molding_risk"]:
        risk_items.append("Feature complexity may increase molding variation.")

    if normalized_scores.get("carry_stability", 5) <= 2:
        risk_items.append("Carry instability may cause leakage before reader insertion.")

    return list(dict.fromkeys(risk_items))


def recommend_concept(total_score: float, thresholds: Dict[str, float], flags: Dict[str, bool]) -> str:
    """Map score + gating flags to a simple screening recommendation."""
    critical_failures = 0
    if not flags["overflow_control_present"]:
        critical_failures += 1
    if not flags["transfer_interface_defined"]:
        critical_failures += 1

    if critical_failures >= 1 and total_score < thresholds["prototype_min"]:
        return "discard"

    if total_score >= thresholds["prototype_min"] and not flags["high_molding_risk"]:
        return "prototype"

    if total_score >= thresholds["explore_min"]:
        return "explore"

    return "discard"


def _get_thresholds(config: Dict[str, Any]) -> Dict[str, float]:
    """Get recommendation thresholds from config with beginner-friendly defaults."""
    raw = config.get("recommendation_thresholds", {})
    return {
        "prototype_min": float(raw.get("prototype_min", 29.0)),
        "explore_min": float(raw.get("explore_min", 24.0)),
    }


def evaluate_concepts(
    concepts: List[Dict[str, Any]], config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Evaluate, score, rank, and recommend concepts for early-stage screening."""
    criteria = config["criteria"]
    weights = config["criteria_weights"]
    thresholds = _get_thresholds(config)

    evaluated = []

    for concept in concepts:
        concept_name = concept["name"]
        normalized_scores, total_score = calculate_weighted_score(
            concept.get("scores", {}), weights, criteria, concept_name
        )

        gating_flags = build_gating_flags(concept, normalized_scores)
        key_risks = infer_risks(concept, normalized_scores, gating_flags)
        recommendation = recommend_concept(total_score, thresholds, gating_flags)

        evaluated.append(
            {
                "name": concept_name,
                "summary": concept.get("summary", ""),
                "mechanism": concept.get("mechanism", ""),
                "assumed_retained_volume_ul": concept.get("assumed_retained_volume_ul"),
                "overflow_strategy": concept.get("overflow_strategy", ""),
                "vent_strategy": concept.get("vent_strategy", ""),
                "transfer_interface": concept.get("transfer_interface", ""),
                "manufacturability_notes": concept.get("manufacturability_notes", []),
                "prototype_tests": concept.get("prototype_tests", []),
                "scores": normalized_scores,
                "total_score": total_score,
                "gating_flags": gating_flags,
                "likely_failure_modes": concept.get("likely_failure_modes", []),
                "key_risks": key_risks,
                "recommendation": recommendation,
            }
        )

    evaluated.sort(key=lambda item: item["total_score"], reverse=True)

    for rank, item in enumerate(evaluated, start=1):
        item["rank"] = rank

    return evaluated
