"""
weather.py

Single LangGraph: run_weather_agent_graph(scope)
- Fetches OEM + Supplier city from supply_chain DB (localhost:8000)
- Fetches weather data from mock DB (localhost:4000/collections/weather)
- If weather not found in mock DB:
    - USE_LIVE_DATA=true  → real weather API
    - USE_LIVE_DATA=false → static mock scenarios
"""

from __future__ import annotations

import logging
import random
from datetime import date, datetime, timedelta
from typing import Any, TypedDict

import httpx
from langgraph.graph import END, StateGraph

from app.config import settings
from app.core.risk_engine import compute_risk
from app.schemas.weather_agent import (
    DayRiskSnapshot,
    DayWeatherSnapshot,
    RiskLevel,
    RiskSummary,
)
from app.services.agent_types import OemScope

logger = logging.getLogger(__name__)

SUPPLY_CHAIN_BASE = "http://localhost:8000"
MOCK_DB_BASE      = "http://localhost:4000"


def _use_live_data() -> bool:
    return getattr(settings, "use_live_data", False)


# ---------------------------------------------------------------------------
# Static fallback scenarios (used only if mock DB miss + USE_LIVE_DATA=false)
# ---------------------------------------------------------------------------

_SCENARIOS = [
    {"condition": "Sunny",         "temp_c": 28.0, "wind_kph": 12.0, "precip_mm": 0.0,  "vis_km": 10.0, "humidity": 45},
    {"condition": "Partly Cloudy", "temp_c": 24.0, "wind_kph": 18.0, "precip_mm": 0.5,  "vis_km": 9.0,  "humidity": 60},
    {"condition": "Overcast",      "temp_c": 20.0, "wind_kph": 25.0, "precip_mm": 2.0,  "vis_km": 7.0,  "humidity": 72},
    {"condition": "Moderate Rain", "temp_c": 18.0, "wind_kph": 35.0, "precip_mm": 12.0, "vis_km": 4.0,  "humidity": 88},
    {"condition": "Heavy Rain",    "temp_c": 17.0, "wind_kph": 55.0, "precip_mm": 28.0, "vis_km": 2.0,  "humidity": 95},
    {"condition": "Thunderstorm",  "temp_c": 22.0, "wind_kph": 72.0, "precip_mm": 40.0, "vis_km": 1.5,  "humidity": 97},
    {"condition": "Fog",           "temp_c": 15.0, "wind_kph": 8.0,  "precip_mm": 0.2,  "vis_km": 0.8,  "humidity": 92},
    {"condition": "Light Snow",    "temp_c": -2.0, "wind_kph": 22.0, "precip_mm": 3.0,  "vis_km": 3.0,  "humidity": 80},
]


def _static_mock(city: str, day_index: int) -> dict[str, Any]:
    rng = random.Random(hash(city.lower()) + day_index)
    s = rng.choices(_SCENARIOS, weights=[30, 20, 15, 15, 8, 5, 4, 3], k=1)[0].copy()
    return {
        "temp_c":    round(s["temp_c"]    + rng.uniform(-2, 2),   1),
        "wind_kph":  round(max(0, s["wind_kph"]  + rng.uniform(-5, 5)),   1),
        "precip_mm": round(max(0, s["precip_mm"] + rng.uniform(-1, 2)),   1),
        "vis_km":    round(max(0.5, s["vis_km"]  + rng.uniform(-0.5, 0.5)), 1),
        "humidity":  min(100, max(20, s["humidity"] + rng.randint(-5, 5))),
        "condition": s["condition"],
    }


# ---------------------------------------------------------------------------
# HTTP helpers
# ---------------------------------------------------------------------------

async def _get_city_for_oem(oem_id: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{SUPPLY_CHAIN_BASE}/oems/{oem_id}")
            r.raise_for_status()
            return r.json().get("city") or "Unknown"
    except Exception as e:
        logger.warning("Could not fetch OEM city for %s: %s", oem_id, e)
        return "Unknown"


async def _get_city_for_supplier(supplier_id: str) -> str:
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{SUPPLY_CHAIN_BASE}/suppliers/{supplier_id}")
            r.raise_for_status()
            return r.json().get("city") or "Unknown"
    except Exception as e:
        logger.warning("Could not fetch supplier city for %s: %s", supplier_id, e)
        return "Unknown"


async def _fetch_weather_from_mock_db(city: str) -> dict[str, Any] | None:
    """
    Hit mock DB: GET /collections/weather?q=city:<city>
    Returns weather dict if found, None if not found.
    """
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(
                f"{MOCK_DB_BASE}/collections/weather",
                params={"q": f"city:{city}"},
            )
            r.raise_for_status()
            data = r.json()
            # mock server returns list or single object
            if isinstance(data, list):
                entry = data[0] if data else None
            else:
                entry = data or None

            if not entry:
                return None

            return {
                "temp_c":    float(entry.get("temp_c", 25)),
                "wind_kph":  float(entry.get("wind_kph", 10)),
                "precip_mm": float(entry.get("precip_mm", 0)),
                "vis_km":    float(entry.get("vis_km", 10)),
                "humidity":  int(entry.get("humidity", 50)),
                "condition": entry.get("condition", "Unknown"),
            }
    except Exception as e:
        logger.warning("Mock DB weather fetch failed for %s: %s", city, e)
        return None


async def _fetch_weather_from_live_api(city: str, target_str: str, is_past: bool) -> dict[str, Any]:
    try:
        from app.services.weather_service import (
            get_current_weather,
            get_forecast,
            get_historical_weather,
        )
        today = date.today()
        target_date = datetime.strptime(target_str, "%Y-%m-%d").date()

        if target_date == today:
            raw = await get_current_weather(city) or {}
            cur = raw.get("current") or {}
            return {
                "temp_c":    float(cur.get("temp_c", 25)),
                "wind_kph":  float(cur.get("wind_kph", 10)),
                "precip_mm": float(cur.get("precip_mm", 0)),
                "vis_km":    float(cur.get("vis_km", 10)),
                "humidity":  int(cur.get("humidity", 50)),
                "condition": (cur.get("condition") or {}).get("text", "Unknown"),
            }
        elif is_past:
            raw = await get_historical_weather(city, target_str) or {}
            fd  = (((raw.get("forecast") or {}).get("forecastday") or [{}])[0].get("day") or {})
            return {
                "temp_c":    float(fd.get("avgtemp_c", 25)),
                "wind_kph":  float(fd.get("maxwind_kph", 10)),
                "precip_mm": float(fd.get("totalprecip_mm", 0)),
                "vis_km":    float(fd.get("avgvis_km", 10)),
                "humidity":  int(fd.get("avghumidity", 50)),
                "condition": (fd.get("condition") or {}).get("text", "Unknown"),
            }
        else:
            raw = await get_forecast(city, days=14) or {}
            fd  = next(
                (d["day"] for d in (raw.get("forecast") or {}).get("forecastday") or [] if d.get("date") == target_str),
                {},
            )
            return {
                "temp_c":    float(fd.get("avgtemp_c", 25)),
                "wind_kph":  float(fd.get("maxwind_kph", 10)),
                "precip_mm": float(fd.get("totalprecip_mm", 0)),
                "vis_km":    float(fd.get("avgvis_km", 10)),
                "humidity":  int(fd.get("avghumidity", 50)),
                "condition": (fd.get("condition") or {}).get("text", "Unknown"),
            }
    except Exception as e:
        logger.warning("Live weather API failed for %s: %s", city, e)
        return _static_mock(city, 0)


async def _get_weather_for_city(city: str, target_str: str, is_past: bool, day_index: int) -> dict[str, Any]:
    """
    Priority:
    1. Mock DB (localhost:4000)
    2. Live API (if USE_LIVE_DATA=true)
    3. Static mock fallback
    """
    # 1. Try mock DB first
    w = await _fetch_weather_from_mock_db(city)
    if w:
        logger.info("Weather for %s fetched from mock DB", city)
        return w

    # 2. Mock DB miss — check USE_LIVE_DATA
    if _use_live_data():
        logger.info("Weather for %s not in mock DB, hitting live API", city)
        return await _fetch_weather_from_live_api(city, target_str, is_past)

    # 3. Static mock fallback
    logger.info("Weather for %s not in mock DB, using static mock", city)
    return _static_mock(city, day_index)


# ---------------------------------------------------------------------------
# LangGraph state
# ---------------------------------------------------------------------------

class WeatherGraphState(TypedDict, total=False):
    scope: OemScope
    supplier_city: str
    oem_city: str
    shipment_start_date: str
    transit_days: int
    day_snapshots: list[DayWeatherSnapshot]
    day_risks: list[DayRiskSnapshot]
    result: dict[str, Any]


# ---------------------------------------------------------------------------
# Node 1 — extract cities from supply_chain DB via scope ids
# ---------------------------------------------------------------------------

async def _extract_params_node(state: WeatherGraphState) -> WeatherGraphState:
    scope = state.get("scope") or {}

    oem_id      = scope.get("oemId")
    supplier_id = scope.get("supplierId")

    # Fetch cities from supply_chain DB
    oem_city      = await _get_city_for_oem(oem_id)      if oem_id      else "Unknown"
    supplier_city = await _get_city_for_supplier(supplier_id) if supplier_id else oem_city

    logger.info("Cities resolved — OEM: %s, Supplier: %s", oem_city, supplier_city)

    return {
        "supplier_city":       supplier_city,
        "oem_city":            oem_city,
        "shipment_start_date": date.today().strftime("%Y-%m-%d"),
        "transit_days":        5,
    }


# ---------------------------------------------------------------------------
# Node 2 — build day snapshots
# ---------------------------------------------------------------------------

async def _build_snapshots_node(state: WeatherGraphState) -> WeatherGraphState:
    supplier_city = state["supplier_city"]
    oem_city      = state["oem_city"]
    transit_days  = state["transit_days"]
    start_date    = datetime.strptime(state["shipment_start_date"], "%Y-%m-%d").date()
    today         = date.today()

    waypoints = []
    for i in range(transit_days):
        if i == 0:
            waypoints.append(supplier_city)
        elif i == transit_days - 1:
            waypoints.append(oem_city)
        else:
            waypoints.append(supplier_city if i < transit_days // 2 else oem_city)

    snapshots: list[DayWeatherSnapshot] = []

    for i, city in enumerate(waypoints):
        target_date = start_date + timedelta(days=i)
        target_str  = target_date.strftime("%Y-%m-%d")
        is_past     = target_date < today

        location_label = (
            f"{supplier_city} (Origin)"   if i == 0                else
            f"{oem_city} (Destination)"   if i == transit_days - 1 else
            f"In Transit - Day {i + 1}"
        )

        w = await _get_weather_for_city(city, target_str, is_past, i)

        snapshots.append(DayWeatherSnapshot(
            date=target_str,
            day_number=i + 1,
            location_name=location_label,
            estimated_location=city,
            condition=w["condition"],
            temp_c=w["temp_c"],
            wind_kph=w["wind_kph"],
            precip_mm=w["precip_mm"],
            vis_km=w["vis_km"],
            humidity=w["humidity"],
            is_historical=is_past,
        ))

    return {"day_snapshots": snapshots}


# ---------------------------------------------------------------------------
# Node 3 — compute risk per day
# ---------------------------------------------------------------------------

def _compute_risks_node(state: WeatherGraphState) -> WeatherGraphState:
    day_risks: list[DayRiskSnapshot] = []

    for snap in (state.get("day_snapshots") or []):
        risk_raw = compute_risk({"current": {
            "temp_c":      snap.temp_c,
            "feelslike_c": snap.temp_c,
            "wind_kph":    snap.wind_kph,
            "gust_kph":    snap.wind_kph * 1.3,
            "precip_mm":   snap.precip_mm,
            "vis_km":      snap.vis_km,
            "humidity":    snap.humidity,
            "cloud": 50, "pressure_mb": 1013, "uv": 5,
            "condition": {"code": 1000, "text": snap.condition},
        }})

        factors = [
            f.model_dump() if hasattr(f, "model_dump") else f
            for f in risk_raw.get("factors", [])
        ]
        risk_dict = {**risk_raw, "factors": factors}
        if hasattr(risk_dict.get("overall_level"), "value"):
            risk_dict["overall_level"] = risk_dict["overall_level"].value
        for f in risk_dict["factors"]:
            if hasattr(f.get("level"), "value"):
                f["level"] = f["level"].value

        risk_summary = RiskSummary(**risk_dict)
        concern = risk_summary.primary_concerns[0] if risk_summary.primary_concerns else "No significant risk"

        day_risks.append(DayRiskSnapshot(
            date=snap.date,
            day_number=snap.day_number,
            location_name=snap.location_name,
            weather=snap,
            risk=risk_summary,
            risk_summary_text=(
                f"Day {snap.day_number} ({snap.date}): {snap.location_name} — "
                f"{snap.condition}, {snap.temp_c:.1f}C, wind {snap.wind_kph:.0f} km/h. "
                f"Risk: {risk_summary.overall_level} ({risk_summary.overall_score:.0f}/100). {concern}"
            ),
        ))

    return {"day_risks": day_risks}


# ---------------------------------------------------------------------------
# Node 4 — build final payload
# ---------------------------------------------------------------------------

def _build_payload_node(state: WeatherGraphState) -> WeatherGraphState:
    supplier_city       = state["supplier_city"]
    oem_city            = state["oem_city"]
    shipment_start_date = state["shipment_start_date"]
    transit_days        = state["transit_days"]
    days                = state.get("day_risks") or []

    peak      = max(days, key=lambda d: d.risk.overall_score) if days else None
    avg_score = sum(d.risk.overall_score for d in days) / len(days) if days else 0
    high_days = [d for d in days if d.risk.overall_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)]

    all_concerns: list[str] = []
    all_actions:  list[str] = []
    factor_max = {f: 0.0 for f in ["transportation", "power_outage", "production", "port_and_route", "raw_material_delay"]}

    for d in days:
        all_concerns.extend(d.risk.primary_concerns)
        all_actions.extend(d.risk.suggested_actions)
        for factor in d.risk.factors:
            if factor.factor in factor_max:
                factor_max[factor.factor] = max(factor_max[factor.factor], factor.score)

    return {
        "result": {
            "shipment_metadata": {
                "supplier_city": supplier_city,
                "oem_city":      oem_city,
                "start_date":    shipment_start_date,
                "transit_days":  transit_days,
            },
            "exposure_summary": {
                "average_risk_score":  round(avg_score, 1),
                "peak_risk_score":     round(peak.risk.overall_score, 1) if peak else 0,
                "peak_risk_day":       peak.day_number if peak else None,
                "peak_risk_date":      peak.date       if peak else None,
                "high_risk_day_count": len(high_days),
                "high_risk_dates":     [d.date for d in high_days],
            },
            "risk_factors_max":    factor_max,
            "primary_concerns":    list(dict.fromkeys(all_concerns))[:6],
            "recommended_actions": list(dict.fromkeys(all_actions))[:6],
            "daily_timeline": [
                {
                    "day":           d.day_number,
                    "date":          d.date,
                    "location":      d.location_name,
                    "is_historical": d.weather.is_historical,
                    "weather": {
                        "condition": d.weather.condition,
                        "temp_c":    d.weather.temp_c,
                        "wind_kph":  d.weather.wind_kph,
                        "precip_mm": d.weather.precip_mm,
                        "vis_km":    d.weather.vis_km,
                        "humidity":  d.weather.humidity,
                    },
                    "risk_score":  d.risk.overall_score,
                    "risk_level":  d.risk.overall_level,
                    "key_concern": d.risk.primary_concerns[0] if d.risk.primary_concerns else "No significant risk",
                }
                for d in days
            ],
        }
    }


# ---------------------------------------------------------------------------
# Compile graph
# ---------------------------------------------------------------------------

_builder = StateGraph(WeatherGraphState)
_builder.add_node("extract_params",  _extract_params_node)
_builder.add_node("build_snapshots", _build_snapshots_node)
_builder.add_node("compute_risks",   _compute_risks_node)
_builder.add_node("build_payload",   _build_payload_node)
_builder.set_entry_point("extract_params")
_builder.add_edge("extract_params",  "build_snapshots")
_builder.add_edge("build_snapshots", "compute_risks")
_builder.add_edge("compute_risks",   "build_payload")
_builder.add_edge("build_payload",   END)

WEATHER_GRAPH = _builder.compile()


# ---------------------------------------------------------------------------
# Public entry point  — signature changed, no more weather_data param
# ---------------------------------------------------------------------------

async def run_weather_agent_graph(
    scope: OemScope,
) -> dict[str, Any]:
    final = await WEATHER_GRAPH.ainvoke({"scope": scope})
    return final["result"]