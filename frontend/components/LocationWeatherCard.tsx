"use client";

import type { LocationInfo, WeatherCondition } from "@/lib/types";

interface LocationWeatherCardProps {
  location: LocationInfo;
  weather: WeatherCondition;
}

export function LocationWeatherCard({ location, weather }: LocationWeatherCardProps) {
  return (
    <div className="rounded-2xl border border-light-gray bg-white p-5 shadow-sm">
      <h3 className="text-[12px] font-semibold uppercase tracking-wide text-medium-gray">
        Location & weather
      </h3>
      <p className="mt-2 text-[20px] font-semibold leading-tight text-dark-gray">
        {location.name || "Unknown"}
        {location.region && `, ${location.region}`}
        {location.country && `, ${location.country}`}
      </p>
      <p className="mt-0.5 text-[14px] text-medium-gray">
        {location.localtime
          ? `Local time · ${location.localtime}`
          : `Lat ${location.lat.toFixed(2)}, Lon ${location.lon.toFixed(2)}`}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 text-[14px]">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Condition
          </div>
          <div className="mt-0.5 font-medium text-dark-gray">{weather.text}</div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Temperature
          </div>
          <div className="mt-0.5 font-medium text-dark-gray">
            {weather.temp_c.toFixed(1)}°C
            <span className="ml-1 text-[13px] font-normal text-medium-gray">
              (feels {weather.feelslike_c.toFixed(1)}°C)
            </span>
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Wind / Visibility
          </div>
          <div className="mt-0.5 font-medium text-dark-gray">
            {weather.wind_kph.toFixed(1)} km/h · {weather.vis_km.toFixed(1)} km
            vis
          </div>
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-medium-gray">
            Humidity / UV
          </div>
          <div className="mt-0.5 font-medium text-dark-gray">
            {weather.humidity}% hum · UV {weather.uv ?? "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
