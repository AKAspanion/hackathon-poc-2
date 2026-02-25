"use client";

import { useState } from "react";
import type { WeatherRiskResponse } from "@/lib/types";
import { fetchWeatherRisk } from "@/lib/api";
import {
  WeatherRiskForm,
  LocationWeatherCard,
  RiskSummaryCard,
  AgentSummaryCard,
  RiskFactorsGrid,
} from "@/components";

export default function Home() {
  const [city, setCity] = useState("New Delhi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherRiskResponse | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await fetchWeatherRisk(city);
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while calling the agent.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-off-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-stretch md:py-14 lg:px-8">
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
              Enter a city. Our agent pulls live weather, translates it into
              operational risk for your plant, and proposes concrete mitigation
              actions — in seconds, not days.
            </p>
            <ul className="mt-4 space-y-2 text-[16px] text-medium-gray">
              <li>• Maps weather → transport, power, port, production risk</li>
              <li>
                • Generates executive‑ready summaries via local LLM (Ollama)
              </li>
              <li>• Designed for real‑time control rooms and S&OP war rooms</li>
            </ul>
          </div>
          <p className="mt-8 hidden text-[14px] text-medium-gray md:block">
            Backend: FastAPI · LangGraph · Ollama · WeatherAPI
          </p>
        </aside>

        <main className="flex flex-1 flex-col gap-6">
          <WeatherRiskForm
            city={city}
            onCityChange={setCity}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />

          <section className="flex-1 space-y-4 rounded-2xl border border-light-gray bg-white p-5 shadow-sm">
            {!data && !loading && !error && (
              <p className="text-[16px] text-medium-gray">
                Run the agent with a city to see live manufacturing risk and
                mitigation guidance here.
              </p>
            )}

            {data && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.4fr,1.6fr]">
                  <LocationWeatherCard
                    location={data.location}
                    weather={data.weather}
                  />
                  <RiskSummaryCard
                    overallLevel={data.risk.overall_level}
                    overallScore={data.risk.overall_score}
                    primaryConcerns={data.risk.primary_concerns}
                  />
                </div>

                {data.agent_summary && (
                  <AgentSummaryCard summary={data.agent_summary} />
                )}

                <RiskFactorsGrid factors={data.risk.factors} />
              </div>
            )}

            {loading && (
              <p className="text-[16px] text-medium-gray">
                Thinking through weather, logistics and mitigation options…
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
