'use client';

import { ShippingRiskDashboard } from '@/components/ShippingRiskDashboard';

export default function ShippingRiskPage() {
  return (
    <>
      <div className="">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Shipping Risk Intelligence
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Manufacturing hub: Bangalore, India · Shipment Agent · LLM + Tracking
        </p>
      </div>
      <ShippingRiskDashboard />
    </>
  );
}
