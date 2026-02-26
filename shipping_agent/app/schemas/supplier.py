from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SupplierBase(BaseModel):
    name: str = Field(..., description="Supplier name")
    material_name: str = Field(..., description="Material or part supplied")
    location_city: Optional[str] = Field(None, description="Origin city of supplier")
    destination_city: str = Field("Bangalore", description="Destination OEM city (default Bangalore)")

    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)

    shipping_mode: str = Field(..., description="Shipping mode, e.g. Sea, Air, Road, Rail")
    distance_km: Optional[float] = Field(None, ge=0)
    avg_transit_days: Optional[float] = Field(None, ge=0)

    historical_delay_percentage: Optional[float] = Field(None, ge=0, le=100)
    port_used: Optional[str] = None

    alternate_route_available: bool = False
    is_critical_supplier: bool = False


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    material_name: Optional[str] = None
    location_city: Optional[str] = None
    destination_city: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    shipping_mode: Optional[str] = None
    distance_km: Optional[float] = Field(None, ge=0)
    avg_transit_days: Optional[float] = Field(None, ge=0)
    historical_delay_percentage: Optional[float] = Field(None, ge=0, le=100)
    port_used: Optional[str] = None
    alternate_route_available: Optional[bool] = None
    is_critical_supplier: Optional[bool] = None


class SupplierOut(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }
