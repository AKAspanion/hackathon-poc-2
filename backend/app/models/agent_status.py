import uuid
import enum
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func

from app.database import Base


class AgentStatus(str, enum.Enum):
    IDLE = "idle"
    MONITORING = "monitoring"
    ANALYZING = "analyzing"
    PROCESSING = "processing"
    ERROR = "error"


class AgentStatusEntity(Base):
    __tablename__ = "agent_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String, default=AgentStatus.IDLE.value)
    currentTask = Column(Text, nullable=True)
    lastProcessedData = Column(JSONB, nullable=True)
    lastDataSource = Column(String, nullable=True)
    errorMessage = Column(String, nullable=True)
    risksDetected = Column(Integer, default=0)
    opportunitiesIdentified = Column(Integer, default=0)
    plansGenerated = Column(Integer, default=0)
    lastUpdated = Column(DateTime(timezone=True), onupdate=func.now())
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
