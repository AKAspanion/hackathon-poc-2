from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.shipping_risk import ShippingRiskAssessment
from ..models.supplier import Supplier
from ..schemas.shipping_risk import (
    BulkShippingRiskResult,
    ShippingRiskAssessmentOut,
    ShippingRiskResult,
)
from ..services.shipping_risk import calculate_shipping_risk

router = APIRouter(prefix="/shipping-risk", tags=["shipping-risk"])


@router.post("/{supplier_id}", response_model=ShippingRiskResult, status_code=status.HTTP_201_CREATED)
def run_shipping_risk_for_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
) -> ShippingRiskResult:
    supplier: Optional[Supplier] = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

    result_dict = calculate_shipping_risk(supplier, db)

    assessment = ShippingRiskAssessment(
        supplier_id=supplier.id,
        shipping_risk_score=result_dict["shipping_risk_score"],
        risk_level=result_dict["risk_level"],
        delay_probability=result_dict["delay_probability"],
        delay_risk_score=result_dict.get("delay_risk_score"),
        stagnation_risk_score=result_dict.get("stagnation_risk_score"),
        velocity_risk_score=result_dict.get("velocity_risk_score"),
        risk_factors=result_dict["risk_factors"],
        recommended_actions=result_dict["recommended_actions"],
        shipment_metadata=result_dict.get("shipment_metadata"),
    )
    db.add(assessment)
    db.commit()

    return ShippingRiskResult(**result_dict)


@router.post("/run-all", response_model=List[BulkShippingRiskResult])
def run_shipping_risk_for_all_suppliers(
    db: Session = Depends(get_db),
) -> List[BulkShippingRiskResult]:
    suppliers: List[Supplier] = db.query(Supplier).all()
    results: List[BulkShippingRiskResult] = []

    for supplier in suppliers:
        result_dict = calculate_shipping_risk(supplier, db)
        assessment = ShippingRiskAssessment(
            supplier_id=supplier.id,
            shipping_risk_score=result_dict["shipping_risk_score"],
            risk_level=result_dict["risk_level"],
            delay_probability=result_dict["delay_probability"],
            delay_risk_score=result_dict.get("delay_risk_score"),
            stagnation_risk_score=result_dict.get("stagnation_risk_score"),
            velocity_risk_score=result_dict.get("velocity_risk_score"),
            risk_factors=result_dict["risk_factors"],
            recommended_actions=result_dict["recommended_actions"],
            shipment_metadata=result_dict.get("shipment_metadata"),
        )
        db.add(assessment)
        results.append(
            BulkShippingRiskResult(
                supplier_id=supplier.id,
                supplier_name=supplier.name,
                result=ShippingRiskResult(**result_dict),
            )
        )

    db.commit()

    return results


@router.get("/assessments", response_model=List[ShippingRiskAssessmentOut])
def list_assessments(db: Session = Depends(get_db)) -> List[ShippingRiskAssessmentOut]:
    assessments = db.query(ShippingRiskAssessment).all()
    return assessments
