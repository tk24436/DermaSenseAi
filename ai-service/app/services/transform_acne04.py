"""
transform_acne04.py
-------------------
Converts raw ACNE04 YOLOv8 ONNX detections and Glowlytics skin signals
into the standardized DermaSense AI shared response contract.

Note on Model Scope:
- ACNE04 model classes represent acne severity levels, not individual lesion types.
- ACNE04 only evaluates Acne.
- Full attributes (pigmentation, wrinkles, dark circles, regional pores, hydration)
  are sourced from Glowlytics models in the hybrid ONNX pipeline, or via Face++ fallback.
- In standalone ACNE04 evaluation mode (without Glowlytics signals), non-evaluated fields
  are marked explicitly with presence=False, confidence=0.0, and severity="none".
"""

from typing import Any, Dict, List, Optional


def _map_acne_severity(raw_class: Any, confidence: float) -> str:
    """
    Map ACNE04 class or detection confidence to standardized severity (none|low|medium|high).
    ACNE04 classes commonly index severity grades (0=level 0/mild, 1=level 1, 2=level 2, 3=level 3).
    """
    if isinstance(raw_class, str):
        class_lower = raw_class.lower()
        if "severe" in class_lower or "high" in class_lower or "level3" in class_lower or "lvl3" in class_lower:
            return "high"
        if "moderate" in class_lower or "medium" in class_lower or "level2" in class_lower or "lvl2" in class_lower:
            return "medium"
        if "mild" in class_lower or "low" in class_lower or "level1" in class_lower or "lvl1" in class_lower:
            return "low"
    elif isinstance(raw_class, int):
        if raw_class >= 2:
            return "high"
        if raw_class == 1:
            return "medium"
        return "low"

    # Fallback to confidence thresholding
    if confidence >= 0.70:
        return "high"
    if confidence >= 0.45:
        return "medium"
    if confidence >= 0.20:
        return "low"
    return "none"


def _severity_from_score(score_0_100: float) -> str:
    """Higher health score = lower severity of condition."""
    if score_0_100 < 45:
        return "high"
    if score_0_100 < 70:
        return "medium"
    if score_0_100 < 85:
        return "low"
    return "none"


def _severity_from_conf(conf: float) -> str:
    if conf >= 0.70:
        return "high"
    if conf >= 0.45:
        return "medium"
    if conf >= 0.20:
        return "low"
    return "none"


def transform_acne04_response(
    acne_out: Dict[str, Any],
    signals: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Transform ACNE04 YOLOv8 detections (and optional Glowlytics signals)
    into the shared DermaSense AI SkinAnalysis contract.
    """
    detections: List[Dict[str, Any]] = acne_out.get("detections", [])
    max_conf: float = float(acne_out.get("max_confidence", 0.0))
    count: int = len(detections)

    # Determine acne presence, severity and calibrated confidence from detection count & max conf
    if count == 0:
        acne_present = False
        acne_severity = "none"
        acne_conf = round(max_conf, 2)
        acne_subscore = 100
    else:
        acne_present = True
        best_det = max(detections, key=lambda d: d.get("confidence", 0.0))
        raw_cls = best_det.get("class")
        cls_severity = _map_acne_severity(raw_cls, max_conf)

        if cls_severity == "high" or count >= 10:
            acne_severity = "high"
            acne_conf = round(max(float(best_det.get("confidence", max_conf)), min(0.98, 0.80 + min(0.18, count * 0.005))), 2)
            acne_subscore = max(10, min(42, int(42 - min(30, count * 0.8))))
        elif cls_severity == "medium" or count >= 4:
            acne_severity = "medium"
            acne_conf = round(max(float(best_det.get("confidence", max_conf)), min(0.90, 0.60 + count * 0.03)), 2)
            acne_subscore = max(45, min(69, int(70 - count * 2.5)))
        else:
            acne_severity = cls_severity if cls_severity != "none" else "low"
            acne_conf = round(float(best_det.get("confidence", max_conf)), 2)
            acne_subscore = max(70, min(88, int(92 - count * 5)))

    # If Glowlytics signals are provided, incorporate them; otherwise mark explicitly as not evaluated
    if signals:
        structure = float(signals.get("structure", 70.0))
        hydration = float(signals.get("hydration", 60.0))
        elasticity = float(signals.get("elasticity", 70.0))
        texture = float(signals.get("texture", 70.0))
        sun_damage = float(signals.get("sunDamage", 30.0))

        pigmentation_score = max(10, min(100, int(100 - sun_damage)))
        pigmentation_present = sun_damage > 45
        pigmentation_conf = round(min(1.0, sun_damage / 100.0), 2)

        wrinkle_score = max(10, min(100, int(elasticity)))
        wrinkle_present = elasticity < 60
        wrinkle_conf = round(max(0.0, (100.0 - elasticity) / 100.0), 2)

        texture_score = max(10, min(100, int((structure + texture) / 2.0)))
        blackhead_present = structure < 55
        blackhead_conf = round(max(0.0, (100.0 - structure) / 100.0), 2)

        oil_balance_score = max(10, min(100, int(100 - abs(hydration - 60.0) * 1.2)))

        detected_issues = [
            {
                "issue": "Acne",
                "present": acne_present,
                "confidence": acne_conf,
                "severity": acne_severity,
            },
            {
                "issue": "Pigmentation",
                "present": pigmentation_present,
                "confidence": pigmentation_conf,
                "severity": _severity_from_score(pigmentation_score) if pigmentation_present else "none",
            },
            {
                "issue": "Dark Circles",
                "present": False,
                "confidence": 0.08,
                "severity": "none",
            },
            {
                "issue": "Wrinkles",
                "present": wrinkle_present,
                "confidence": wrinkle_conf,
                "severity": _severity_from_score(wrinkle_score) if wrinkle_present else "none",
            },
            {
                "issue": "Blackheads",
                "present": blackhead_present,
                "confidence": blackhead_conf,
                "severity": _severity_from_score(texture_score) if blackhead_present else "none",
            },
        ]

        pore_factor = max(0.0, min(1.0, (100.0 - structure) / 100.0))
        pores_detected = [
            {
                "region": "Left Cheek",
                "present": pore_factor > 0.45,
                "confidence": round(pore_factor, 2),
                "severity": _severity_from_conf(pore_factor),
            },
            {
                "region": "Right Cheek",
                "present": pore_factor > 0.45,
                "confidence": round(pore_factor * 0.95, 2),
                "severity": _severity_from_conf(pore_factor * 0.95),
            },
            {
                "region": "Forehead",
                "present": pore_factor > 0.55,
                "confidence": round(pore_factor * 0.75, 2),
                "severity": _severity_from_conf(pore_factor * 0.75),
            },
            {
                "region": "Jaw",
                "present": pore_factor > 0.65,
                "confidence": round(pore_factor * 0.50, 2),
                "severity": _severity_from_conf(pore_factor * 0.50),
            },
        ]

        if hydration < 40:
            skin_type = "dry"
        elif hydration > 70 and oil_balance_score < 60:
            skin_type = "oily"
        elif abs(hydration - 60) <= 15 and structure >= 55:
            skin_type = "neutral"
        else:
            skin_type = "combination"

        subscores = {
            "acne": acne_subscore,
            "pigmentation": pigmentation_score,
            "darkCircles": 95,
            "wrinkles": wrinkle_score,
            "texture": texture_score,
            "oilBalance": oil_balance_score,
        }

        skin_score = int(round(
            subscores["acne"] * 0.25
            + subscores["pigmentation"] * 0.20
            + subscores["texture"] * 0.20
            + subscores["wrinkles"] * 0.15
            + subscores["oilBalance"] * 0.20
        ))
    else:
        # Standalone ACNE04 evaluation (no Glowlytics signals available)
        # Note: Non-evaluated fields explicitly have present=False, confidence=0.0
        detected_issues = [
            {
                "issue": "Acne",
                "present": acne_present,
                "confidence": acne_conf,
                "severity": acne_severity,
            },
            {
                "issue": "Pigmentation",
                "present": False,
                "confidence": 0.0,
                "severity": "none",
            },
            {
                "issue": "Dark Circles",
                "present": False,
                "confidence": 0.0,
                "severity": "none",
            },
            {
                "issue": "Wrinkles",
                "present": False,
                "confidence": 0.0,
                "severity": "none",
            },
            {
                "issue": "Blackheads",
                "present": False,
                "confidence": 0.0,
                "severity": "none",
            },
        ]

        pores_detected = [
            {"region": r, "present": False, "confidence": 0.0, "severity": "none"}
            for r in ["Left Cheek", "Right Cheek", "Forehead", "Jaw"]
        ]

        skin_type = "neutral"
        acne_penalty = (30.0 if acne_severity == "high" else 20.0 if acne_severity == "medium" else 10.0) * acne_conf
        skin_score = max(0, min(100, int(round(100 - acne_penalty))))
        subscores = {
            "acne": acne_subscore,
            "pigmentation": 100,
            "darkCircles": 100,
            "wrinkles": 100,
            "texture": 100,
            "oilBalance": 100,
        }

    return {
        "detectedIssues": detected_issues,
        "poresDetected": pores_detected,
        "skinType": skin_type,
        "skinScore": max(0, min(100, skin_score)),
        "subscores": subscores,
    }
