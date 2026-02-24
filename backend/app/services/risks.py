from uuid import UUID
from decimal import Decimal, InvalidOperation
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.models.risk import Risk, RiskSeverity, RiskStatus
from app.schemas.risk import CreateRisk, UpdateRisk


def get_all(
    db: Session,
    status: str | None = None,
    severity: str | None = None,
    oem_id: str | None = None,
) -> list[Risk]:
    q = (
        db.query(Risk)
        .options(joinedload(Risk.mitigation_plans))
        .order_by(Risk.createdAt.desc())
    )
    if status:
        q = q.filter(Risk.status == status)
    if severity:
        q = q.filter(Risk.severity == severity)
    if oem_id:
        q = q.filter(Risk.oemId == oem_id)
    return q.all()


def get_one(db: Session, id: UUID) -> Risk | None:
    return (
        db.query(Risk)
        .options(joinedload(Risk.mitigation_plans))
        .filter(Risk.id == id)
        .first()
    )


def create_risk(db: Session, dto: CreateRisk) -> Risk:
    risk = Risk(
        title=dto.title,
        description=dto.description,
        severity=dto.severity or RiskSeverity.MEDIUM,
        status=dto.status or RiskStatus.DETECTED,
        sourceType=dto.sourceType,
        sourceData=dto.sourceData,
        affectedRegion=dto.affectedRegion,
        affectedSupplier=dto.affectedSupplier,
        estimatedImpact=dto.estimatedImpact,
        estimatedCost=dto.estimatedCost,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


def _parse_severity(v) -> RiskSeverity:
    if isinstance(v, RiskSeverity):
        return v
    if isinstance(v, str):
        try:
            return RiskSeverity(v.lower())
        except ValueError:
            pass
    return RiskSeverity.MEDIUM


_MAX_NUMERIC = Decimal("99999999.99")


def _sanitize_numeric(value) -> Decimal | None:
    if value is None:
        return None
    try:
        num = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None
    # Enforce column constraint: precision 10, scale 2 -> abs(value) < 1e8
    if num > _MAX_NUMERIC:
        return _MAX_NUMERIC
    if num < -_MAX_NUMERIC:
        return -_MAX_NUMERIC
    return num


def create_risk_from_dict(db: Session, data: dict) -> Risk:
    risk = Risk(
        title=data["title"],
        description=data["description"],
        severity=_parse_severity(data.get("severity")),
        status=RiskStatus.DETECTED,
        sourceType=data.get("sourceType", "unknown"),
        sourceData=data.get("sourceData"),
        affectedRegion=data.get("affectedRegion"),
        affectedSupplier=data.get("affectedSupplier"),
        estimatedImpact=data.get("estimatedImpact"),
        estimatedCost=_sanitize_numeric(data.get("estimatedCost")),
        oemId=data.get("oemId"),
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


def update_risk(db: Session, id: UUID, dto: UpdateRisk) -> Risk | None:
    risk = get_one(db, id)
    if not risk:
        return None
    update_data = dto.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(risk, k, v)
    db.commit()
    db.refresh(risk)
    return risk


def get_stats(db: Session) -> dict:
    total = db.query(func.count(Risk.id)).scalar() or 0
    by_status = (
        db.query(Risk.status, func.count(Risk.id))
        .group_by(Risk.status)
        .all()
    )
    by_severity = (
        db.query(Risk.severity, func.count(Risk.id))
        .group_by(Risk.severity)
        .all()
    )
    return {
        "total": total,
        "byStatus": {str(s): c for s, c in by_status},
        "bySeverity": {str(s): c for s, c in by_severity},
    }
