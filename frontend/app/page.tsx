'use client';

import { useState } from 'react';
import { AgentStatus } from '@/components/AgentStatus';
import { RisksList } from '@/components/RisksList';
import { OpportunitiesList } from '@/components/OpportunitiesList';
import { MitigationPlansList } from '@/components/MitigationPlansList';
import { SuppliersList } from '@/components/SuppliersList';
import { AppNav } from '@/components/AppNav';
import {
  WeatherRiskForm,
  LocationWeatherCard,
  RiskSummaryCard,
  AgentSummaryCard,
  RiskFactorsGrid,
  ShipmentForm,
  ShipmentTimeline,
  ShipmentExposureSummary,
} from '@/components/WeatherAgentComponents';
import { ShippingRiskDashboard } from '@/components/ShippingRiskDashboard';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agentApi, fetchWeatherRisk, fetchShipmentWeatherExposure } from '@/lib/api';
import type {
  WeatherRiskResponse,
  ShipmentInput,
  ShipmentWeatherExposureResponse,
} from '@/lib/types';
import { useWebSocketNotifications } from '@/hooks/useWebSocketNotifications';

type Tab = 'dashboard' | 'weather' | 'shipping-risk';

const today = new Date().toISOString().split('T')[0];

export default function Home() {
  const [tab, setTab] = useState<Tab>('dashboard');

  const queryClient = useQueryClient();
  useWebSocketNotifications();
  const triggerMutation = useMutation({
    mutationFn: agentApi.triggerAnalysis,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-status'] });
      queryClient.invalidateQueries({ queryKey: ['risks'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['mitigation-plans'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleTriggerAnalysis = () => {
    triggerMutation.mutate();
  };

  // Weather / Shipment state (from POC)
  const [city, setCity] = useState('New Delhi');
  const [cityLoading, setCityLoading] = useState(false);
  const [cityError, setCityError] = useState<string | null>(null);
  const [cityData, setCityData] = useState<WeatherRiskResponse | null>(null);

  const [shipmentInput, setShipmentInput] = useState<ShipmentInput>({
    supplier_city: 'Chennai',
    oem_city: 'Stuttgart',
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
      setCityError(err instanceof Error ? err.message : 'Something went wrong.');
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
      setShipmentError(err instanceof Error ? err.message : 'Something went wrong.');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Predictive Supply Chain Agent
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Global Watchtower for Manufacturing Logistics
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 p-1">
                <button
                  type="button"
                  onClick={() => setTab('dashboard')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tab === 'dashboard'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setTab('weather')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tab === 'weather'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Weather & Shipment
                </button>
                <button
                  type="button"
                  onClick={() => setTab('shipping-risk')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    tab === 'shipping-risk'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Shipping Risk
                </button>
              </div>
              <AppNav />
              {tab === 'dashboard' && (
                <button
                  onClick={handleTriggerAnalysis}
                  disabled={triggerMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                >
                  {triggerMutation.isPending ? 'Triggering...' : 'Trigger Analysis'}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {tab === 'dashboard' && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <AgentStatus />
          </div>
          <div className="mb-6">
            <SuppliersList />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RisksList />
            <OpportunitiesList />
          </div>
          <div className="mb-6">
            <MitigationPlansList />
          </div>
        </main>
      )}

      {tab === 'shipping-risk' && (
        <div className="min-h-[calc(100vh-80px)]">
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Shipping Risk Intelligence
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manufacturing hub: Bangalore, India · Shipment Agent · LLM + Tracking
            </p>
          </div>
          <ShippingRiskDashboard />
        </div>
      )}

      {tab === 'weather' && (
        <main className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl flex-col gap-10 px-4 py-10 md:flex-row md:items-stretch md:py-14 lg:px-8">
          <aside className="flex flex-1 flex-col justify-between border-b border-light-gray pb-8 md:border-b-0 md:border-r md:border-light-gray md:pb-0 md:pr-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-light/50 bg-sky-blue/40 px-3 py-1.5 text-[12px] font-medium uppercase tracking-wide text-primary-dark">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-light" />
                Weather Agent · Manufacturing
              </div>
              <h2 className="text-[28px] font-bold leading-tight text-dark-gray">
                Weather‑aware Supply Chain Risk
              </h2>
              <p className="max-w-xl text-[16px] leading-relaxed text-medium-gray">
                Analyse weather exposure across your shipment timeline from Supplier to OEM — day by day.
              </p>
              <div className="mt-6 flex rounded-xl border border-light-gray bg-white p-1 gap-1 w-fit">
                <button
                  type="button"
                  onClick={() => setTab('dashboard')}
                  className="rounded-lg px-4 py-2 text-[13px] font-medium text-medium-gray hover:text-dark-gray"
                >
                  ← Back to Dashboard
                </button>
              </div>
            </div>
          </aside>
          <div className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white p-5 shadow-sm">
              <h3 className="text-[18px] font-semibold text-dark-gray">Shipment Exposure</h3>
              <ShipmentForm
                input={shipmentInput}
                onChange={setShipmentInput}
                onSubmit={handleShipmentSubmit}
                loading={shipmentLoading}
                error={shipmentError}
              />
            </div>
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
                    shipmentData.days.reduce<ShipmentWeatherExposureResponse['days'][0]>(
                      (best, d) =>
                        d.risk.overall_score > best.risk.overall_score ? d : best,
                      shipmentData.days[0]
                    )?.risk.factors ?? []
                  }
                />
              </>
            )}
            <div className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white p-5 shadow-sm">
              <h3 className="text-[18px] font-semibold text-dark-gray">City Risk</h3>
              <WeatherRiskForm
                city={city}
                onCityChange={setCity}
                onSubmit={handleCitySubmit}
                loading={cityLoading}
                error={cityError}
              />
            </div>
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
                {cityData.agent_summary && (
                  <AgentSummaryCard summary={cityData.agent_summary} />
                )}
                <RiskFactorsGrid factors={cityData.risk.factors} />
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
