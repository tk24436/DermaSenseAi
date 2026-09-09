from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

from .routine_builder import generate_routine
from .llm_service import generate_explanation_and_insights

app = FastAPI(title="DermaSense AI - Recommendation Engine")

class RecommendRequest(BaseModel):
    userId: str
    skinAnalysis: Dict[str, Any]
    skinProfile: Optional[Dict[str, Any]] = Field(default_factory=dict)

@app.post("/recommend")
async def recommend(request: RecommendRequest):
    try:
        routine = generate_routine(request.skinAnalysis)
        llm_response = generate_explanation_and_insights(
            skin_analysis=request.skinAnalysis,
            skin_profile=request.skinProfile,
            routine=routine
        )
        
        return {
            "routine": routine,
            "explanation": llm_response.get("explanation", ""),
            "insights": llm_response.get("insights", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
