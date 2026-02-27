"""
weather.py

Single LangGraph: run_weather_agent_graph(weather_data, scope)
Returns the same risk_analysis_payload format as _build_risk_analysis_payload in shipment_weather.py

Mock data by default. Set USE_LIVE_DATA=true in .env for real API calls.
"""

from __future__ import annotations

import logging
import random
from datetime import date, datetime, timedelta
from typing import Any, TypedDict

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


def _use_live_data() -> bool:
    return getattr(settings, "use_live_data", False)


_SCENARIOS = [
    {"condition": "Sunny",         "temp_c": 28.0, "wind_kph": 12.0, "precip_mm": 0.0,  "vis_km": 10.0, "humidity": 45, "code": 1000},
    {"condition": "Partly Cloudy", "temp_c": 24.0, "wind_kph": 18.0, "precip_mm": 0.5,  "vis_km": 9.0,  "humidity": 60, "code": 1003},
    {"condition": "Overcast",      "temp_c": 20.0, "wind_kph": 25.0, "precip_mm": 2.0,  "vis_km": 7.0,  "humidity": 72, "code": 1009},
    {"condition": "Moderate Rain", "temp_c": 18.0, "wind_kph": 35.0, "precip_mm": 12.0, "vis_km": 4.0,  "humidity": 88, "code": 1189},
    {"condition": "Heavy Rain",    "temp_c": 17.0, "wind_kph": 55.0, "precip_mm": 28.0, "vis_km": 2.0,  "humidity": 95, "code": 1195},
    {"condition": "Thunderstorm",  "temp_c": 22.0, "wind_kph": 72.0, "precip_mm": 40.0, "vis_km": 1.5,  "humidity": 97, "code": 1276},
    {"condition": "Fog",           "temp_c": 15.0, "wind_kph": 8.0,  "precip_mm": 0.2,  "vis_km": 0.8,  "humidity": 92, "code": 1135},
    {"condition": "Light Snow",    "temp_c": -2.0, "wind_kph": 22.0, "precip_mm": 3.0,  "vis_km": 3.0,  "humidity": 80, "code": 1213},
]


def _mock_weather(city: str, day_index: int) -> dict[str, Any]:
    rng = random.Random(hash(city.lower()) + day_index)
    s = rng.choices(_SCENARIOS, weights=[30, 20, 15, 15, 8, 5, 4, 3], k=1)[0].copy()
    return {
        "temp_c":    round(s["temp_c"]    + rng.uniform(-2, 2),   1),
        "wind_kph":  round(max(0, s["wind_kph"]  + rng.uniform(-5, 5)),   1),
        "precip_mm": round(max(0, s["precip_mm"] + rng.uniform(-1, 2)),   1),
        "vis_km":    round(max(0.5, s["vis_km"]  + rng.uniform(-0.5, 0.5)), 1),
        "humidity":  min(100, max(20, s["humidity"] + rng.randint(-5, 5))),
        "condition": s["condition"],
        "code":      s["code"],
    }


class WeatherGraphState(TypedDict, total=False):
    weather_data: dict[str, Any]
    scope: OemScope
    supplier_city: str
    oem_city: str
    shipment_start_date: str
    transit_days: int
    day_snapshots: list[DayWeatherSnapshot]
    day_risks: list[DayRiskSnapshot]
    result: dict[str, Any]


def _extract_params_node(state: WeatherGraphState) -> WeatherGraphState:
    """
    Extract supplier_city, oem_city, start_date, transit_days.
    Reads from weather_data first, falls back to scope.
    scope["cities"][0] = OEM city, scope["cities"][1] = first supplier city.
    """
    weather_data = state.get("weather_data") or {}
    scope = state.get("scope") or {}

    cities = scope.get("cities") or []
    oem_city_from_scope      = cities[0] if len(cities) > 0 else "Unknown"
    supplier_city_from_scope = cities[1] if len(cities) > 1 else oem_city_from_scope

    supplier_city       = weather_data.get("supplier_city")       or supplier_city_from_scope
    oem_city            = weather_data.get("oem_city")            or oem_city_from_scope
    shipment_start_date = weather_data.get("shipment_start_date") or date.today().strftime("%Y-%m-%d")
    transit_days        = int(weather_data.get("transit_days")    or 5)

    return {
        "supplier_city":       supplier_city,
        "oem_city":            oem_city,
        "shipment_start_date": shipment_start_date,
        "transit_days":        transit_days,
    }


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

        if _use_live_data():
            try:
                from app.services.weather_service import (
                    get_current_weather,
                    get_forecast,
                    get_historical_weather,
                )
                if target_date == today:
                    raw = await get_current_weather(city) or {}
                    cur = raw.get("current") or {}
                    w = {
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
                    w = {
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
                    w = {
                        "temp_c":    float(fd.get("avgtemp_c", 25)),
                        "wind_kph":  float(fd.get("maxwind_kph", 10)),
                        "precip_mm": float(fd.get("totalprecip_mm", 0)),
                        "vis_km":    float(fd.get("avgvis_km", 10)),
                        "humidity":  int(fd.get("avghumidity", 50)),
                        "condition": (fd.get("condition") or {}).get("text", "Unknown"),
                    }
            except Exception as e:
                logger.warning("Live fetch failed for %s day %d, using mock: %s", city, i, e)
                m = _mock_weather(city, i)
                w = {k: m[k] for k in ("temp_c", "wind_kph", "precip_mm", "vis_km", "humidity", "condition")}
        else:
            m = _mock_weather(city, i)
            w = {k: m[k] for k in ("temp_c", "wind_kph", "precip_mm", "vis_km", "humidity", "condition")}

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


async def run_weather_agent_graph(
    weather_data: dict[str, Any],
    scope: OemScope,
) -> dict[str, Any]:
    final = await WEATHER_GRAPH.ainvoke({
        "weather_data": weather_data,
        "scope": scope,
    })
    return final["result"]