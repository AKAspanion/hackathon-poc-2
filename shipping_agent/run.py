#!/usr/bin/env python3
"""
Run the Shipping Agent API. Execute from inside the shipping_agent directory:
  python run.py
"""
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
