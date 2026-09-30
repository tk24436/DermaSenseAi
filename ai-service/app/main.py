"""
DermaSense AI — AI Analysis Service
-------------------------------------
FastAPI application entrypoint.
"""

import logging
import os

import base64
import json
import uuid

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Any, Dict, Optional

from app.database import Base, engine, get_db
from app.models import SkinAnalysis
from app.schemas import SkinAnalysisResponse
from app.services.analyzer import get_analyzer
from app.services.storage import StorageService

try:
    from recommendation.routine_builder import generate_routine
    from recommendation.llm_service import generate_explanation_and_insights
except ImportError:
    import sys
    sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
    from recommendation.routine_builder import generate_routine
    from recommendation.llm_service import generate_explanation_and_insights

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DermaSense AI - AI Analysis & Recommendation Service",
    version="0.2.0",
    docs_url="/docs",
)

# CORS — restrict in production via ALLOWED_ORIGINS env var
_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-init: don't crash the whole app if MinIO isn't up yet
storage_service = StorageService()

# Maximum upload size (10 MB)
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class RecommendRequest(BaseModel):
    userId: Optional[str] = "user_default"
    skinAnalysis: Optional[Dict[str, Any]] = None
    skin_analysis: Optional[Dict[str, Any]] = None
    skinProfile: Optional[Dict[str, Any]] = Field(default_factory=dict)
    skin_profile: Optional[Dict[str, Any]] = None

    def get_analysis(self) -> Dict[str, Any]:
        return self.skinAnalysis or self.skin_analysis or {}

    def get_profile(self) -> Dict[str, Any]:
        return self.skinProfile or self.skin_profile or {}


@app.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}


@app.post("/api/recommendations/generate")
@app.post("/recommend")
async def generate_recommendations(request: RecommendRequest):
    """Generate personalized daily/weekly skincare routines based on AI vision analysis
    and user skin profile (allergies, sensitivity, skin goals)."""
    try:
        analysis_data = request.get_analysis()
        profile_data = request.get_profile()
        routine = generate_routine(analysis_data, profile_data)
        llm_response = generate_explanation_and_insights(
            skin_analysis=analysis_data,
            skin_profile=profile_data,
            routine=routine,
        )
        insights = llm_response.get("insights", [])
        return {
            "routine": routine,
            "explanation": llm_response.get("explanation", ""),
            "insights": insights,
            "aiInsights": " ".join(insights) if isinstance(insights, list) else str(insights),
            "disclaimer": "*Disclaimer: This is not medical advice. Please consult a dermatologist for medical concerns.*",
        }
    except Exception as e:
        logger.error("Recommendation generation failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ai/analyze", response_model=SkinAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Accept a face image, run skin analysis, persist result, and return
    the standardised SkinAnalysis JSON."""

    # --- Input validation ---
    if file.content_type is None or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG or PNG)")

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Image exceeds maximum size of {MAX_UPLOAD_BYTES // (1024*1024)} MB",
        )

    # --- OpenCV Preprocessing & Validation ---
    import cv2
    import numpy as np

    nparr = np.frombuffer(content, np.uint8)
    cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if cv_img is None:
        raise HTTPException(status_code=400, detail="Invalid or corrupt image file.")

    height, width = cv_img.shape[:2]
    if height < 150 or width < 150:
        raise HTTPException(
            status_code=400,
            detail=f"Image resolution too small ({width}x{height}px). Minimum required is 150x150 pixels.",
        )

    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    mean_brightness = float(np.mean(gray))
    if mean_brightness < 40.0:
        raise HTTPException(
            status_code=400,
            detail=f"Image is too dark (average brightness {mean_brightness:.1f}/255). Please upload a well-lit photo.",
        )

    # Face detection: Try frontal and profile cascades with skin texture fallback
    face_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=2, minSize=(40, 40))
    if len(faces) == 0:
        profile_path = cv2.data.haarcascades + "haarcascade_profileface.xml"
        if os.path.exists(profile_path):
            profile_cascade = cv2.CascadeClassifier(profile_path)
            faces = profile_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=2, minSize=(40, 40))

    if len(faces) == 0:
        # Check if the image contains typical human skin tone pixels (YCbCr color space)
        # to accept closeup acne skin crops while rejecting non-human or blank images
        ycrcb = cv2.cvtColor(cv_img, cv2.COLOR_BGR2YCrCb)
        skin_mask = cv2.inRange(ycrcb, np.array([0, 133, 77]), np.array([255, 173, 127]))
        skin_ratio = float(np.sum(skin_mask > 0)) / (height * width)
        if skin_ratio < 0.08:
            raise HTTPException(
                status_code=400,
                detail="No face detected in the image. Please upload a clear frontal face photo.",
            )

    # --- Analysis ---
    try:
        analyzer = get_analyzer()
        analysis_result = analyzer.analyze(content)
    except ValueError as e:
        # Config errors (missing keys, bad ACTIVE_ANALYZER)
        logger.error("Analyzer configuration error: %s", e)
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        # Upstream failures (Face++ down, etc.)
        logger.error("Analyzer runtime error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    # --- Storage ---
    try:
        image_url = storage_service.upload_image(
            content,
            file.filename or "upload.jpg",
            content_type=file.content_type or "image/jpeg",
        )
    except Exception as e:
        logger.warning("Image storage failed (analysis still returned): %s", e)
        image_url = ""  # Non-critical: analysis still valid

    # --- Persist ---
    try:
        resolved_user_id = x_user_id
        if not resolved_user_id and authorization and authorization.startswith("Bearer "):
            try:
                token_parts = authorization.split(" ")[1].split(".")
                if len(token_parts) >= 2:
                    padding = "=" * (4 - (len(token_parts[1]) % 4))
                    payload_bytes = base64.b64decode(token_parts[1] + padding)
                    payload_data = json.loads(payload_bytes.decode())
                    resolved_user_id = payload_data.get("sub") or payload_data.get("userId")
            except Exception:
                pass
        if not resolved_user_id:
            resolved_user_id = f"usr_{uuid.uuid4().hex[:12]}"

        db_record = SkinAnalysis(
            userId=resolved_user_id,
            imageUrl=image_url,
            detectedIssues=[item.model_dump() for item in analysis_result.detectedIssues],
            poresDetected=[item.model_dump() for item in analysis_result.poresDetected],
            skinType=analysis_result.skinType,
            skinScore=analysis_result.skinScore,
            subscores=analysis_result.subscores,
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
    except Exception as e:
        db.rollback()
        logger.error("Database write failed: %s", e)
        # Still return the analysis — DB failure is non-critical for the client
        logger.warning("Returning analysis result despite DB failure")

    return analysis_result
