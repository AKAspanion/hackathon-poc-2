"use client";

import type { ShipmentInput } from "@/lib/types";

interface ShipmentFormProps {
  input: ShipmentInput;
  onChange: (input: ShipmentInput) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}

export function ShipmentForm({
  input,
  onChange,
  onSubmit,
  loading,
  error,
}: ShipmentFormProps) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-light-gray bg-white p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px] font-semibold leading-tight text-dark-gray">
          Shipment Details
        </h2>
        <span className="rounded-full border border-sky-blue bg-sky-blue/30 px-3 py-1 text-[12px] font-medium text-primary-dark">
          Supplier → OEM · Weather Exposure
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="supplier-city"
            className="mb-1.5 block text-[14px] font-medium text-dark-gray"
          >
            Supplier City <span className="text-medium-gray">(Origin)</span>
          </label>
          <input
            id="supplier-city"
            type="text"
            value={input.supplier_city}
            onChange={(e) =>
              onChange({ ...input, supplier_city: e.target.value })
            }
            placeholder="e.g. Shenzhen, Chennai"
            className="w-full rounded-lg border border-light-gray bg-off-white px-4 py-3 text-[16px] text-dark-gray outline-none transition placeholder:text-medium-gray focus:border-primary-light focus:ring-2 focus:ring-primary-light/20"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="oem-city"
            className="mb-1.5 block text-[14px] font-medium text-dark-gray"
          >
            OEM City <span className="text-medium-gray">(Destination)</span>
          </label>
          <input
            id="oem-city"
            type="text"
            value={input.oem_city}
            onChange={(e) => onChange({ ...input, oem_city: e.target.value })}
            placeholder="e.g. Detroit, Stuttgart"
            className="w-full rounded-lg border border-light-gray bg-off-white px-4 py-3 text-[16px] text-dark-gray outline-none transition placeholder:text-medium-gray focus:border-primary-light focus:ring-2 focus:ring-primary-light/20"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="start-date"
            className="mb-1.5 block text-[14px] font-medium text-dark-gray"
          >
            Shipment Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={input.shipment_start_date}
            max={new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0]}
            onChange={(e) =>
              onChange({ ...input, shipment_start_date: e.target.value })
            }
            className="w-full rounded-lg border border-light-gray bg-off-white px-4 py-3 text-[16px] text-dark-gray outline-none transition focus:border-primary-light focus:ring-2 focus:ring-primary-light/20"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="transit-days"
            className="mb-1.5 block text-[14px] font-medium text-dark-gray"
          >
            Transit Duration (days)
          </label>
          <input
            id="transit-days"
            type="number"
            min={1}
            max={14}
            value={input.transit_days}
            onChange={(e) =>
              onChange({ ...input, transit_days: parseInt(e.target.value, 10) || 1 })
            }
            className="w-full rounded-lg border border-light-gray bg-off-white px-4 py-3 text-[16px] text-dark-gray outline-none transition focus:border-primary-light focus:ring-2 focus:ring-primary-light/20"
            required
            disabled={loading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-dark px-5 py-3 text-[16px] font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span
              className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              aria-hidden
            />
            Analysing shipment weather exposure…
          </>
        ) : (
          "Run Shipment Weather Analysis"
        )}
      </button>

      {error && (
        <p className="text-[14px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
