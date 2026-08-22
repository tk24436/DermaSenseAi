from pydantic import BaseModel, Field
from typing import List, Dict, Optional

class DetectedIssue(BaseModel):
    issue: str
    present: bool
    confidence: float
    severity: str

class PoreDetected(BaseModel):
    region: str
    present: bool
    confidence: float
    severity: str

class SkinAnalysisResponse(BaseModel):
    detectedIssues: List[DetectedIssue]
    poresDetected: List[PoreDetected]
    skinType: str
    skinScore: int
    subscores: Dict[str, int]
