export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface RiskFactor {
  factor: string;
  level: RiskLevel;
  score: number;
  summary: string;
  details?: string | null;
  mitigation?: string | null;
}

export interface RiskSummary {
  overall_level: RiskLevel;
  overall_score: number;
  factors: RiskFactor[];
  primary_concerns: string[];
  suggested_actions: string[];
}

export interface LocationInfo {
  name: string;
  region?: string | null;
  country: string;
  lat: number;
  lon: number;
  tz_id?: string | null;
  localtime?: string | null;
}

export interface WeatherCondition {
  text: string;
  temp_c: number;
  feelslike_c: number;
  wind_kph: number;
  wind_degree?: number | null;
  pressure_mb: number;
  precip_mm: number;
  humidity: number;
  cloud: number;
  vis_km: number;
  uv?: number | null;
  gust_kph?: number | null;
  condition_code?: number | null;
}

export interface WeatherRiskResponse {
  location: LocationInfo;
  weather: WeatherCondition;
  risk: RiskSummary;
  agent_summary?: string | null;
}
