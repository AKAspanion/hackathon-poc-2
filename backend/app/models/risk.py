import uuid
import enum
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class RiskSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskStatus(str, enum.Enum):
    DETECTED = "detected"
    ANALYZING = "analyzing"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    FALSE_POSITIVE = "false_positive"


class Risk(Base):
    __tablename__ = "risks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(
        Enum(
            RiskSeverity,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
            name="risks_severity_enum",
        ),
        default=RiskSeverity.MEDIUM,
    )
    status = Column(
        Enum(
            RiskStatus,
            values_callable=lambda enum_cls: [e.value for e in enum_cls],
            name="risks_status_enum",
        ),
        default=RiskStatus.DETECTED,
    )
    sourceType = Column(String, nullable=False)
    sourceData = Column(JSONB, nullable=True)
    affectedRegion = Column(String, nullable=True)
    # Human-readable supplier name(s) from the LLM output (for display/trace).
    affectedSupplier = Column(String, nullable=True)
    estimatedImpact = Column(String, nullable=True)
    estimatedCost = Column(Numeric(10, 2), nullable=True)

    # Strong association to Supplier so risks are always in relation to a supplier.
    supplierId = Column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
    )

    oemId = Column(UUID(as_uuid=True), nullable=True)
    createdAt = Column(DateTime(timezone=True), server_default=func.now())
    updatedAt = Column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    supplier = relationship("Supplier", back_populates="risks")
    mitigation_plans = relationship(
        "MitigationPlan",
        back_populates="risk",
        cascade="all, delete-orphan",
    )
