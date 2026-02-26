import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine

# Import all models so they are registered with Base.metadata before create_all
import app.models  # noqa: F401

from app.api.routes import (
    app_routes,
    oems,
    risks,
    opportunities,
    mitigation_plans,
    suppliers,
    agent,
    ws,
    weather_agent,
    shipping_suppliers,
    shipping_risk,
    shipping_tracking,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Suppress SQL echo/logging (engine already has echo=False)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Ensure DB tables exist for SQLAlchemy models (non-blocking: app can run without DB for weather-agent etc.)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    logger.warning(
        "Database not available (tables not created): %s. "
        "Set DATABASE_URL or db_* env vars and ensure PostgreSQL is running. "
        "Weather-agent and other stateless routes will still work.",
        e,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # No periodic scheduler: agent workflow is triggered explicitly
    # via the /agent/trigger endpoint from the frontend.
    try:
        from app.seed_shipping import seed_shipping_if_empty
        seed_shipping_if_empty()
    except Exception as e:
        logger.warning("Shipping seed skipped (non-fatal): %s", e)
    yield


app = FastAPI(
    title="Predictive Supply Chain Agent API",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(app_routes.router)
app.include_router(oems.router)
app.include_router(risks.router)
app.include_router(opportunities.router)
app.include_router(mitigation_plans.router)
app.include_router(suppliers.router)
app.include_router(agent.router)
app.include_router(weather_agent.router)
app.include_router(ws.router)
app.include_router(shipping_suppliers.router)
app.include_router(shipping_risk.router)
app.include_router(shipping_tracking.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.env == "development",
    )
