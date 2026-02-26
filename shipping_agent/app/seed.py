"""Seed script to populate the database with 5 suppliers and 5 shipments.

Can be executed manually with:

    cd shipping_agent
    python -m app.seed

On startup, the FastAPI app can also call `seed_if_empty()` to ensure the
records exist without wiping existing data.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models.shipment import Shipment
from .models.supplier import Supplier


def _create_seed_data(db: Session) -> None:
    """Insert 5 suppliers and 5 shipments.

    This assumes tables already exist.
    """

    # Suppliers (all shipping TO Bangalore OEM)
    suppliers = [
        Supplier(
            name="Chennai Chip Supplier",
            material_name="Semiconductor Chips",
            location_city="Chennai",
            destination_city="Bangalore",
            latitude=13.0827,
            longitude=80.2707,
            shipping_mode="Road",
            distance_km=350,
            avg_transit_days=2,
            historical_delay_percentage=5,
            port_used=None,
            alternate_route_available=False,
            is_critical_supplier=True,
        ),
        Supplier(
            name="Mumbai Electronics Ltd",
            material_name="Power Modules",
            location_city="Mumbai",
            destination_city="Bangalore",
            latitude=19.0760,
            longitude=72.8777,
            shipping_mode="Road",
            distance_km=980,
            avg_transit_days=4,
            historical_delay_percentage=25,
            port_used=None,
            alternate_route_available=True,
            is_critical_supplier=True,
        ),
        Supplier(
            name="Delhi Precision Parts",
            material_name="CNC Machined Parts",
            location_city="Delhi",
            destination_city="Bangalore",
            latitude=28.7041,
            longitude=77.1025,
            shipping_mode="Rail",
            distance_km=2150,
            avg_transit_days=5,
            historical_delay_percentage=18,
            port_used=None,
            alternate_route_available=False,
            is_critical_supplier=False,
        ),
        Supplier(
            name="Pune Motor Components",
            material_name="Motor Housings",
            location_city="Pune",
            destination_city="Bangalore",
            latitude=18.5204,
            longitude=73.8567,
            shipping_mode="Road",
            distance_km=840,
            avg_transit_days=3,
            historical_delay_percentage=8,
            port_used=None,
            alternate_route_available=True,
            is_critical_supplier=False,
        ),
        Supplier(
            name="Kolkata Steel Supplier",
            material_name="Steel Coils",
            location_city="Kolkata",
            destination_city="Bangalore",
            latitude=22.5726,
            longitude=88.3639,
            shipping_mode="Rail",
            distance_km=1900,
            avg_transit_days=6,
            historical_delay_percentage=30,
            port_used=None,
            alternate_route_available=False,
            is_critical_supplier=True,
        ),
    ]

    for s in suppliers:
        db.add(s)
    db.flush()  # assign IDs

    # Helper to find supplier by name
    def _s(name: str) -> Supplier:
        for sup in suppliers:
            if sup.name == name:
                return sup
        raise KeyError(name)

    now = datetime(2022, 7, 20, 12, 0, 0)

    shipments = [
        # On-time
        Shipment(
            supplier_id=_s("Chennai Chip Supplier").id,
            awb_code="AWB-CHEN-001",
            courier_name="Xpressbees Surface",
            origin_city="Chennai",
            destination_city="Bangalore",
            pickup_date=now - timedelta(days=2, hours=2),
            expected_delivery_date=now,
            delivered_date=now,
            current_status="Delivered",
            weight=0.3,
            packages=1,
        ),
        # Delayed
        Shipment(
            supplier_id=_s("Mumbai Electronics Ltd").id,
            awb_code="AWB-MUM-002",
            courier_name="Bluedart",
            origin_city="Mumbai",
            destination_city="Bangalore",
            pickup_date=now - timedelta(days=10),
            expected_delivery_date=now - timedelta(days=6),
            delivered_date=now - timedelta(days=2),
            current_status="Delivered",
            weight=1.2,
            packages=3,
        ),
        # Stagnant
        Shipment(
            supplier_id=_s("Delhi Precision Parts").id,
            awb_code="AWB-DEL-003",
            courier_name="Delhivery",
            origin_city="Delhi",
            destination_city="Bangalore",
            pickup_date=now - timedelta(days=7),
            expected_delivery_date=now - timedelta(days=1),
            delivered_date=None,
            current_status="In Transit",
            weight=0.8,
            packages=2,
        ),
        # Ahead of schedule
        Shipment(
            supplier_id=_s("Pune Motor Components").id,
            awb_code="AWB-PUN-004",
            courier_name="Ecom Express",
            origin_city="Pune",
            destination_city="Bangalore",
            pickup_date=now - timedelta(days=2),
            expected_delivery_date=now + timedelta(days=1),
            delivered_date=now - timedelta(days=1),
            current_status="Delivered",
            weight=1.0,
            packages=1,
        ),
        # Slow velocity
        Shipment(
            supplier_id=_s("Kolkata Steel Supplier").id,
            awb_code="AWB-KOL-005",
            courier_name="Gati",
            origin_city="Kolkata",
            destination_city="Bangalore",
            pickup_date=now - timedelta(days=12),
            expected_delivery_date=now - timedelta(days=4),
            delivered_date=None,
            current_status="In Transit",
            weight=5.0,
            packages=4,
        ),
    ]

    for sh in shipments:
        db.add(sh)

    db.commit()


def seed_if_empty() -> None:
    """Create tables and seed only if there are no suppliers yet."""
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(Supplier).first()
        if existing:
            return
        _create_seed_data(db)
    finally:
        db.close()


def main() -> None:
    seed_if_empty()


if __name__ == "__main__":  # pragma: no cover
    main()
