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

        # Face++ only accepts JPEG/PNG; convert any format (WEBP, etc.) to JPEG
        import io
        from PIL import Image
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        jpeg_buffer = io.BytesIO()
        pil_img.save(jpeg_buffer, format="JPEG", quality=95)
        jpeg_bytes = jpeg_buffer.getvalue()

        data = {"api_key": api_key, "api_secret": api_secret}
        files = {"image_file": ("image.jpg", jpeg_bytes, "image/jpeg")}

        try:
            response = requests.post(base_url, data=data, files=files, timeout=30)
        except requests.RequestException as e:
            logger.error("Face++ API request failed: %s", e)
            raise RuntimeError("Skin analysis service temporarily unavailable") from e

        if response.status_code != 200:
            logger.error(
                "Face++ returned %s: %s", response.status_code, response.text
            )
            # If Face++ cannot find a strict frontal landmark face (INVALID_IMAGE_FACE), fallback to local ONNX analyzer
            err_data = {}
            try:
                err_data = response.json()
            except Exception:
                pass

            if "INVALID_IMAGE_FACE" in err_data.get("error_message", ""):
                logger.warning("Face++ reported INVALID_IMAGE_FACE. Falling back to local ONNX model inference.")
                return ONNXAnalyzer().analyze(image_bytes)

            raise RuntimeError(
                f"Skin analysis failed: {err_data.get('error_message', response.status_code)}"
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
    Local ONNX inference using the 4 Glowlytics models:
      - structure_model.onnx  : Pores, texture regularity, structure score
      - hydration_model.onnx  : Hydration score
      - elasticity_model.onnx : Elasticity score
      - acne_detector.onnx    : YOLOv8s bounding boxes with class labels + confidences
    """

    _MEAN = [0.485, 0.456, 0.406]
    _STD  = [0.229, 0.224, 0.225]

    def __init__(self):
        import onnxruntime as ort
        models_dir = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "models")
        )

        struct_path = os.path.join(models_dir, "structure_model.onnx")
        hydra_path  = os.path.join(models_dir, "hydration_model.onnx")
        elast_path  = os.path.join(models_dir, "elasticity_model.onnx")
        acne_path   = os.path.join(models_dir, "acne_detector.onnx")

        for p, name in [(struct_path, "structure_model.onnx"), (hydra_path, "hydration_model.onnx"),
                        (elast_path, "elasticity_model.onnx"), (acne_path, "acne_detector.onnx")]:
            if not os.path.exists(p):
                raise FileNotFoundError(
                    f"{name} not found at {p}. Run 'python download_models.py' from the ai-service directory."
                )

        logger.info("Loading ONNX models from %s", models_dir)
        self._struct_sess = ort.InferenceSession(struct_path)
        self._hydra_sess  = ort.InferenceSession(hydra_path)
        self._elast_sess  = ort.InferenceSession(elast_path)
        self._acne_sess   = ort.InferenceSession(acne_path)
        logger.info("All 4 ONNX models loaded successfully")

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
        """Returns {structure, hydration, sunDamage, elasticity, pores} normalized to 0-100."""
        import numpy as np
        tensor = self._preprocess_signals(pil_img)
        
        # 1. Structure & Texture
        struct_out = self._struct_sess.run(None, {"image": tensor})
        # struct_out: [pore_count, texture_regularity, structure_score]
        raw_struct = float(struct_out[2][0][0])
        raw_texture = float(struct_out[1][0][0])
        structure_score = float(max(10.0, min(95.0, raw_struct * 10.0 if raw_struct < 10 else raw_struct)))
        texture_score = float(max(10.0, min(95.0, raw_texture * 10.0 if raw_texture < 10 else raw_texture)))

        # 2. Hydration
        feat_h = np.zeros((1, 44), dtype=np.float32)
        hydra_out = self._hydra_sess.run(None, {"image": tensor, "handcrafted_features": feat_h})
        raw_hydra = float(hydra_out[0][0][0])
        hydration_score = float(max(20.0, min(95.0, (raw_hydra + 10.0) * 5.0 if raw_hydra < 10 else raw_hydra)))

        # 3. Elasticity
        feat_e = np.zeros((1, 14), dtype=np.float32)
        elast_out = self._elast_sess.run(None, {"image": tensor, "handcrafted_features": feat_e})
        raw_elast = float(elast_out[0][0][0])
        elasticity_score = float(max(20.0, min(95.0, raw_elast * 12.0 if raw_elast < 10 else raw_elast)))

        # Sun damage inferred from texture irregularity & structure
        sun_damage = float(max(10.0, min(90.0, 100.0 - (structure_score * 0.5 + texture_score * 0.5))))

        return {
            "structure": structure_score,
            "hydration": hydration_score,
            "sunDamage": sun_damage,
            "elasticity": elasticity_score,
            "texture": texture_score,
        }

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
        raw shape: [1, 5, 8400] where channels are [cx, cy, w, h, confidence].
        Returns list of {class, confidence, bbox} dicts above conf_thresh.
        """
        import numpy as np
        predictions = raw[0].T  # [8400, 5]
        boxes = predictions[:, :4]
        confidences = predictions[:, 4]

        detections = []
        for (cx, cy, w, h), conf in zip(boxes, confidences):
            if conf < conf_thresh:
                continue
            x1 = int(max(0, (cx - w / 2) * orig_w / 640))
            y1 = int(max(0, (cy - h / 2) * orig_h / 640))
            x2 = int(min(orig_w, (cx + w / 2) * orig_w / 640))
            y2 = int(min(orig_h, (cy + h / 2) * orig_h / 640))
            detections.append({
                "class": "acne",
                "confidence": float(conf),
                "bbox": [x1, y1, x2, y2],
            })
        return detections

    # ------------------------------------------------------------------ #
    #  Severity helpers                                                    #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _severity_from_score(score_0_100: float) -> str:
        """Higher health score = lower severity of issue."""
        if score_0_100 < 45:
            return "high"
        if score_0_100 < 70:
            return "medium"
        if score_0_100 < 85:
            return "low"
        return "none"

    @staticmethod
    def _severity_from_conf(conf: float) -> str:
        if conf > 0.70:
            return "high"
        if conf > 0.45:
            return "medium"
        if conf > 0.20:
            return "low"
        return "none"

    # ------------------------------------------------------------------ #
    #  Response builder                                                    #
    # ------------------------------------------------------------------ #

    def _build_response(self, signals: dict, acne_out: dict) -> SkinAnalysisResponse:
        """Map calibrated model outputs to the shared SkinAnalysisResponse contract."""
        structure  = float(signals["structure"])     # 0-100 (high = good)
        hydration  = float(signals["hydration"])     # 0-100 (high = hydrated)
        elasticity = float(signals["elasticity"])    # 0-100 (high = elastic/firm)
        texture    = float(signals["texture"])       # 0-100 (high = smooth)
        sun_damage = float(signals["sunDamage"])     # 0-100 (high = damaged)

        acne_conf    = float(min(1.0, acne_out["max_confidence"]))
        acne_present = acne_conf > 0.25

        # Pigmentation health score (100 = flawless, 0 = severe damage)
        pigmentation_score = max(10, min(100, int(100 - sun_damage)))
        pigmentation_present = sun_damage > 45
        pigmentation_conf = round(min(1.0, sun_damage / 100.0), 2)

        # Wrinkle health score & presence
        wrinkle_score = max(10, min(100, int(elasticity)))
        wrinkle_present = elasticity < 60
        wrinkle_conf = round(max(0.0, (100.0 - elasticity) / 100.0), 2)

        # Texture / blackheads
        texture_score = max(10, min(100, int((structure + texture) / 2.0)))
        blackhead_present = structure < 55
        blackhead_conf = round(max(0.0, (100.0 - structure) / 100.0), 2)

        # Oil balance score (optimal around 55-65)
        oil_balance_score = max(10, min(100, int(100 - abs(hydration - 60.0) * 1.2)))

        # ---- detectedIssues ----
        detected_issues = [
            DetectedIssue(
                issue="Acne",
                present=acne_present,
                confidence=round(acne_conf, 2),
                severity=self._severity_from_conf(acne_conf) if acne_present else "none",
            ),
            DetectedIssue(
                issue="Pigmentation",
                present=pigmentation_present,
                confidence=pigmentation_conf,
                severity=self._severity_from_score(pigmentation_score) if pigmentation_present else "none",
            ),
            DetectedIssue(
                issue="Dark Circles",
                present=False,
                confidence=0.08,
                severity="none",
            ),
            DetectedIssue(
                issue="Wrinkles",
                present=wrinkle_present,
                confidence=wrinkle_conf,
                severity=self._severity_from_score(wrinkle_score) if wrinkle_present else "none",
            ),
            DetectedIssue(
                issue="Blackheads",
                present=blackhead_present,
                confidence=blackhead_conf,
                severity=self._severity_from_score(texture_score) if blackhead_present else "none",
            ),
        ]

        # ---- pores (derived from structure & texture) ----
        pore_factor = max(0.0, min(1.0, (100.0 - structure) / 100.0))
        pores = [
            PoreDetected(
                region="Left Cheek",
                present=pore_factor > 0.45,
                confidence=round(pore_factor, 2),
                severity=self._severity_from_conf(pore_factor),
            ),
            PoreDetected(
                region="Right Cheek",
                present=pore_factor > 0.45,
                confidence=round(pore_factor * 0.95, 2),
                severity=self._severity_from_conf(pore_factor * 0.95),
            ),
            PoreDetected(
                region="Forehead",
                present=pore_factor > 0.55,
                confidence=round(pore_factor * 0.75, 2),
                severity=self._severity_from_conf(pore_factor * 0.75),
            ),
            PoreDetected(
                region="Jaw",
                present=pore_factor > 0.65,
                confidence=round(pore_factor * 0.50, 2),
                severity=self._severity_from_conf(pore_factor * 0.50),
            ),
        ]

        # ---- skin type heuristic ----
        if hydration < 40:
            skin_type = "dry"
        elif hydration > 70 and oil_balance_score < 60:
            skin_type = "oily"
        elif abs(hydration - 60) <= 15 and structure >= 55:
            skin_type = "neutral"
        else:
            skin_type = "combination"

        # ---- subscores (all 0-100, where 100 = optimal skin health) ----
        subscores = {
            "acne":         max(0, min(100, int(100 - acne_conf * 100))),
            "pigmentation": pigmentation_score,
            "darkCircles":  95,
            "wrinkles":     wrinkle_score,
            "texture":      texture_score,
            "oilBalance":   oil_balance_score,
        }

        # ---- overall skin score: balanced weighted average ----
        skin_score = (
            subscores["acne"] * 0.25
            + subscores["pigmentation"] * 0.20
            + subscores["texture"] * 0.20
            + subscores["wrinkles"] * 0.15
            + subscores["oilBalance"] * 0.20
        )

        return SkinAnalysisResponse(
            detectedIssues=detected_issues,
            poresDetected=pores,
            skinType=skin_type,
            skinScore=max(0, min(100, int(round(skin_score)))),
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
