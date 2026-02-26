from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from ..database import Base


class ShippingRiskAssessment(Base):
    __tablename__ = "shipping_risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False)

    shipping_risk_score = Column(Float, nullable=False)
    risk_level = Column(String(50), nullable=False)
    delay_probability = Column(Float, nullable=False)

    # Sub-component risk scores derived from shipment tracking
    delay_risk_score = Column(Float, nullable=True)
    stagnation_risk_score = Column(Float, nullable=True)
    velocity_risk_score = Column(Float, nullable=True)

    risk_factors = Column(JSONB, nullable=False)
    recommended_actions = Column(JSONB, nullable=False)

    # Raw metadata returned by the shipment agent (tracking + derived features)
    shipment_metadata = Column(JSONB, nullable=True)

    assessed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    supplier = relationship("Supplier", backref="risk_assessments")
