from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from ..database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    material_name = Column(String(255), nullable=False)
    # Origin city of the supplier
    location_city = Column(String(255), nullable=True)

    # Destination manufacturing city (OEM) - default Bangalore
    destination_city = Column(String(255), nullable=False, default="Bangalore")

    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    shipping_mode = Column(String(50), nullable=False)  # e.g. "Sea", "Air", "Road", "Rail"
    distance_km = Column(Float, nullable=True)
    avg_transit_days = Column(Float, nullable=True)

    historical_delay_percentage = Column(Float, nullable=True)
    port_used = Column(String(255), nullable=True)

    alternate_route_available = Column(Boolean, nullable=False, default=False)
    is_critical_supplier = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
