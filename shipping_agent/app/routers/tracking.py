from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from ..services.mock_tracking import get_tracking

router = APIRouter(prefix="/api/tracking", tags=["tracking"])


@router.get("/{awb_code}")
async def get_tracking_by_awb(awb_code: str) -> Dict[str, Any]:
    payload = get_tracking(awb_code)
    if payload is None:
        raise HTTPException(status_code=404, detail="Tracking not found for this AWB code")
    return payload
