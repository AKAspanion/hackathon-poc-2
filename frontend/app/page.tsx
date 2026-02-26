"use client";

import { useState } from "react";
import type { WeatherRiskResponse, ShipmentInput, ShipmentWeatherExposureResponse } from "@/lib/types";
import { fetchWeatherRisk, fetchShipmentWeatherExposure } from "@/lib/api";
import {
  WeatherRiskForm,
  LocationWeatherCard,
  RiskSummaryCard,
  AgentSummaryCard,
  RiskFactorsGrid,
  ShipmentForm,
  ShipmentTimeline,
  ShipmentExposureSummary,
} from "@/components";

type Tab = "city" | "shipment";

const today = new Date().toISOString().split("T")[0];

export default function Home() {
  const [tab, setTab] = useState<Tab>("shipment");

  // City risk state
  const [city, setCity] = useState("New Delhi");
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<WeatherRiskResponse | null>(null);

  // Shipment state
  const [shipmentInput, setShipmentInput] = useState<ShipmentInput>({
    supplier_city: "Chennai",
    oem_city: "Stuttgart",
    shipment_start_date: today,
    transit_days: 5,
  });
  const [shipmentLoading, setShipmentLoading] = useState(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);
  const [shipmentData, setShipmentData] = useState<ShipmentWeatherExposureResponse | null>(null);
  const [payloadCopied, setPayloadCopied] = useState(false);

  async function handleCitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setCityLoading(true);
    setCityError(null);
    setCityData(null);
    try {
      const result = await fetchWeatherRisk(city);
      setCityData(result);
    } catch (err) {
      setCityError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCityLoading(false);
    }
  }

  async function handleShipmentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setShipmentLoading(true);
    setShipmentError(null);
    setShipmentData(null);
    setPayloadCopied(false);
    try {
      const result = await fetchShipmentWeatherExposure(shipmentInput);
      setShipmentData(result);
    } catch (err) {
      setShipmentError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setShipmentLoading(false);
    }
  }

  function handleCopyPayload() {
    if (!shipmentData) return;
    navigator.clipboard
      .writeText(JSON.stringify(shipmentData.risk_analysis_payload, null, 2))
      .then(() => {
        setPayloadCopied(true);
        setTimeout(() => setPayloadCopied(false), 2500);
      });
  }

  return (
    <div className="min-h-screen bg-off-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-stretch md:py-14 lg:px-8">
        {/* Sidebar */}
        <aside className="flex flex-1 flex-col justify-between border-b border-light-gray pb-8 md:border-b-0 md:border-r md:border-light-gray md:pb-0 md:pr-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-light/50 bg-sky-blue/40 px-3 py-1.5 text-[12px] font-medium uppercase tracking-wide text-primary-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
              Swarm Controller · Manufacturing
            </div>
            <h1 className="text-[40px] font-bold leading-tight text-dark-gray md:text-[40px]">
              Weather‑aware{" "}
              <span className="bg-linear-to-r from-primary-dark via-primary-light to-cyan-blue bg-clip-text text-transparent">
                Supply Chain Risk Agent
              </span>
            </h1>
            <p className="max-w-xl text-[16px] leading-relaxed text-medium-gray">
              Analyse weather exposure across your full shipment timeline from Supplier to OEM — day by day, location by location.
            </p>
            <ul className="mt-4 space-y-2 text-[15px] text-medium-gray">
              <li>• Day 1: current weather + multi-day forecast</li>
              <li>• Day 2+: historical data for past days, forecast for future</li>
              <li>• Per-day risk scoring: transport, production, port &amp; more</li>
              <li>• Structured payload ready for Risk Analysis Agent</li>
            </ul>

            {/* Tab switcher */}
            <div className="mt-6 flex rounded-xl border border-light-gray bg-white p-1 gap-1 w-fit">
              <button
                onClick={() => setTab("shipment")}
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                  tab === "shipment"
                    ? "bg-primary-dark text-white shadow"
                    : "text-medium-gray hover:text-dark-gray"
                }`}
              >
                🚚 Shipment Exposure
              </button>
              <button
                onClick={() => setTab("city")}
                className={`rounded-lg px-4 py-2 text-[13px] font-medium transition ${
                  tab === "city"
                    ? "bg-primary-dark text-white shadow"
                    : "text-medium-gray hover:text-dark-gray"
                }`}
              >
                📍 City Risk
              </button>
            </div>
          </div>
          <p className="mt-8 hidden text-[14px] text-medium-gray md:block">
            Backend: FastAPI · LangGraph · Ollama · WeatherAPI
          </p>
        </aside>

        {/* Main */}
        <main className="flex flex-1 flex-col gap-6">

          {/* SHIPMENT TAB */}
          {tab === "shipment" && (
            <>
              <ShipmentForm
                input={shipmentInput}
                onChange={setShipmentInput}
                onSubmit={handleShipmentSubmit}
                loading={shipmentLoading}
                error={shipmentError}
              />
              <section className="flex-1 space-y-5 rounded-2xl border border-light-gray bg-white p-5 shadow-sm">
                {!shipmentData && !shipmentLoading && !shipmentError && (
                  <p className="text-[16px] text-medium-gray">
                    Enter shipment details above and run the analysis to see the weather exposure timeline and risk payload.
                  </p>
                )}
                {shipmentLoading && (
                  <p className="text-[16px] text-medium-gray">
                    Fetching weather data for each day of your shipment timeline…
                  </p>
                )}
                {shipmentData && (
                  <>
                    <ShipmentExposureSummary
                      data={shipmentData}
                      onCopyPayload={handleCopyPayload}
                      payloadCopied={payloadCopied}
                    />
                    <ShipmentTimeline days={shipmentData.days} />
                    <RiskFactorsGrid
                      factors={
                        shipmentData.days.reduce(
                          (best, d) =>
                            d.risk.overall_score > best.risk.overall_score ? d : best,
                          shipmentData.days[0]
                        )?.risk.factors ?? []
                      }
                    />
                  </>
                )}
              </section>
            </>
          )}

          {/* CITY RISK TAB */}
          {tab === "city" && (
            <>
              <WeatherRiskForm
                city={city}
                onCityChange={setCity}
                onSubmit={handleCitySubmit}
                loading={cityLoading}
                error={cityError}
              />
              <section className="flex-1 space-y-4 rounded-2xl border border-light-gray bg-white p-5 shadow-sm">
                {!cityData && !cityLoading && !cityError && (
                  <p className="text-[16px] text-medium-gray">
                    Run the agent with a city to see live manufacturing risk and mitigation guidance here.
                  </p>
                )}
                {cityData && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr,1.6fr]">
                      <LocationWeatherCard location={cityData.location} weather={cityData.weather} />
                      <RiskSummaryCard
                        overallLevel={cityData.risk.overall_level}
                        overallScore={cityData.risk.overall_score}
                        primaryConcerns={cityData.risk.primary_concerns}
                      />
                    </div>
                    {cityData.agent_summary && <AgentSummaryCard summary={cityData.agent_summary} />}
                    <RiskFactorsGrid factors={cityData.risk.factors} />
                  </div>
                )}
                {cityLoading && (
                  <p className="text-[16px] text-medium-gray">
                    Thinking through weather, logistics and mitigation options…
                  </p>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
