"""
Analyzer Strategy Pattern
--------------------------
Supports Face++ API and ONNX (Glowlytics) backends.
Switch via ACTIVE_ANALYZER env var: 'facepp' or 'onnx'.
"""

import logging
import os
from abc import ABC, abstractmethod

import requests

from app.schemas import DetectedIssue, PoreDetected, SkinAnalysisResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base interface
# ---------------------------------------------------------------------------
class BaseAnalyzer(ABC):
    @abstractmethod
    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        pass


# ---------------------------------------------------------------------------
# Face++ implementation
# ---------------------------------------------------------------------------
class FacePPAnalyzer(BaseAnalyzer):
    """Calls the Face++ Skin Analyze API and maps its response to the
    shared SkinAnalysis contract."""

    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        api_key = os.getenv("FACEPP_API_KEY")
        api_secret = os.getenv("FACEPP_API_SECRET")
        base_url = os.getenv(
            "FACEPP_BASE_URL",
            "https://api-us.faceplusplus.com/facepp/v1/skinanalyze",
        )

        if not api_key or not api_secret:
            raise ValueError(
                "Face++ API credentials not configured. "
                "Set FACEPP_API_KEY and FACEPP_API_SECRET in your .env file."
            )

        data = {"api_key": api_key, "api_secret": api_secret}
        files = {"image_file": image_bytes}

        try:
            response = requests.post(base_url, data=data, files=files, timeout=30)
        except requests.RequestException as e:
            logger.error("Face++ API request failed: %s", e)
            raise RuntimeError("Skin analysis service temporarily unavailable") from e

        if response.status_code != 200:
            # Never leak raw API response (may contain keys in URL params)
            logger.error(
                "Face++ returned %s: %s", response.status_code, response.text
            )
            raise RuntimeError(
                f"Skin analysis failed (upstream status {response.status_code})"
            )

        result = response.json()
        return self._transform(result)

    # ----- transform raw Face++ JSON -> shared contract -----

    @staticmethod
    def _severity(confidence: float) -> str:
        if confidence > 0.8:
            return "high"
        if confidence > 0.5:
            return "medium"
        if confidence > 0.25:
            return "low"
        return "none"

    def _transform(self, result: dict) -> SkinAnalysisResponse:
        detected_issues: list[DetectedIssue] = []
        subscores: dict[str, int] = {}
        skin_score: float = 100.0

        # Mapping: (display_name, face++ key, subscore key, penalty weight)
        issue_map = [
            ("Acne", "acne", "acne", 1.0),
            ("Pigmentation", "stain", "pigmentation", 0.8),
            ("Dark Circles", "dark_circle", "darkCircles", 0.6),
            ("Wrinkles", "wrinkle", "wrinkles", 0.7),
            ("Blackheads", "blackhead", "texture", 0.5),
        ]

        for display_name, data_key, score_key, weight in issue_map:
            if data_key in result:
                item = result[data_key]
                confidence = float(
                    item.get("confidence", 0.5)
                    if isinstance(item, dict)
                    else 0.5
                )
                confidence = max(0.0, min(1.0, confidence))  # clamp
                present = confidence > 0.4
                severity = self._severity(confidence)

                detected_issues.append(
                    DetectedIssue(
                        issue=display_name,
                        present=present,
                        confidence=round(confidence, 2),
                        severity=severity,
                    )
                )
                subscore = int(100 - (confidence * 100 * weight)) if present else 100
                subscores[score_key] = max(0, subscore)
                if present:
                    skin_score -= confidence * 100 * weight * 0.15
            else:
                # Issue not returned by API — default to clean
                detected_issues.append(
                    DetectedIssue(
                        issue=display_name,
                        present=False,
                        confidence=0.0,
                        severity="none",
                    )
                )

        # Pore regions (Face++ provides pore data per-region in some plans)
        pore_regions = ["Left Cheek", "Right Cheek", "Forehead", "Jaw"]
        pores: list[PoreDetected] = []
        pore_data = result.get("pore", {})
        for region in pore_regions:
            region_key = region.lower().replace(" ", "_")
            if isinstance(pore_data, dict) and region_key in pore_data:
                conf = max(0.0, min(1.0, float(pore_data[region_key].get("confidence", 0.0))))
                pores.append(
                    PoreDetected(
                        region=region,
                        present=conf > 0.4,
                        confidence=round(conf, 2),
                        severity=self._severity(conf),
                    )
                )
            else:
                pores.append(
                    PoreDetected(
                        region=region, present=False, confidence=0.0, severity="none"
                    )
                )

        # Skin type
        skin_type_raw = result.get("skin_type", {})
        skin_type_val = (
            skin_type_raw.get("skin_type", 0) if isinstance(skin_type_raw, dict) else 0
        )
        skin_type_map = {0: "combination", 1: "dry", 2: "oily", 3: "neutral"}
        skin_type_str = skin_type_map.get(skin_type_val, "combination")

        # Ensure all six subscores exist
        for key in ["acne", "pigmentation", "darkCircles", "wrinkles", "texture", "oilBalance"]:
            subscores.setdefault(key, 100)

        return SkinAnalysisResponse(
            detectedIssues=detected_issues,
            poresDetected=pores,
            skinType=skin_type_str,
            skinScore=max(0, min(100, int(skin_score))),
            subscores=subscores,
        )


# ---------------------------------------------------------------------------
# ONNX / Glowlytics implementation (placeholder — returns mock data)
# ---------------------------------------------------------------------------
class ONNXAnalyzer(BaseAnalyzer):
    """Placeholder for local ONNX inference using the Glowlytics skin models.
    Returns realistic mock data matching the shared contract until the
    models are integrated."""

    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        logger.info("ONNXAnalyzer invoked (using mock data until models are integrated)")
        return SkinAnalysisResponse(
            detectedIssues=[
                DetectedIssue(issue="Acne", present=True, confidence=0.87, severity="high"),
                DetectedIssue(issue="Pigmentation", present=False, confidence=0.15, severity="none"),
                DetectedIssue(issue="Dark Circles", present=False, confidence=0.12, severity="none"),
                DetectedIssue(issue="Wrinkles", present=False, confidence=0.08, severity="none"),
                DetectedIssue(issue="Blackheads", present=True, confidence=0.62, severity="medium"),
            ],
            poresDetected=[
                PoreDetected(region="Left Cheek", present=True, confidence=0.88, severity="high"),
                PoreDetected(region="Right Cheek", present=False, confidence=0.30, severity="none"),
                PoreDetected(region="Forehead", present=False, confidence=0.20, severity="none"),
                PoreDetected(region="Jaw", present=False, confidence=0.10, severity="none"),
            ],
            skinType="oily",
            skinScore=82,
            subscores={
                "acne": 90,
                "pigmentation": 80,
                "darkCircles": 100,
                "wrinkles": 100,
                "texture": 82,
                "oilBalance": 100,
            },
        )


# ---------------------------------------------------------------------------
# Factory
# ---------------------------------------------------------------------------
def get_analyzer() -> BaseAnalyzer:
    """Return the active analyzer based on the ACTIVE_ANALYZER env var."""
    strategy = os.getenv("ACTIVE_ANALYZER", "facepp").lower()
    if strategy == "onnx":
        return ONNXAnalyzer()
    if strategy == "facepp":
        return FacePPAnalyzer()
    raise ValueError(
        f"Unknown ACTIVE_ANALYZER '{strategy}'. Must be 'facepp' or 'onnx'."
    )
