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
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
# Suppress SQL echo/logging (engine already has echo=False)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Ensure DB tables exist for SQLAlchemy models
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # No periodic scheduler: agent workflow is triggered explicitly
    # via the /agent/trigger endpoint from the frontend.
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.env == "development",
    )
