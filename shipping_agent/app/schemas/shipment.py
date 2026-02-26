from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ShipmentBase(BaseModel):
    supplier_id: int
    awb_code: str
    courier_name: Optional[str] = None
    origin_city: str
    destination_city: str
    pickup_date: datetime
    expected_delivery_date: datetime
    delivered_date: Optional[datetime] = None
    current_status: str
    weight: Optional[float] = None
    packages: Optional[int] = None


class ShipmentCreate(ShipmentBase):
    pass


class ShipmentOut(ShipmentBase):
    id: int

    model_config = {
        "from_attributes": True,
    }
