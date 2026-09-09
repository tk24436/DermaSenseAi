from pydantic import BaseModel, Field
from typing import List, Dict


class DetectedIssue(BaseModel):
    issue: str
    present: bool
    confidence: float = Field(ge=0.0, le=1.0)
    severity: str = Field(pattern="^(none|low|medium|high)$")


class PoreDetected(BaseModel):
    region: str
    present: bool
    confidence: float = Field(ge=0.0, le=1.0)
    severity: str = Field(pattern="^(none|low|medium|high)$")


class SkinAnalysisResponse(BaseModel):
    detectedIssues: List[DetectedIssue]
    poresDetected: List[PoreDetected]
    skinType: str = Field(pattern="^(oily|dry|neutral|combination)$")
    skinScore: int = Field(ge=0, le=100)
    subscores: Dict[str, int]
