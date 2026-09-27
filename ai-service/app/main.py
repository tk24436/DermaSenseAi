"""
DermaSense AI — AI Analysis Service
-------------------------------------
FastAPI application entrypoint.
"""

import logging
import os

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import Base, engine, get_db
from app.models import SkinAnalysis
from app.schemas import SkinAnalysisResponse
from app.services.analyzer import get_analyzer
from app.services.storage import StorageService

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DermaSense AI - AI Analysis Service",
    version="0.1.0",
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


@app.get("/health")
async def health_check():
    """Simple liveness probe."""
    return {"status": "ok"}


@app.post("/api/ai/analyze", response_model=SkinAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
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

    # Haar Cascade face detector
    face_cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(face_cascade_path)
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=3, minSize=(60, 60))
    if len(faces) == 0:
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
        db_record = SkinAnalysis(
            userId="mock-user-id",  # TODO: extract from JWT once auth service is merged
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
