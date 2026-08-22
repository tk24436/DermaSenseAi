from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import get_db, engine, Base
from app.models import SkinAnalysis
from app.schemas import SkinAnalysisResponse
from app.services.analyzer import get_analyzer
from app.services.storage import StorageService

Base.metadata.create_all(bind=engine)

app = FastAPI(title="DermaSense AI - AI Analysis Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

storage_service = StorageService()

@app.post("/api/ai/analyze", response_model=SkinAnalysisResponse)
async def analyze_image(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
        
    try:
        content = await file.read()
        
        # 1. Analyze Image
        analyzer = get_analyzer()
        analysis_result = analyzer.analyze(content)
        
        # 2. Upload to Storage
        image_url = storage_service.upload_image(content, file.filename)
        
        # 3. Save to DB
        db_record = SkinAnalysis(
            userId="mock-user-id", # TODO: Get from auth token in real integration
            imageUrl=image_url,
            detectedIssues=[item.model_dump() for item in analysis_result.detectedIssues],
            poresDetected=[item.model_dump() for item in analysis_result.poresDetected],
            skinType=analysis_result.skinType,
            skinScore=analysis_result.skinScore,
            subscores=analysis_result.subscores
        )
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
        
        return analysis_result
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
