import uuid
from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from .database import Base


class SkinAnalysis(Base):
    __tablename__ = "skin_analysis"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    userId = Column(String, index=True, nullable=False)
    imageUrl = Column(String, nullable=False)
    detectedIssues = Column(JSON, nullable=False)
    poresDetected = Column(JSON, nullable=False)
    skinType = Column(String, nullable=False)
    skinScore = Column(Integer, nullable=False)
    subscores = Column(JSON, nullable=False)
    createdAt = Column(DateTime, default=lambda: datetime.now(timezone.utc))
