import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import OperationalError

from .config import settings
from .database import Base, engine
from .routers import shipping_risk as shipping_risk_router
from .routers import suppliers as suppliers_router
from .routers import tracking as tracking_router
from .seed import seed_if_empty

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name)

# Allow local tools / frontends to call the API easily
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend dashboard from /ui
app.mount("/ui", StaticFiles(directory="frontend", html=True), name="frontend")

app.include_router(suppliers_router.router)
app.include_router(shipping_risk_router.router)
app.include_router(tracking_router.router)


@app.on_event("startup")
def create_tables():
    """Create DB tables on startup. App still starts if DB is unreachable."""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created or already exist.")

        # Seed reference data (suppliers + shipments) if empty
        seed_if_empty()
    except OperationalError as e:
        logger.warning(
            "Could not connect to database at startup: %s. "
            "Ensure PostgreSQL is running and DATABASE_URL is correct. "
            "Endpoints that use the DB will fail until the connection works.",
            e,
        )


@app.get("/", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "service": settings.app_name}
