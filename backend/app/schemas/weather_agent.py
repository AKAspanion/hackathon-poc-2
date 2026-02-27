from __future__ import annotations
from enum import Enum
from typing import Any
from pydantic import BaseModel


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class RiskFactor(BaseModel):
    factor: str
    level: RiskLevel
    score: float
    summary: str
    details: str | None = None
    mitigation: str | None = None


class RiskSummary(BaseModel):
    overall_level: RiskLevel
    overall_score: float
    factors: list[RiskFactor] = []
    primary_concerns: list[str] = []
    suggested_actions: list[str] = []


class DayWeatherSnapshot(BaseModel):
    date: str
    day_number: int
    location_name: str
    estimated_location: str
    condition: str
    temp_c: float
    min_temp_c: float | None = None
    max_temp_c: float | None = None
    wind_kph: float
    precip_mm: float
    vis_km: float
    humidity: int
    is_historical: bool = False


class DayRiskSnapshot(BaseModel):
    date: str
    day_number: int
    location_name: str
    weather: DayWeatherSnapshot
    risk: RiskSummary
    risk_summary_text: str


class ShipmentInput(BaseModel):
    supplier_city: str
    oem_city: str
    shipment_start_date: str
    transit_days: int


class ShipmentWeatherExposureResponse(BaseModel):
    supplier_city: str
    oem_city: str
    shipment_start_date: str
    transit_days: int
    days: list[DayRiskSnapshot]
    overall_exposure_level: RiskLevel
    overall_exposure_score: float
    risk_analysis_payload: dict[str, Any]
    agent_summary: str | None = None


class LocationInfo(BaseModel):
    name: str
    region: str | None = None
    country: str
    lat: float
    lon: float
    tz_id: str | None = None
    localtime: str | None = None


class WeatherCondition(BaseModel):
    text: str
    temp_c: float
    feelslike_c: float
    wind_kph: float
    wind_degree: int | None = None
    pressure_mb: float
    precip_mm: float
    humidity: int
    cloud: int
    vis_km: float
    uv: float | None = None
    gust_kph: float | None = None
    condition_code: int | None = None


class WeatherRiskResponse(BaseModel):
    location: LocationInfo
    weather: WeatherCondition
    risk: RiskSummary
    agent_summary: str | None = None
    raw_weather: dict[str, Any] | None = None


class HealthResponse(BaseModel):
    status: str
    service: str
    weather_api_configured: bool