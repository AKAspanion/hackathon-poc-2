import asyncio
import logging
from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.agent_status import AgentStatusEntity, AgentStatus
from app.models.risk import Risk, RiskStatus
from app.models.opportunity import Opportunity, OpportunityStatus
from app.models.mitigation_plan import MitigationPlan
from app.models.supply_chain_risk_score import SupplyChainRiskScore
from app.services.oems import get_oem_by_id, get_all_oems
from app.services.suppliers import (
    get_all as get_suppliers,
    get_risks_by_supplier,
    get_swarm_summaries_by_supplier,
)
from app.services.risks import create_risk_from_dict
from app.services.opportunities import create_opportunity_from_dict
from app.services.mitigation_plans import create_plan_from_dict
from app.services.agent_orchestrator import (
    analyze_data,
    analyze_global_risk,
    analyze_shipping_disruptions,
    generate_mitigation_plan,
    generate_combined_mitigation_plan,
    generate_opportunity_plan,
)
from app.services.agent_types import OemScope
from app.services.data_sources.manager import get_data_source_manager
from app.services.websocket_manager import (
    broadcast_agent_status,
    broadcast_suppliers_snapshot,
)

logger = logging.getLogger(__name__)

# Severity weights for risk score (0-100). Critical=4, high=3, medium=2, low=1.
SEVERITY_WEIGHT = {"critical": 4, "high": 3, "medium": 2, "low": 1}
# 40 weighted points => score 100 (e.g. 10 critical or 40 low).
RISK_SCORE_SCALE = 100 / 40  # 2.5
_is_running = False


def _ensure_agent_status(db: Session) -> AgentStatusEntity:
    status = db.query(AgentStatusEntity).first()
    if not status:
        status = AgentStatusEntity(
            status=AgentStatus.IDLE.value,
            risksDetected=0,
            opportunitiesIdentified=0,
            plansGenerated=0,
            lastUpdated=datetime.utcnow(),
        )
        db.add(status)
        db.commit()
        db.refresh(status)
    return status


def get_oem_scope(db: Session, oem_id: UUID) -> OemScope | None:
    oem = get_oem_by_id(db, oem_id)
    if not oem:
        return None
    suppliers = get_suppliers(db, oem_id)
    supplier_names = []
    locations = []
    cities = []
    countries = []
    regions = []
    commodities = set()
    for s in suppliers:
        if s.name:
            supplier_names.append(s.name)
        if s.location:
            locations.append(s.location)
        if s.city:
            cities.append(s.city)
        if s.country:
            countries.append(s.country)
        if s.region:
            regions.append(s.region)
        if s.commodities:
            for c in (s.commodities or "").replace(";", ",").split(","):
                c = c.strip()
                if c:
                    commodities.add(c)
    return OemScope(
        oemId=str(oem_id),
        oemName=oem.name,
        supplierNames=list(dict.fromkeys(supplier_names)),
        locations=list(dict.fromkeys(locations)),
        cities=list(dict.fromkeys(cities)),
        countries=list(dict.fromkeys(countries)),
        regions=list(dict.fromkeys(regions)),
        commodities=list(commodities),
    )


def _build_data_source_params(scope: OemScope) -> dict:
    cities = (
        scope.get("cities")
        or scope.get("locations")[:10]
        if scope.get("locations")
        else ["New York", "London", "Tokyo", "Mumbai", "Shanghai"]
    )
    if not cities:
        cities = ["New York", "London", "Tokyo", "Mumbai", "Shanghai"]
    commodities = scope.get("commodities") or [
        "steel",
        "copper",
        "oil",
        "grain",
        "semiconductors",
    ]
    if len(cities) >= 2:
        routes = [{"origin": cities[0], "destination": cities[1]}]
        if len(cities) >= 4:
            routes.append({"origin": cities[2], "destination": cities[3]})
    else:
        routes = [{"origin": "New York", "destination": "Los Angeles"}]
    keywords = (
        ["supply chain", "manufacturing", "logistics"]
        + (scope.get("commodities") or [])[:3]
    )
    return {
        "cities": cities,
        "commodities": commodities,
        "routes": routes,
        "keywords": keywords,
    }


def _build_global_news_params() -> dict:
    return {
        "keywords": [
            "global supply chain", "geopolitical risk", "trade disruption",
            "raw materials shortage", "logistics crisis", "shipping capacity",
        ]
    }


def _compute_risk_score(risks: list) -> tuple[float, dict, dict]:
    """
    Compute a risk score between 0 and 100 from detected risks.
    Uses severity weights (critical=4, high=3, medium=2, low=1); 40 weighted
    points map to 100 (e.g. 10 critical or 40 low). No risks => 0.
    """
    severity_counts: dict[str, int] = {}
    breakdown: dict[str, float] = {}
    weighted_sum = 0.0
    for r in risks:
        sev = (getattr(r.severity, "value", r.severity) or "medium").lower()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        w = SEVERITY_WEIGHT.get(sev, 2)
        weighted_sum += w
        src = (r.sourceType or "other")
        breakdown[src] = breakdown.get(src, 0) + w
    # Score 0-100: 0 when no risks, else min(100, weighted_sum * scale).
    overall = (
        0.0
        if not risks
        else min(100.0, round(weighted_sum * RISK_SCORE_SCALE, 2))
    )
    return overall, breakdown, severity_counts


def _update_status(db: Session, status: str, task: str | None = None) -> None:
    ent = db.query(AgentStatusEntity).first()
    if ent:
        ent.status = status
        ent.currentTask = task
        ent.lastUpdated = datetime.utcnow()
        db.commit()


async def _broadcast_current_status(db: Session) -> None:
    """
    Build a lightweight status payload and broadcast it to websocket clients.
    """
    ent = get_status(db)
    if not ent:
        return
    payload = {
        "id": str(ent.id),
        "status": ent.status,
        "currentTask": ent.currentTask,
        "lastProcessedData": ent.lastProcessedData,
        "lastDataSource": ent.lastDataSource,
        "errorMessage": ent.errorMessage,
        "risksDetected": ent.risksDetected,
        "opportunitiesIdentified": ent.opportunitiesIdentified,
        "plansGenerated": ent.plansGenerated,
        "lastUpdated": ent.lastUpdated.isoformat() if ent.lastUpdated else None,
        "createdAt": ent.createdAt.isoformat() if ent.createdAt else None,
    }
    await broadcast_agent_status(payload)


async def _run_analysis_for_oem(db: Session, scope: OemScope) -> None:
    oem_id = UUID(scope["oemId"])
    manager = get_data_source_manager()
    await manager.initialize()

    logger.info(
        "_run_analysis_for_oem: start for OEM %s (%s)",
        scope["oemId"],
        scope["oemName"],
    )

    # 1. Supplier-scoped: weather + news
    _update_status(
        db,
        AgentStatus.MONITORING.value,
        f"Fetching weather & news for OEM: {scope['oemName']}",
    )
    await _broadcast_current_status(db)
    supplier_params = _build_data_source_params(scope)
    supplier_data = await manager.fetch_by_types(["weather", "news"], supplier_params)
    logger.info(
        "_run_analysis_for_oem: supplier data fetched "
        "weather=%d news=%d for OEM %s",
        len(supplier_data.get("weather") or []),
        len(supplier_data.get("news") or []),
        scope["oemName"],
    )
    _update_status(
        db,
        AgentStatus.ANALYZING.value,
        f"Analyzing for OEM: {scope['oemName']}",
    )
    await _broadcast_current_status(db)
    supplier_analysis = await analyze_data(supplier_data, scope)
    logger.info(
        "_run_analysis_for_oem: supplier analysis results "
        "risks=%d opportunities=%d for OEM %s",
        len(supplier_analysis.get("risks") or []),
        len(supplier_analysis.get("opportunities") or []),
        scope["oemName"],
    )
    _update_status(
        db,
        AgentStatus.PROCESSING.value,
        f"Saving supplier results for OEM: {scope['oemName']}",
    )
    await _broadcast_current_status(db)
    for r in supplier_analysis["risks"]:
        r["oemId"] = oem_id
        create_risk_from_dict(db, r)
    for o in supplier_analysis["opportunities"]:
        o["oemId"] = oem_id
        create_opportunity_from_dict(db, o)

    # 2. Global risk
    _update_status(
        db,
        AgentStatus.MONITORING.value,
        "Fetching global news",
    )
    await _broadcast_current_status(db)
    global_data = await manager.fetch_by_types(["news"], _build_global_news_params())
    global_result = await analyze_global_risk(global_data)
    logger.info(
        "_run_analysis_for_oem: global news analysis risks=%d for OEM %s",
        len(global_result.get("risks") or []),
        scope["oemName"],
    )
    for r in global_result["risks"]:
        r["oemId"] = oem_id
        create_risk_from_dict(db, r)

    # 3. Shipping routes
    _update_status(
        db,
        AgentStatus.MONITORING.value,
        f"Fetching shipping for OEM: {scope['oemName']}",
    )
    await _broadcast_current_status(db)
    route_params = {"routes": supplier_params["routes"]}
    route_data = await manager.fetch_by_types(["traffic", "shipping"], route_params)
    shipping_result = await analyze_shipping_disruptions(route_data)
    logger.info(
        "_run_analysis_for_oem: shipping analysis risks=%d for OEM %s",
        len(shipping_result.get("risks") or []),
        scope["oemName"],
    )
    for r in shipping_result["risks"]:
        r["oemId"] = oem_id
        create_risk_from_dict(db, r)

    # 4. Risk score
    all_risks = (
        db.query(Risk)
        .filter(Risk.oemId == oem_id, Risk.status == RiskStatus.DETECTED)
        .all()
    )
    overall, breakdown, severity_counts = _compute_risk_score(all_risks)
    score_ent = SupplyChainRiskScore(
        oemId=oem_id,
        overallScore=overall,
        breakdown=breakdown,
        severityCounts=severity_counts,
        riskIds=",".join(str(r.id) for r in all_risks) if all_risks else None,
    )
    db.add(score_ent)
    db.commit()
    logger.info(
        "_run_analysis_for_oem: risk score stored overall=%s for OEM %s "
        "(risks=%d)",
        overall,
        scope["oemName"],
        len(all_risks),
    )

    # 5. Mitigation plans by supplier
    risks_by_supplier: dict[str, list[Risk]] = {}
    for risk in all_risks:
        key = (risk.affectedSupplier or "").strip()
        if not key:
            continue
        risks_by_supplier.setdefault(key, []).append(risk)
    combined_plans_created = 0
    for supplier_name, risk_list in risks_by_supplier.items():
        plan_data = await generate_combined_mitigation_plan(
            supplier_name,
            [
                {
                    "id": r.id,
                    "title": r.title,
                    "severity": getattr(r.severity, "value", r.severity),
                    "description": r.description,
                    "affectedRegion": r.affectedRegion,
                }
                for r in risk_list
            ],
        )
        create_plan_from_dict(
            db,
            plan_data,
            risk_id=risk_list[0].id,
            opportunity_id=None,
        )
        combined_plans_created += 1
    logger.info(
        "_run_analysis_for_oem: combined mitigation plans created=%d "
        "for OEM %s",
        combined_plans_created,
        scope["oemName"],
    )

    # 6. Per-risk plans for risks without supplier or not in combined
    risks_with_plan_supplier = set()
    for risk_list in risks_by_supplier.values():
        for r in risk_list:
            risks_with_plan_supplier.add(r.id)
    needs_plan = (
        db.query(Risk)
        .filter(Risk.oemId == oem_id, Risk.status == RiskStatus.DETECTED)
        .all()
    )
    per_risk_plans_created = 0
    for risk in needs_plan:
        if risk.id in risks_with_plan_supplier:
            continue
        plans = (
            db.query(MitigationPlan)
            .filter(MitigationPlan.riskId == risk.id)
            .count()
        )
        if plans > 0:
            continue
        plan_data = await generate_mitigation_plan({
            "title": risk.title,
            "description": risk.description,
            "severity": getattr(risk.severity, "value", risk.severity),
            "affectedRegion": risk.affectedRegion,
            "affectedSupplier": risk.affectedSupplier,
        })
        create_plan_from_dict(
            db,
            plan_data,
            risk_id=risk.id,
            opportunity_id=None,
        )
        per_risk_plans_created += 1
    logger.info(
        "_run_analysis_for_oem: per-risk mitigation plans created=%d "
        "for OEM %s",
        per_risk_plans_created,
        scope["oemName"],
    )

    # 7. Opportunity plans
    opportunities = (
        db.query(Opportunity)
        .filter(
            Opportunity.oemId == oem_id,
            Opportunity.status == OpportunityStatus.IDENTIFIED,
        )
        .all()
    )
    opp_plans_created = 0
    for opp in opportunities:
        if (
            db.query(MitigationPlan)
            .filter(MitigationPlan.opportunityId == opp.id)
            .count()
            > 0
        ):
            continue
        plan_data = await generate_opportunity_plan({
            "title": opp.title,
            "description": opp.description,
            "type": getattr(opp.type, "value", opp.type),
            "potentialBenefit": opp.potentialBenefit,
        })
        create_plan_from_dict(
            db,
            plan_data,
            risk_id=None,
            opportunity_id=opp.id,
        )
        opp_plans_created += 1
    logger.info(
        "_run_analysis_for_oem: opportunity plans created=%d for OEM %s",
        opp_plans_created,
        scope["oemName"],
    )

    # 8. Broadcast per-supplier snapshot so the dashboard can update scores and risks.
    suppliers = get_suppliers(db, oem_id)
    risk_map = get_risks_by_supplier(db)
    swarm_map = get_swarm_summaries_by_supplier(db, oem_id)
    suppliers_payload = [
        {
            "id": str(s.id),
            "oemId": str(s.oemId) if s.oemId else None,
            "name": s.name,
            "location": s.location,
            "city": s.city,
            "country": s.country,
            "region": s.region,
            "commodities": s.commodities,
            "metadata": s.metadata_,
            "createdAt": s.createdAt.isoformat() if s.createdAt else None,
            "updatedAt": s.updatedAt.isoformat() if s.updatedAt else None,
            "riskSummary": risk_map.get(
                s.name,
                {"count": 0, "bySeverity": {}, "latest": None},
            ),
            "swarm": swarm_map.get(s.name),
        }
        for s in suppliers
    ]
    await broadcast_suppliers_snapshot(str(oem_id), suppliers_payload)


def get_status(db: Session) -> AgentStatusEntity | None:
    return db.query(AgentStatusEntity).first()


def get_latest_risk_score(db: Session, oem_id: UUID) -> SupplyChainRiskScore | None:
    return (
        db.query(SupplyChainRiskScore)
        .filter(SupplyChainRiskScore.oemId == oem_id)
        .order_by(SupplyChainRiskScore.createdAt.desc())
        .first()
    )


def trigger_manual_analysis_sync(db: Session, oem_id: UUID | None) -> None:
    global _is_running
    if _is_running:
        logger.warning("Agent is already running")
        return
    _is_running = True
    try:
        if oem_id:
            logger.info(
                "trigger_manual_analysis_sync: starting manual run for OEM %s",
                oem_id,
            )
            scope = get_oem_scope(db, oem_id)
            if not scope:
                logger.warning("OEM %s not found or no scope", oem_id)
                return
            _update_status(db, AgentStatus.MONITORING.value, f"Manual run for OEM: {scope['oemName']}")
            asyncio.run(_run_analysis_for_oem(db, scope))
            ent = _ensure_agent_status(db)
            ent.risksDetected = db.query(Risk).count()
            ent.opportunitiesIdentified = db.query(Opportunity).count()
            ent.plansGenerated = db.query(MitigationPlan).count()
            ent.lastProcessedData = {"timestamp": datetime.utcnow().isoformat(), "oemsProcessed": [scope["oemName"]]}
            db.commit()
            _update_status(db, AgentStatus.IDLE.value, "Manual analysis completed")
        else:
            logger.info("trigger_manual_analysis_sync: starting run for all OEMs")
            oems = get_all_oems(db)
            if not oems:
                _update_status(db, AgentStatus.IDLE.value, "No OEMs to process")
                return
            for oem in oems:
                scope = get_oem_scope(db, oem.id)
                if not scope:
                    continue
                asyncio.run(_run_analysis_for_oem(db, scope))
            ent = _ensure_agent_status(db)
            ent.risksDetected = db.query(Risk).count()
            ent.opportunitiesIdentified = db.query(Opportunity).count()
            ent.plansGenerated = db.query(MitigationPlan).count()
            ent.lastProcessedData = {"timestamp": datetime.utcnow().isoformat(), "oemsProcessed": [o.name for o in oems]}
            db.commit()
            _update_status(db, AgentStatus.IDLE.value, "Monitoring cycle completed")
    except Exception as e:
        logger.exception("Error in analysis: %s", e)
        try:
            db.rollback()
        except Exception:
            pass
        _update_status(db, AgentStatus.ERROR.value, f"Error: {e}")
    finally:
        _is_running = False


def run_scheduled_cycle(db: Session) -> None:
    trigger_manual_analysis_sync(db, None)
