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
            logger.error(
                "Face++ returned %s: %s", response.status_code, response.text
            )
            raise RuntimeError(
                f"Skin analysis failed (upstream status {response.status_code})"
            )

        result = response.json()
        return self._transform(result)

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
                confidence = max(0.0, min(1.0, confidence))
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
                detected_issues.append(
                    DetectedIssue(
                        issue=display_name,
                        present=False,
                        confidence=0.0,
                        severity="none",
                    )
                )

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

        skin_type_raw = result.get("skin_type", {})
        skin_type_val = (
            skin_type_raw.get("skin_type", 0) if isinstance(skin_type_raw, dict) else 0
        )
        skin_type_map = {0: "combination", 1: "dry", 2: "oily", 3: "neutral"}
        skin_type_str = skin_type_map.get(skin_type_val, "combination")

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
# ONNX / Glowlytics implementation — real inference
# ---------------------------------------------------------------------------
class ONNXAnalyzer(BaseAnalyzer):
    """
    Local ONNX inference using the Glowlytics skin models:
      - skin_signals.onnx  : EfficientNet-B0, 224x224, ImageNet-norm
                             -> 4 float scores [structure, hydration, sunDamage, elasticity]
      - acne_detector.onnx : YOLOv8s, 640x640
                             -> bounding boxes with class labels + confidences

    Preprocessing follows the official README:
      Resize(256) -> CenterCrop(224) -> Normalize(ImageNet mean/std)
    """

    _MEAN = [0.485, 0.456, 0.406]
    _STD  = [0.229, 0.224, 0.225]

    def __init__(self):
        import onnxruntime as ort
        models_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "models")
        )

        signals_path = os.path.join(models_dir, "skin_signals.onnx")
        acne_path    = os.path.join(models_dir, "acne_detector.onnx")

        if not os.path.exists(signals_path):
            raise FileNotFoundError(
                f"skin_signals.onnx not found at {signals_path}. "
                "Run 'python download_models.py' from the ai-service directory."
            )
        if not os.path.exists(acne_path):
            raise FileNotFoundError(
                f"acne_detector.onnx not found at {acne_path}. "
                "Run 'python download_models.py' from the ai-service directory."
            )

        logger.info("Loading ONNX models from %s", models_dir)
        self._signals_sess = ort.InferenceSession(signals_path)
        self._acne_sess    = ort.InferenceSession(acne_path)
        logger.info("ONNX models loaded successfully")

    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        import io
        from PIL import Image

        logger.info("ONNXAnalyzer: running local ONNX inference")
        pil_img  = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        signals  = self._run_skin_signals(pil_img)
        acne_out = self._run_acne_detector(pil_img)
        return self._build_response(signals, acne_out)

    # ------------------------------------------------------------------ #
    #  Model runners                                                       #
    # ------------------------------------------------------------------ #

    def _run_skin_signals(self, pil_img) -> dict:
        """Returns {structure, hydration, sunDamage, elasticity} as 0-100 floats."""
        tensor = self._preprocess_signals(pil_img)
        input_name = self._signals_sess.get_inputs()[0].name
        outputs = self._signals_sess.run(None, {input_name: tensor})
        raw = outputs[0][0]  # shape: (4,)
        keys = ["structure", "hydration", "sunDamage", "elasticity"]
        return {k: float(max(0.0, min(1.0, raw[i]))) * 100 for i, k in enumerate(keys)}

    def _run_acne_detector(self, pil_img) -> dict:
        """Returns {detections: [...], max_confidence: float}."""
        tensor, orig_w, orig_h = self._preprocess_yolo(pil_img)
        input_name = self._acne_sess.get_inputs()[0].name
        outputs = self._acne_sess.run(None, {input_name: tensor})
        detections = self._parse_yolo_output(outputs[0], orig_w, orig_h)
        max_conf = max((d["confidence"] for d in detections), default=0.0)
        return {"detections": detections, "max_confidence": max_conf}

    # ------------------------------------------------------------------ #
    #  Preprocessing                                                       #
    # ------------------------------------------------------------------ #

    def _preprocess_signals(self, pil_img) -> "np.ndarray":
        """Resize(256) -> CenterCrop(224) -> normalize -> [1,3,224,224] float32."""
        import numpy as np
        w, h = pil_img.size
        scale = 256 / min(w, h)
        new_w, new_h = int(round(w * scale)), int(round(h * scale))
        img = pil_img.resize((new_w, new_h), resample=2)  # BILINEAR

        left = (new_w - 224) // 2
        top  = (new_h - 224) // 2
        img = img.crop((left, top, left + 224, top + 224))

        arr  = (
            (
                (
                    (
                        (
                            (
                                __import__("numpy").array(img, dtype=__import__("numpy").float32) / 255.0
                            )
                            - __import__("numpy").array(self._MEAN, dtype=__import__("numpy").float32)
                        )
                        / __import__("numpy").array(self._STD, dtype=__import__("numpy").float32)
                    )
                ).transpose(2, 0, 1)[__import__("numpy").newaxis]
            )
        )
        return arr

    def _preprocess_yolo(self, pil_img):
        """Resize to 640x640, return (tensor [1,3,640,640], orig_w, orig_h)."""
        import numpy as np
        orig_w, orig_h = pil_img.size
        img = pil_img.resize((640, 640), resample=2)
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = arr.transpose(2, 0, 1)[np.newaxis]
        return arr, orig_w, orig_h

    # ------------------------------------------------------------------ #
    #  YOLOv8 output parsing                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_yolo_output(raw, orig_w: int, orig_h: int, conf_thresh: float = 0.25) -> list:
        """
        raw shape: [1, 4+num_classes, num_anchors].
        Returns list of {class, confidence, bbox} dicts above conf_thresh.
        """
        import numpy as np
        predictions = raw[0].T                     # [anchors, 4+nc]
        boxes       = predictions[:, :4]
        class_probs = predictions[:, 4:]
        class_ids   = class_probs.argmax(axis=1)
        confidences = class_probs[range(len(class_probs)), class_ids]

        classes = ["comedone", "papule", "pustule", "nodule"]
        detections = []
        for box, cls_id, conf in zip(boxes, class_ids, confidences):
            if conf < conf_thresh:
                continue
            cx, cy, w, h = box
            x1 = int((cx - w / 2) * orig_w / 640)
            y1 = int((cy - h / 2) * orig_h / 640)
            x2 = int((cx + w / 2) * orig_w / 640)
            y2 = int((cy + h / 2) * orig_h / 640)
            label = classes[int(cls_id)] if int(cls_id) < len(classes) else "lesion"
            detections.append({
                "class": label,
                "confidence": float(conf),
                "bbox": [x1, y1, x2, y2],
            })
        return detections

    # ------------------------------------------------------------------ #
    #  Severity helpers                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _severity_from_score(score_0_100: float) -> str:
        """Low score = bad skin = higher severity."""
        if score_0_100 < 40:
            return "high"
        if score_0_100 < 65:
            return "medium"
        if score_0_100 < 85:
            return "low"
        return "none"

    @staticmethod
    def _severity_from_conf(conf: float) -> str:
        if conf > 0.8:
            return "high"
        if conf > 0.5:
            return "medium"
        if conf > 0.25:
            return "low"
        return "none"

    # ------------------------------------------------------------------ #
    #  Response builder                                                    #
    # ------------------------------------------------------------------ #

    def _build_response(self, signals: dict, acne_out: dict) -> SkinAnalysisResponse:
        """Map model outputs to the shared SkinAnalysisResponse contract."""
        structure  = signals["structure"]   # 0-100
        hydration  = signals["hydration"]
        sun_damage = signals["sunDamage"]
        elasticity = signals["elasticity"]

        acne_conf    = min(1.0, acne_out["max_confidence"])
        acne_present = acne_conf > 0.25

        # ---- detectedIssues ----
        detected_issues = [
            DetectedIssue(
                issue="Acne",
                present=acne_present,
                confidence=round(acne_conf, 2),
                severity=self._severity_from_conf(acne_conf),
            ),
            DetectedIssue(
                issue="Pigmentation",
                present=sun_damage < 65,
                confidence=round(max(0.0, (100 - sun_damage) / 100), 2),
                severity=self._severity_from_score(sun_damage),
            ),
            # Dark circles not directly measured by these models
            DetectedIssue(
                issue="Dark Circles",
                present=False,
                confidence=0.0,
                severity="none",
            ),
            DetectedIssue(
                issue="Wrinkles",
                present=elasticity < 65,
                confidence=round(max(0.0, (100 - elasticity) / 100), 2),
                severity=self._severity_from_score(elasticity),
            ),
            DetectedIssue(
                issue="Blackheads",
                present=structure < 65,
                confidence=round(max(0.0, (100 - structure) / 100), 2),
                severity=self._severity_from_score(structure),
            ),
        ]

        # ---- pores (derived from structure score) ----
        structure_conf = max(0.0, (100 - structure) / 100)
        pores = [
            PoreDetected(
                region="Left Cheek",
                present=structure_conf > 0.35,
                confidence=round(structure_conf, 2),
                severity=self._severity_from_conf(structure_conf),
            ),
            PoreDetected(
                region="Right Cheek",
                present=structure_conf > 0.35,
                confidence=round(structure_conf * 0.9, 2),
                severity=self._severity_from_conf(structure_conf * 0.9),
            ),
            PoreDetected(
                region="Forehead",
                present=structure_conf > 0.5,
                confidence=round(structure_conf * 0.7, 2),
                severity=self._severity_from_conf(structure_conf * 0.7),
            ),
            PoreDetected(
                region="Jaw",
                present=structure_conf > 0.6,
                confidence=round(structure_conf * 0.6, 2),
                severity=self._severity_from_conf(structure_conf * 0.6),
            ),
        ]

        # ---- skin type heuristic ----
        if hydration < 45:
            skin_type = "dry"
        elif hydration > 75 and structure < 60:
            skin_type = "oily"
        elif hydration > 60 and structure > 60:
            skin_type = "neutral"
        else:
            skin_type = "combination"

        # ---- subscores ----
        subscores = {
            "acne":         max(0, int(100 - acne_conf * 100)),
            "pigmentation": max(0, int(sun_damage)),
            "darkCircles":  100,
            "wrinkles":     max(0, int(elasticity)),
            "texture":      max(0, int(structure)),
            "oilBalance":   max(0, int(hydration)),
        }

        # ---- overall skin score: weighted average ----
        skin_score = (
            structure  * 0.25
            + hydration * 0.20
            + (100 - sun_damage) * 0.25
            + elasticity * 0.20
            + (100 - acne_conf * 100) * 0.10
        )

        return SkinAnalysisResponse(
            detectedIssues=detected_issues,
            poresDetected=pores,
            skinType=skin_type,
            skinScore=max(0, min(100, int(skin_score))),
            subscores=subscores,
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
