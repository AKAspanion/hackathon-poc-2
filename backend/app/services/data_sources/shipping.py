import random
from app.services.data_sources.base import BaseDataSource, DataSourceResult


class ShippingRoutesDataSource(BaseDataSource):
    def get_type(self) -> str:
        return "shipping"

    async def _on_initialize(self) -> None:
        pass

    async def is_available(self) -> bool:
        return True

    async def fetch_data(self, params: dict | None = None) -> list[DataSourceResult]:
        routes = (params or {}).get("routes") or [
            {"origin": "Shanghai", "destination": "Los Angeles"},
            {"origin": "Rotterdam", "destination": "Singapore"},
            {"origin": "Singapore", "destination": "Tokyo"},
        ]
        disruption_reasons = [
            "port_congestion", "weather", "labor_strike", "canal_delay", "vessel_shortage"
        ]
        results = []
        for route in routes:
            has_disruption = random.random() > 0.5
            reason = random.choice(disruption_reasons) if has_disruption else None
            delay_days = random.randint(1, 14) if has_disruption else 0
            results.append(self._create_result({
                "origin": route["origin"],
                "destination": route["destination"],
                "route": f"{route['origin']} → {route['destination']}",
                "status": "disrupted" if has_disruption else "normal",
                "delayDays": delay_days,
                "disruptionReason": reason,
                "vesselAvailability": "low" if has_disruption else "normal",
                "portConditions": "congested" if has_disruption else "normal",
                "estimatedRecoveryDays": (delay_days + random.randint(0, 7)) if has_disruption else 0,
            }))
        return results
