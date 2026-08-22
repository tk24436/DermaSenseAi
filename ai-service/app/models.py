import uuid
from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from .database import Base

class SkinAnalysis(Base):
    __tablename__ = "skin_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    userId = Column(String, index=True) # Will map to UUID from Auth service
    imageUrl = Column(String)
    detectedIssues = Column(JSON)
    poresDetected = Column(JSON)
    skinType = Column(String)
    skinScore = Column(Integer)
    subscores = Column(JSON)
    createdAt = Column(DateTime, default=datetime.utcnow)
