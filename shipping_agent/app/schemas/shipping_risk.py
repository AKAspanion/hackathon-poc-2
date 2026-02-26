from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ShippingRiskAssessmentOut(BaseModel):
    id: int
    supplier_id: int
    shipping_risk_score: float
    risk_level: str
    delay_probability: float
    delay_risk_score: Optional[float] = None
    stagnation_risk_score: Optional[float] = None
    velocity_risk_score: Optional[float] = None
    risk_factors: List[str]
    recommended_actions: List[str]
    shipment_metadata: Optional[Dict[str, Any]] = None
    assessed_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ShippingRiskResult(BaseModel):
    shipping_risk_score: float
    risk_level: str
    delay_probability: float
    delay_risk_score: Optional[float] = None
    stagnation_risk_score: Optional[float] = None
    velocity_risk_score: Optional[float] = None
    risk_factors: List[str]
    recommended_actions: List[str]
    shipment_metadata: Optional[Dict[str, Any]] = None


class BulkShippingRiskResult(BaseModel):
    supplier_id: int
    supplier_name: str
    result: ShippingRiskResult
