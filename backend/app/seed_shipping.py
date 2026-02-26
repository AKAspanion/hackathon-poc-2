"""Seed shipping_suppliers and shipments if empty. Call from startup or manually."""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.shipment import Shipment
from app.models.shipping_supplier import ShippingSupplier


def _create_seed_data(db: Session) -> None:
    suppliers = [
        ShippingSupplier(
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
        ShippingSupplier(
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
        ShippingSupplier(
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
        ShippingSupplier(
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
        ShippingSupplier(
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
    db.flush()

    def _by_name(name: str) -> ShippingSupplier:
        for sup in suppliers:
            if sup.name == name:
                return sup
        raise KeyError(name)

    now = datetime(2022, 7, 20, 12, 0, 0)

    shipments = [
        Shipment(
            supplier_id=_by_name("Chennai Chip Supplier").id,
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
        Shipment(
            supplier_id=_by_name("Mumbai Electronics Ltd").id,
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
        Shipment(
            supplier_id=_by_name("Delhi Precision Parts").id,
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
        Shipment(
            supplier_id=_by_name("Pune Motor Components").id,
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
        Shipment(
            supplier_id=_by_name("Kolkata Steel Supplier").id,
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


def seed_shipping_if_empty() -> None:
    """Create shipping tables and seed only if no shipping suppliers exist."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(ShippingSupplier).first():
            return
        _create_seed_data(db)
    finally:
        db.close()
