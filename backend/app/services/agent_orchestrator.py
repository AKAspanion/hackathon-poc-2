import json
import logging
import re
from typing import Any

from app.config import settings
from app.models.risk import RiskSeverity
from app.models.opportunity import OpportunityType
from app.services.agent_types import OemScope

logger = logging.getLogger(__name__)

# LLM abstraction: we use Anthropic or Ollama via simple invoke(text) -> str
_invoke_fn: Any = None


def _get_llm_invoke():
    global _invoke_fn
    if _invoke_fn is not None:
        return _invoke_fn
    provider = (settings.llm_provider or "anthropic").lower()
    if provider == "ollama":
        import httpx
        base_url = settings.ollama_base_url or "http://localhost:11434"
        model = settings.ollama_model or "llama3"

        async def _ollama_invoke(prompt: str) -> str:
            async with httpx.AsyncClient() as client:
                r = await client.post(
                    f"{base_url.rstrip('/')}/api/generate",
                    json={"model": model, "prompt": prompt, "stream": False},
                    timeout=120.0,
                )
                if r.status_code != 200:
                    raise RuntimeError(f"Ollama error: {r.text}")
                return (r.json().get("response") or "")

        _invoke_fn = _ollama_invoke
        logger.info("LLM provider initialized: Ollama model=%s baseUrl=%s", model, base_url)
    else:
        if settings.anthropic_api_key:
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=settings.anthropic_api_key)
            model = settings.anthropic_model or "claude-3-5-sonnet-20241022"

            async def _anthropic_invoke(prompt: str) -> str:
                msg = await client.messages.create(
                    model=model,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                return (msg.content[0].text if msg.content else "")

            _invoke_fn = _anthropic_invoke
            logger.info("LLM provider initialized: Anthropic model=%s", model)
        else:
            logger.warning("ANTHROPIC_API_KEY not set. Using mock analysis.")
            _invoke_fn = None
    return _invoke_fn


def _extract_json(text: str) -> dict | None:
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except json.JSONDecodeError:
            pass
    return None


async def analyze_data(
    all_data: dict[str, list[dict]], scope: OemScope | None = None
) -> dict[str, list]:
    risks = []
    opportunities = []
    invoke = _get_llm_invoke()
    for source_type, data_array in all_data.items():
        for i, data_item in enumerate(data_array):
            payload = data_item.get("data") if isinstance(data_item, dict) else data_item
            if not payload:
                payload = data_item
            analysis = await _analyze_data_item(
                source_type, payload, scope, invoke
            )
            if analysis.get("risks"):
                for r in analysis["risks"]:
                    r["sourceType"] = source_type
                    r["sourceData"] = data_item
                    risks.append(r)
            if analysis.get("opportunities"):
                for o in analysis["opportunities"]:
                    o["sourceType"] = source_type
                    o["sourceData"] = data_item
                    opportunities.append(o)
    return {"risks": risks, "opportunities": opportunities}


async def analyze_global_risk(news_data: dict[str, list]) -> dict[str, list]:
    risks = []
    invoke = _get_llm_invoke()
    for source_type, data_array in news_data.items():
        for data_item in data_array:
            payload = data_item.get("data") if isinstance(data_item, dict) else data_item or data_item
            analysis = await _analyze_item_risks_only(
                "global_news", payload, "global_risk", invoke
            )
            for r in analysis.get("risks") or []:
                r["sourceType"] = "global_news"
                r["sourceData"] = data_item
                risks.append(r)
    return {"risks": risks}


async def analyze_shipping_disruptions(route_data: dict[str, list]) -> dict[str, list]:
    risks = []
    invoke = _get_llm_invoke()
    for source_type, data_array in route_data.items():
        for data_item in data_array:
            payload = data_item.get("data") if isinstance(data_item, dict) else data_item or data_item
            analysis = await _analyze_item_risks_only(
                source_type, payload, "shipping_routes", invoke
            )
            for r in analysis.get("risks") or []:
                r["sourceType"] = "shipping"
                r["sourceData"] = data_item
                risks.append(r)
    return {"risks": risks}


async def _analyze_data_item(
    source_type: str, data_item: dict, scope: OemScope | None, invoke
) -> dict:
    if not invoke:
        return _mock_analyze_data_item(source_type, data_item)
    try:
        prompt = _build_analysis_prompt(source_type, data_item, scope)
        content = await invoke(prompt)
        parsed = _extract_json(content)
        if parsed and isinstance(parsed.get("risks"), list) and isinstance(parsed.get("opportunities"), list):
            return parsed
    except Exception as e:
        logger.exception("analyzeDataItem error: %s", e)
    return _mock_analyze_data_item(source_type, data_item)


def _build_analysis_prompt(source_type: str, data_item: dict, scope: OemScope | None) -> str:
    scope_ctx = ""
    if scope:
        scope_ctx = f"""
You are analyzing data for OEM: "{scope['oemName']}".
Relevant suppliers: {', '.join(scope.get('supplierNames') or ['None'])}.
Relevant locations: {', '.join((scope.get('cities') or []) + (scope.get('regions') or []) + (scope.get('countries') or [])) or 'None'}.
Relevant commodities: {', '.join(scope.get('commodities') or ['None'])}.
Only report risks and opportunities relevant to this OEM's supply chain.
"""
    return f"""You are a supply chain risk intelligence agent. Analyze the following {source_type} data and identify:
1. Potential risks (severity: low, medium, high, critical)
2. Potential opportunities for optimization or cost savings
{scope_ctx}

Data:
{json.dumps(data_item, indent=2)}

Return ONLY a valid JSON object:
{{
  "risks": [
    {{ "title": "...", "description": "...", "severity": "low|medium|high|critical", "affectedRegion": "...", "affectedSupplier": "...", "estimatedImpact": "...", "estimatedCost": 0 }}
  ],
  "opportunities": [
    {{ "title": "...", "description": "...", "type": "cost_saving|time_saving|quality_improvement|market_expansion|supplier_diversification", "affectedRegion": "...", "potentialBenefit": "...", "estimatedValue": 0 }}
  ]
}}
If none found, return empty arrays. Be specific and actionable."""


def _mock_analyze_data_item(source_type: str, data_item: dict) -> dict:
    risks = []
    opportunities = []
    if source_type == "weather":
        cond = data_item.get("condition") or ""
        if cond in ("Storm", "Rain"):
            city = data_item.get("city", "Unknown")
            country = data_item.get("country", "")
            risks.append({
                "title": f"Weather Alert: {cond} in {city}",
                "description": f"Severe weather in {city}, {country}. May impact shipping and logistics.",
                "severity": "high",
                "affectedRegion": f"{city}, {country}",
                "estimatedImpact": "Potential delays in shipping",
                "estimatedCost": 50000,
            })
    if source_type == "news":
        title = (data_item.get("title") or "").lower()
        if "disruption" in title or "closure" in title or "delay" in title:
            risks.append({
                "title": f"News Alert: {data_item.get('title', '')}",
                "description": data_item.get("description") or "Supply chain disruption detected",
                "severity": "medium",
                "estimatedImpact": "Potential supply chain impact",
                "estimatedCost": 30000,
            })
    if source_type == "traffic":
        delay = data_item.get("estimatedDelay", 0) or 0
        cong = data_item.get("congestionLevel", "")
        if delay > 60 or cong == "severe":
            risks.append({
                "title": f"Traffic Delay: {data_item.get('origin')} to {data_item.get('destination')}",
                "description": f"Severe congestion. Estimated delay: {delay} minutes.",
                "severity": "medium",
                "affectedRegion": f"{data_item.get('origin')} - {data_item.get('destination')}",
                "estimatedImpact": f"Transportation delay of {delay} minutes",
                "estimatedCost": 10000,
            })
    if source_type == "market":
        pct = data_item.get("priceChangePercent", 0) or 0
        if pct < -5:
            opportunities.append({
                "title": f"Price Drop Opportunity: {data_item.get('commodity', '')}",
                "description": f"Significant price drop for {data_item.get('commodity')}. Consider strategic purchasing.",
                "type": "cost_saving",
                "potentialBenefit": f"Potential cost savings on {data_item.get('commodity')} procurement",
                "estimatedValue": abs(data_item.get("priceChange", 0) or 0) * 1000,
            })
    return {"risks": risks, "opportunities": opportunities}


async def _analyze_item_risks_only(
    source_type: str, data_item: dict, context: str, invoke
) -> dict:
    if not invoke:
        return _mock_analyze_item_risks_only(source_type, data_item, context)
    try:
        if context == "global_risk":
            prompt = _build_global_risk_prompt(data_item)
        else:
            prompt = _build_shipping_disruption_prompt(data_item)
        content = await invoke(prompt)
        parsed = _extract_json(content)
        if parsed and isinstance(parsed.get("risks"), list):
            return {"risks": parsed["risks"]}
    except Exception as e:
        logger.exception("analyzeItemRisksOnly error: %s", e)
    return _mock_analyze_item_risks_only(source_type, data_item, context)


def _build_global_risk_prompt(data_item: dict) -> str:
    return f"""You are a global supply chain risk analyst. Assess the following for GLOBAL supply chain risk (geopolitical, trade, raw materials, pandemics, climate, logistics).

Data:
{json.dumps(data_item, indent=2)}

Return ONLY a valid JSON object:
{{ "risks": [ {{ "title": "...", "description": "...", "severity": "low|medium|high|critical", "affectedRegion": "...", "affectedSupplier": null, "estimatedImpact": "...", "estimatedCost": 0 }} ] }}
If no material risks, return {{ "risks": [] }}. Be concise."""


def _build_shipping_disruption_prompt(data_item: dict) -> str:
    return f"""You are a shipping and logistics risk analyst. Analyze the following route/transport data for supply chain disruption risks.

Data:
{json.dumps(data_item, indent=2)}

Return ONLY a valid JSON object:
{{ "risks": [ {{ "title": "...", "description": "...", "severity": "low|medium|high|critical", "affectedRegion": "...", "affectedSupplier": null, "estimatedImpact": "...", "estimatedCost": 0 }} ] }}
If no risks, return {{ "risks": [] }}. Be specific to shipping and logistics."""


def _mock_analyze_item_risks_only(
    source_type: str, data_item: dict, context: str
) -> dict:
    risks = []
    if context == "global_risk":
        title = (data_item.get("title") or data_item.get("description") or "").lower()
        if title and ("disruption" in title or "crisis" in title or "shortage" in title):
            risks.append({
                "title": f"Global risk: {(data_item.get('title') or title)[:60]}",
                "description": data_item.get("description") or title,
                "severity": "medium",
                "affectedRegion": "Global",
                "affectedSupplier": None,
                "estimatedImpact": "Potential global supply chain impact",
                "estimatedCost": 50000,
            })
    if context == "shipping_routes":
        status = data_item.get("status") or data_item.get("routeStatus")
        disrupted = status == "disrupted" or status == "delayed" or (data_item.get("delayDays") or 0) > 0
        if disrupted:
            origin = data_item.get("origin", "")
            dest = data_item.get("destination", "")
            delay_days = data_item.get("delayDays") or "?"
            risks.append({
                "title": f"Shipping disruption: {origin} → {dest}",
                "description": f"Route disruption ({status}). {data_item.get('disruptionReason', 'Unknown')}. Delay: {delay_days} days.",
                "severity": "high" if (data_item.get("delayDays") or 0) > 7 else "medium",
                "affectedRegion": f"{origin} - {dest}",
                "affectedSupplier": None,
                "estimatedImpact": "Delivery delays and inventory risk",
                "estimatedCost": 25000,
            })
    return {"risks": risks}


async def generate_mitigation_plan(risk: dict) -> dict:
    invoke = _get_llm_invoke()
    if not invoke:
        return _mock_mitigation_plan(risk)
    try:
        prompt = f"""Generate a detailed mitigation plan for this supply chain risk:
Title: {risk.get('title')}
Description: {risk.get('description')}
Severity: {risk.get('severity')}
Affected Region: {risk.get('affectedRegion') or 'N/A'}
Affected Supplier: {risk.get('affectedSupplier') or 'N/A'}

Return ONLY a valid JSON object:
{{ "title": "...", "description": "...", "actions": ["Action 1", "Action 2"], "metadata": {{}}, "assignedTo": "...", "dueDate": "YYYY-MM-DD" }}"""
        content = await invoke(prompt)
        parsed = _extract_json(content)
        if parsed:
            return parsed
    except Exception as e:
        logger.exception("generateMitigationPlan error: %s", e)
    return _mock_mitigation_plan(risk)


def _mock_mitigation_plan(risk: dict) -> dict:
    from datetime import datetime, timedelta
    return {
        "title": f"Mitigation Plan: {risk.get('title', '')}",
        "description": f"Comprehensive mitigation strategy for {risk.get('severity', '')} severity risk",
        "actions": [
            "Assess immediate impact on operations",
            "Contact affected suppliers for status update",
            "Identify alternative suppliers or routes",
            "Implement contingency logistics plan",
            "Monitor situation and update stakeholders",
        ],
        "metadata": {"riskSeverity": risk.get("severity"), "autoGenerated": True},
        "assignedTo": "Supply Chain Team",
        "dueDate": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
    }


async def generate_combined_mitigation_plan(supplier_name: str, risks: list[dict]) -> dict:
    invoke = _get_llm_invoke()
    if not invoke:
        return _mock_combined_plan(supplier_name, risks)
    try:
        risk_summaries = "\n".join(
            f"- {r.get('title')} ({r.get('severity')}): {r.get('description', '')} Region: {r.get('affectedRegion', 'N/A')}"
            for r in risks
        )
        prompt = f"""You are a supply chain risk manager. Create ONE combined mitigation plan for SUPPLIER addressing ALL listed risks.

Supplier: {supplier_name}

Risks affecting this supplier:
{risk_summaries}

Return ONLY a valid JSON object:
{{ "title": "Combined Mitigation Plan: [Supplier Name]", "description": "...", "actions": ["Action 1", "Action 2"], "metadata": {{ "supplierName": "{supplier_name}", "riskCount": {len(risks)} }}, "assignedTo": "Supply Chain / Procurement Team", "dueDate": "YYYY-MM-DD" }}
Prioritize highest-severity risks first. Be specific and actionable."""
        content = await invoke(prompt)
        parsed = _extract_json(content)
        if parsed:
            parsed.setdefault("metadata", {})
            parsed["metadata"]["combinedForSupplier"] = supplier_name
            parsed["metadata"]["riskIds"] = [str(r.get("id")) for r in risks if r.get("id")]
            return parsed
    except Exception as e:
        logger.exception("generateCombinedMitigationPlan error: %s", e)
    return _mock_combined_plan(supplier_name, risks)


def _mock_combined_plan(supplier_name: str, risks: list[dict]) -> dict:
    from datetime import datetime, timedelta
    return {
        "title": f"Combined Mitigation Plan: {supplier_name}",
        "description": f"Unified contingency plan for {supplier_name} addressing {len(risks)} risk(s).",
        "actions": [
            "Contact supplier for status and expected recovery",
            "Assess impact on production schedule and customer orders",
            "Identify and qualify backup suppliers or routes",
            "Update inventory and safety stock targets",
            "Document and communicate plan to stakeholders",
        ],
        "metadata": {
            "combinedForSupplier": supplier_name,
            "riskIds": [str(r.get("id")) for r in risks if r.get("id")],
            "riskCount": len(risks),
        },
        "assignedTo": "Supply Chain Team",
        "dueDate": (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d"),
    }


async def generate_opportunity_plan(opportunity: dict) -> dict:
    invoke = _get_llm_invoke()
    if not invoke:
        return _mock_opportunity_plan(opportunity)
    try:
        prompt = f"""Generate an action plan to capitalize on this supply chain opportunity:
Title: {opportunity.get('title')}
Description: {opportunity.get('description')}
Type: {opportunity.get('type')}
Potential Benefit: {opportunity.get('potentialBenefit') or 'N/A'}

Return ONLY a valid JSON object:
{{ "title": "...", "description": "...", "actions": ["Action 1", "Action 2"], "metadata": {{}}, "assignedTo": "...", "dueDate": "YYYY-MM-DD" }}"""
        content = await invoke(prompt)
        parsed = _extract_json(content)
        if parsed:
            return parsed
    except Exception as e:
        logger.exception("generateOpportunityPlan error: %s", e)
    return _mock_opportunity_plan(opportunity)


def _mock_opportunity_plan(opportunity: dict) -> dict:
    from datetime import datetime, timedelta
    return {
        "title": f"Action Plan: {opportunity.get('title', '')}",
        "description": "Strategic plan to capitalize on identified opportunity",
        "actions": [
            "Evaluate opportunity feasibility",
            "Calculate potential ROI",
            "Develop implementation timeline",
            "Secure necessary approvals",
            "Execute opportunity capture plan",
        ],
        "metadata": {"opportunityType": opportunity.get("type"), "autoGenerated": True},
        "assignedTo": "Strategic Planning Team",
        "dueDate": (datetime.utcnow() + timedelta(days=14)).strftime("%Y-%m-%d"),
    }
