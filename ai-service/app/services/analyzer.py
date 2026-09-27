"""
Analyzer Strategy Pattern
--------------------------
Supports Face++ API and ONNX (Glowlytics + ACNE04 YOLOv8) backends.
Switch via ACTIVE_ANALYZER env var: 'facepp' or 'onnx'.
"""

import io
import logging
import os
from abc import ABC, abstractmethod

import requests
from PIL import Image

from app.schemas import SkinAnalysisResponse
from app.services.transform_acne04 import transform_acne04_response
from app.services.transform_facepp import transform_facepp_response

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
    """Calls the Face++ Skin Analyze API and delegates response mapping to
    transform_facepp."""

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
        transformed = transform_facepp_response(result)
        return SkinAnalysisResponse(**transformed)


# ---------------------------------------------------------------------------
# ONNX implementation (Glowlytics Signals + YOLOv8 ACNE04 Detector)
# ---------------------------------------------------------------------------
class ONNXAnalyzer(BaseAnalyzer):
    """
    Local ONNX inference combining:
      - structure_model.onnx  : Pores, texture regularity, structure score (Glowlytics)
      - hydration_model.onnx  : Hydration score (Glowlytics)
      - elasticity_model.onnx : Elasticity score (Glowlytics)
      - acne_detector.onnx    : YOLOv8s ACNE04 severity bounding boxes + confidences
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

        for p, name in [
            (struct_path, "structure_model.onnx"),
            (hydra_path, "hydration_model.onnx"),
            (elast_path, "elasticity_model.onnx"),
            (acne_path, "acne_detector.onnx"),
        ]:
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
        logger.info("ONNXAnalyzer: running local ONNX inference")
        pil_img  = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        signals  = self._run_skin_signals(pil_img)
        acne_out = self._run_acne_detector(pil_img)

        # Fallback to Face++ if local acne detector confidence is low across the board and Face++ credentials exist
        if acne_out.get("max_confidence", 0.0) < 0.20 and os.getenv("FACEPP_API_KEY") and os.getenv("FACEPP_API_SECRET"):
            try:
                logger.info("Local ACNE04 detection confidence is low (<0.20). Attempting Face++ fallback...")
                return FacePPAnalyzer().analyze(image_bytes)
            except Exception as e:
                logger.warning("Face++ fallback failed, proceeding with local analysis: %s", e)

        transformed = transform_acne04_response(acne_out, signals)
        return SkinAnalysisResponse(**transformed)

    # ------------------------------------------------------------------ #
    #  Model runners                                                       #
    # ------------------------------------------------------------------ #

    def _run_skin_signals(self, pil_img: Image.Image) -> dict:
        """Returns {structure, hydration, sunDamage, elasticity, texture} normalized to 0-100."""
        import numpy as np
        tensor = self._preprocess_signals(pil_img)

        # 1. Structure & Texture
        struct_out = self._struct_sess.run(None, {"image": tensor})
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

    def _run_acne_detector(self, pil_img: Image.Image) -> dict:
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

    def _preprocess_signals(self, pil_img: Image.Image):
        """Resize(256) -> CenterCrop(224) -> normalize -> [1,3,224,224] float32."""
        import numpy as np
        w, h = pil_img.size
        scale = 256 / min(w, h)
        new_w, new_h = int(round(w * scale)), int(round(h * scale))
        img = pil_img.resize((new_w, new_h), resample=Image.Resampling.BILINEAR)

        left = (new_w - 224) // 2
        top  = (new_h - 224) // 2
        img = img.crop((left, top, left + 224, top + 224))

        arr = (np.array(img, dtype=np.float32) / 255.0 - np.array(self._MEAN, dtype=np.float32)) / np.array(self._STD, dtype=np.float32)
        return arr.transpose(2, 0, 1)[np.newaxis].astype(np.float32)

    def _preprocess_yolo(self, pil_img: Image.Image):
        """Resize to 640x640, return (tensor [1,3,640,640], orig_w, orig_h)."""
        import numpy as np
        orig_w, orig_h = pil_img.size
        img = pil_img.resize((640, 640), resample=Image.Resampling.BILINEAR)
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = arr.transpose(2, 0, 1)[np.newaxis]
        return arr, orig_w, orig_h

    # ------------------------------------------------------------------ #
    #  YOLOv8 output parsing                                              #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _parse_yolo_output(raw, orig_w: int, orig_h: int, conf_thresh: float = 0.25) -> list:
        """
        raw shape: [1, 5, 8400] or [1, 4+num_classes, 8400].
        Returns list of {class, confidence, bbox} dicts above conf_thresh.
        """
        import numpy as np
        predictions = raw[0].T  # [8400, channels]
        boxes = predictions[:, :4]
        # Handles single class (confidence at index 4) or multiclass severity (argmax of class confidences)
        if predictions.shape[1] == 5:
            confidences = predictions[:, 4]
            class_indices = np.zeros(len(confidences), dtype=int)
        else:
            class_scores = predictions[:, 4:]
            class_indices = np.argmax(class_scores, axis=1)
            confidences = np.max(class_scores, axis=1)

        detections = []
        for (cx, cy, w, h), conf, cls_idx in zip(boxes, confidences, class_indices):
            if conf < conf_thresh:
                continue
            x1 = int(max(0, (cx - w / 2) * orig_w / 640))
            y1 = int(max(0, (cy - h / 2) * orig_h / 640))
            x2 = int(min(orig_w, (cx + w / 2) * orig_w / 640))
            y2 = int(min(orig_h, (cy + h / 2) * orig_h / 640))
            detections.append({
                "class": int(cls_idx),
                "confidence": float(conf),
                "bbox": [x1, y1, x2, y2],
            })
        return detections


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
