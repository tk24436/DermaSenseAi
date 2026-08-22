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
