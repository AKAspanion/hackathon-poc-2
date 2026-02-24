import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.api.routes import app_routes, oems, risks, opportunities, mitigation_plans, suppliers, agent
from app.services.agent_service import run_scheduled_cycle
from app.database import Base, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure DB tables exist for SQLAlchemy models
Base.metadata.create_all(bind=engine)


def scheduled_job():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        run_scheduled_cycle(db)
    except Exception as e:
        logger.exception("Scheduled agent cycle failed: %s", e)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_job, "interval", minutes=5, id="agent_cycle")
    scheduler.start()
    logger.info("Scheduler started (agent cycle every 5 minutes)")
    yield
    scheduler.shutdown()


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
