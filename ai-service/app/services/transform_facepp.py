"""
transform_facepp.py
-------------------
Converts a raw Face++ Skin Analyze API response into the shape the
SkinAnalysis DB table / API response needs.
"""

from typing import Any, Dict

SKIN_TYPE_LABELS = {0: "oily", 1: "dry", 2: "neutral", 3: "combination"}

ISSUE_MAP = {
    "acne": {"issue": "Acne", "penalty": 15},
    "skin_spot": {"issue": "Pigmentation (Spots)", "penalty": 8},
    "mole": {"issue": "Pigmentation (Mole)", "penalty": 2},
    "dark_circle": {"issue": "Dark Circles", "penalty": 8},
    "blackhead": {"issue": "Blackheads", "penalty": 6},
    "forehead_wrinkle": {"issue": "Wrinkles (Forehead)", "penalty": 6},
    "crows_feet": {"issue": "Wrinkles (Crow's Feet)", "penalty": 6},
    "eye_finelines": {"issue": "Fine Lines (Eyes)", "penalty": 5},
    "glabella_wrinkle": {"issue": "Wrinkles (Glabella)", "penalty": 5},
    "nasolabial_fold": {"issue": "Wrinkles (Nasolabial)", "penalty": 5},
}

PORE_FIELDS = {
    "pores_forehead": "Forehead",
    "pores_left_cheek": "Left Cheek",
    "pores_right_cheek": "Right Cheek",
    "pores_jaw": "Jaw",
}


def _severity_from_confidence(confidence: float) -> str:
    """Map confidence to severity adhering to standard schema (none|low|medium|high)."""
    if confidence >= 0.85:
        return "high"
    if confidence >= 0.6:
        return "medium"
    return "low"


def transform_facepp_response(facepp_response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw Face++ API response dict to the standardized DermaSense AI schema.
    """
    result = facepp_response.get("result", {})
    detected_issues = []
    penalty_total = 0.0

    for field, meta in ISSUE_MAP.items():
        entry = result.get(field, {})
        present = bool(entry.get("value", 0))
        confidence = float(entry.get("confidence", 0.0))
        detected_issues.append({
            "issue": meta["issue"],
            "present": present,
            "confidence": round(confidence, 3),
            "severity": _severity_from_confidence(confidence) if present else "none",
        })
        if present:
            penalty_total += meta["penalty"] * confidence

    pores_detected = []
    pore_penalty = 0.0
    for field, region in PORE_FIELDS.items():
        entry = result.get(field, {})
        present = bool(entry.get("value", 0))
        confidence = float(entry.get("confidence", 0.0))
        pores_detected.append({
            "region": region,
            "present": present,
            "confidence": round(confidence, 3),
            "severity": _severity_from_confidence(confidence) if present else "none",
        })
        if present:
            pore_penalty += 4 * confidence

    skin_type_value = result.get("skin_type", {}).get("skin_type")
    skin_type_label = SKIN_TYPE_LABELS.get(skin_type_value, "combination")
    overall_penalty = penalty_total + pore_penalty
    skin_score = max(0, min(100, round(100 - overall_penalty)))

    def issue_conf(field: str) -> float:
        return float(result.get(field, {}).get("confidence", 0.0)) if result.get(field, {}).get("value") else 0.0

    subscores = {
        "acne": max(0, round(100 - issue_conf("acne") * 100)),
        "pigmentation": max(0, round(100 - (issue_conf("skin_spot") * 80 + issue_conf("mole") * 20))),
        "darkCircles": max(0, round(100 - issue_conf("dark_circle") * 100)),
        "wrinkles": max(0, round(100 - sum(
            issue_conf(f) for f in [
                "forehead_wrinkle",
                "crows_feet",
                "eye_finelines",
                "glabella_wrinkle",
                "nasolabial_fold",
            ]
        ) / 5 * 100)),
        "texture": max(0, round(100 - pore_penalty * 5)),
        "oilBalance": 100 if skin_type_label == "neutral" else 75,
    }

    return {
        "detectedIssues": detected_issues,
        "poresDetected": pores_detected,
        "skinType": skin_type_label,
        "skinScore": skin_score,
        "subscores": subscores,
    }
