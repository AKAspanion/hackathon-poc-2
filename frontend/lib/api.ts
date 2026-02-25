import type { WeatherRiskResponse } from "./types";
import { API_BASE } from "./constants";

export async function fetchWeatherRisk(
  city: string,
): Promise<WeatherRiskResponse> {
  const url = `${API_BASE}/api/v1/weather/risk?city=${encodeURIComponent(
    city.trim(),
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = body?.detail ?? `Request failed with ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}
