import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.config import settings
from app.api.routes import app_routes, oems, risks, opportunities, mitigation_plans, suppliers, agent
from app.api.routes import trend_insights
from app.services.agent_service import run_scheduled_cycle
from app.services.trend_orchestrator import run_trend_insights_cycle
from app.database import Base, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Ensure DB tables exist for SQLAlchemy models (includes TrendInsight)
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


def scheduled_trend_insights_job():
    if not settings.trend_agent_enabled:
        return
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        logger.info("Scheduled trend-insights cycle starting…")
        run_trend_insights_cycle(db)
        logger.info("Scheduled trend-insights cycle complete.")
    except Exception as e:
        logger.exception("Scheduled trend-insights cycle failed: %s", e)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler = BackgroundScheduler()
    scheduler.add_job(scheduled_job, "interval", minutes=5, id="agent_cycle")
    if settings.trend_agent_enabled:
        interval = max(1, settings.trend_agent_interval_minutes)
        scheduler.add_job(
            scheduled_trend_insights_job,
            "interval",
            minutes=interval,
            id="trend_insights_cycle",
        )
        logger.info(
            "Trend-insights scheduler started (interval=%d minutes)", interval
        )
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
app.include_router(trend_insights.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.env == "development",
    )
