"""LLM-powered shipment risk agent using OpenAI-compatible tool calling.

This module is responsible for orchestrating the conversation with the
sandlogic gateway (OpenAI-compatible API) and invoking tools to fetch
supplier, shipment and tracking data.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from openai import OpenAI
from sqlalchemy.orm import Session

from ..config import settings
from ..models.shipment import Shipment
from ..models.supplier import Supplier
from .mock_tracking import get_tracking


def _build_client() -> OpenAI:
    api_key = settings.openai_api_key
    base_url = settings.openai_base_url
    print("[DEBUG] openai_api_key =", api_key)
    print("[DEBUG] openai_base_url =", base_url)
    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY must be set in the environment to use the shipment agent."
        )
    # Use the provided sandlogic base URL when present; otherwise default client
    if base_url:
        return OpenAI(api_key=api_key, base_url=base_url)
    return OpenAI(api_key=api_key)


TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_supplier_details",
            "description": "Get core details of a supplier by ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {
                        "type": "integer",
                        "description": "ID of the supplier",
                    }
                },
                "required": ["supplier_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shipments_for_supplier",
            "description": "Get all shipments associated with a supplier.",
            "parameters": {
                "type": "object",
                "properties": {
                    "supplier_id": {
                        "type": "integer",
                        "description": "ID of the supplier",
                    }
                },
                "required": ["supplier_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_shipment_tracking",
            "description": "Get day-wise tracking events for a shipment AWB code.",
            "parameters": {
                "type": "object",
                "properties": {
                    "awb_code": {
                        "type": "string",
                        "description": "AWB code of the shipment",
                    }
                },
                "required": ["awb_code"],
            },
        },
    },
]


SYSTEM_PROMPT = """You are a Shipment Risk Intelligence Agent.

You will be given JSON context containing:
- supplier details
- shipments for that supplier
- detailed tracking events for each shipment (Shiprocket-style JSON)

Your goals:
1. Construct shipment metadata for the supplier (shipments + tracking timeline).
2. Calculate:
   - Delay Risk: how late vs expected delivery date (per shipment and overall).
   - Stagnation Risk: periods of no movement (no scan events) for > 24-48 hours.
   - Velocity Risk: whether the shipment is moving slower than expected between milestones.
3. Produce a JSON summary with the following top-level keys ONLY:
   - shipping_risk_score: float between 0 and 1
   - risk_level: one of ["Low", "Medium", "High", "Critical"]
   - delay_probability: float between 0 and 1
   - delay_risk_score, stagnation_risk_score, velocity_risk_score: floats 0-1
   - risk_factors: list of short strings
   - recommended_actions: list of short, actionable suggestions
   - shipment_metadata: structured object including shipments and per-shipment analysis

Respond strictly as a single JSON object; do not include any prose outside JSON.
"""


def _tool_get_supplier_details(db: Session, supplier_id: int) -> Dict[str, Any]:
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        return {"error": f"Supplier {supplier_id} not found"}
    return {
        "id": supplier.id,
        "name": supplier.name,
        "material_name": supplier.material_name,
        "origin_city": supplier.location_city,
        "destination_city": supplier.destination_city,
        "shipping_mode": supplier.shipping_mode,
        "distance_km": supplier.distance_km,
        "avg_transit_days": supplier.avg_transit_days,
    }


def _tool_get_shipments_for_supplier(db: Session, supplier_id: int) -> List[Dict[str, Any]]:
    shipments: List[Shipment] = (
        db.query(Shipment).filter(Shipment.supplier_id == supplier_id).all()
    )
    return [
        {
            "id": sh.id,
            "awb_code": sh.awb_code,
            "courier_name": sh.courier_name,
            "origin_city": sh.origin_city,
            "destination_city": sh.destination_city,
            "pickup_date": sh.pickup_date.isoformat() if sh.pickup_date else None,
            "expected_delivery_date": sh.expected_delivery_date.isoformat()
            if sh.expected_delivery_date
            else None,
            "delivered_date": sh.delivered_date.isoformat() if sh.delivered_date else None,
            "current_status": sh.current_status,
            "weight": sh.weight,
            "packages": sh.packages,
        }
        for sh in shipments
    ]


def _tool_get_shipment_tracking(awb_code: str) -> Dict[str, Any]:
    tracking = get_tracking(awb_code)
    if tracking is None:
        return {"error": f"No tracking found for AWB {awb_code}"}
    return tracking


def analyze_shipments_for_supplier(db: Session, supplier: Supplier) -> Dict[str, Any]:
    """Analyze shipments using a single JSON-style LLM call (no remote tools).

    We gather supplier, shipment, and tracking data locally in Python and pass
    it to the model as JSON context, then ask the model to return a structured
    JSON object matching ShippingRiskResult.
    """

    client = _build_client()

    print(f"[AGENT] Starting analysis for supplier {supplier.id} - {supplier.name}")

    supplier_data = _tool_get_supplier_details(db, supplier.id)
    shipments = _tool_get_shipments_for_supplier(db, supplier.id)

    tracking_by_awb: Dict[str, Any] = {}
    for sh in shipments:
        awb = sh.get("awb_code")
        if not awb:
            continue
        tracking_by_awb[awb] = _tool_get_shipment_tracking(awb)

    context = {
        "supplier": supplier_data,
        "shipments": shipments,
        "tracking_by_awb": tracking_by_awb,
    }

    messages: List[Dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": json.dumps({"context": context}),
        },
    ]

    print(f"[AGENT] LLM call 1 - sending context with {len(shipments)} shipments and {len(tracking_by_awb)} AWBs")
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=messages,
        )
    except Exception as e:  # pragma: no cover - debug aid
        print(f"[AGENT] Error during LLM call: {repr(e)}")
        raise

    choice = response.choices[0]
    message = choice.message

    content = message.content or "{}"
    print(f"[AGENT] Final LLM message content: {content[:400]}")

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        print("[AGENT] Final message was not valid JSON; returning fallback wrapper.")
        data = {
            "shipping_risk_score": 0.5,
            "risk_level": "Medium",
            "delay_probability": 0.5,
            "delay_risk_score": None,
            "stagnation_risk_score": None,
            "velocity_risk_score": None,
            "risk_factors": ["Model returned non-JSON response"],
            "recommended_actions": [content],
            "shipment_metadata": {"context": context},
        }

    # If the model forgot to include shipment_metadata, attach context so the
    # rest of the stack can still introspect raw shipment/tracking data.
    data.setdefault("shipment_metadata", context)

    print(f"[AGENT] Final structured result: {json.dumps(data)[:400]}")
    return data
