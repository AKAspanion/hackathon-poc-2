import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class PlanStatus(str, enum.Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MitigationPlan(Base):
    __tablename__ = "mitigation_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    actions = Column(ARRAY(Text), nullable=False)
    status = Column(
        Enum(
            PlanStatus,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
            name="mitigation_plans_status_enum",
        ),
        default=PlanStatus.DRAFT,
    )
    riskId = Column(UUID(as_uuid=True), ForeignKey("risks.id"), nullable=True)
    opportunityId = Column(UUID(as_uuid=True), ForeignKey("opportunities.id"), nullable=True)
    metadata_ = Column("metadata", JSONB, nullable=True)
    assignedTo = Column(String, nullable=True)
    dueDate = Column(Date, nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    risk = relationship("Risk", back_populates="mitigation_plans")
    opportunity = relationship("Opportunity", back_populates="mitigation_plans")
