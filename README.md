# Predictive Supply Chain Agent (Manufacturing)

A "Global Watchtower" for manufacturing logistics that continuously monitors real-time external data streams (Weather, Global News, Traffic, Market Trends) and translates raw data into specific Operational Risks or Opportunities, autonomously generating mitigation plans.

## 🎯 Project Overview

**Theme**: Predictive Supply Chain Resilience & Risk Intelligence

**Mission**: Move beyond reactive panic to proactive planning by building an intelligent agent that monitors global data streams and provides actionable insights for supply chain management.

## 🏗️ Architecture

The project is split into two separate applications:

### Backend (`/backend`)
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with SQLAlchemy
- **AI/ML**: Anthropic Claude or Ollama (LLM), custom orchestrator
- **Features**:
  - Generic data source connectors (Weather, News, Traffic, Market Trends)
  - AI-powered risk detection and opportunity identification
  - Automatic mitigation plan generation
  - RESTful API for frontend integration (JWT-protected)
  - Manually triggered analysis per OEM via `/agent/trigger`

### Frontend (`/frontend`)
- **Framework**: Next.js 16 with App Router
- **Styling**: TailwindCSS
- **State Management**: TanStack Query
- **Features**:
  - Real-time dashboard
  - Agent status monitoring
  - Risks and opportunities visualization
  - Mitigation plans display
  - Live updates via WebSocket (no polling)

## 🚀 Quick Start

**Detailed setup instructions** (prerequisites, database, env vars, scripts): see [docs/SETUP.md](docs/SETUP.md).

### Prerequisites

- **Backend**: Python 3.11+ (3.12 recommended; 3.14 not yet supported), PostgreSQL 14+
- **Frontend**: Node.js 20+, npm or yarn

### Backend Setup

```bash
cd backend

# Option A: use the start script (creates venv, installs deps, ensures DB, runs server)
./start.sh

# Option B: manual setup
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: DB_*, LLM_PROVIDER + API keys, JWT_SECRET, etc. (see docs/SETUP.md)
python ensure_db.py         # create DB if missing
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend runs on `http://localhost:8000`.

### Frontend Setup

```bash
cd frontend

yarn install
cp .env.example .env
# Edit .env: set NEXT_PUBLIC_API_URL (default http://localhost:8000)
yarn dev
```

The frontend runs on `http://localhost:3000`.

## 📊 Features

### Data Sources
- **Weather**: Real-time weather data (OpenWeatherMap API or mock)
- **News**: Supply chain related news (NewsAPI or mock)
- **Traffic**: Traffic and logistics data (mock, ready for real API)
- **Market**: Commodity and market trends (mock, ready for real API)

### Agent Capabilities
- **On-demand Monitoring**: Each run fetches fresh data across all sources for the current OEM (triggered manually)
- **Risk Detection**: Identifies supply chain risks with severity levels (low, medium, high, critical)
- **Opportunity Identification**: Detects optimization opportunities (cost saving, time saving, quality improvement, etc.)
- **Mitigation Planning**: AI-generated action plans for risks and opportunities
- **Status Tracking**: Real-time agent status and statistics

### Dashboard Features
- **Agent Status**: Current agent state, task, and statistics
- **Risks View**: List of detected risks with severity and status
- **Opportunities View**: Identified opportunities with type and value
- **Mitigation Plans**: Generated action plans with status tracking
- **Manual Trigger**: Ability to manually trigger analysis

## 🧠 High-level workflow

1. **OEM signs in** on the frontend with email only (no password). The backend creates or finds the OEM and returns a JWT; all subsequent API calls are scoped to this OEM.
2. **Suppliers are onboarded** by uploading a CSV to `/suppliers/upload`. These suppliers (names, locations, commodities) define the OEM’s supply network.
3. **User clicks "Trigger Analysis"** on the dashboard, which calls `POST /agent/trigger` for the current OEM.
4. **Agent run (backend)**:
   - Builds an OEM scope from OEM + suppliers (cities, regions, commodities, routes).
   - Fetches weather, news, traffic, market, and shipping data via pluggable data sources.
   - Uses the LLM orchestrator to turn raw data into risks, opportunities, and mitigation plans.
   - Computes OEM and per-supplier risk scores and stores everything in PostgreSQL.
5. **Dashboard updates in real time**: the backend pushes agent status and supplier snapshots over WebSocket; TanStack Query syncs the React UI without manual refresh.

## 🔧 Configuration

Environment variables are documented in [docs/SETUP.md](docs/SETUP.md). Summary:

- **Backend** (`backend/.env`): copy from `backend/.env.example`. Covers database (`DB_*`), LLM (`LLM_PROVIDER`, `ANTHROPIC_*`, `OLLAMA_*`, `OPENAI_*`), API keys (`WEATHER_API_KEY`, `NEWS_API_KEY`), JWT (`JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_DAYS`), trend agent (`TREND_AGENT_*`), and app (`PORT`, `ENV`, `FRONTEND_URL`).
- **Frontend** (`frontend/.env`): copy from `frontend/.env.example`. Set `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## 📡 API Endpoints

### Agent
- `GET /agent/status` - Get agent status
- `POST /agent/trigger` - Manually trigger analysis

### Risks
- `GET /risks` - Get all risks (filters: `?status=`, `?severity=`)
- `GET /risks/:id` - Get risk by ID
- `GET /risks/stats/summary` - Get risk statistics
- `POST /risks` - Create risk
- `PUT /risks/:id` - Update risk

### Opportunities
- `GET /opportunities` - Get all opportunities (filters: `?status=`, `?type=`)
- `GET /opportunities/:id` - Get opportunity by ID
- `GET /opportunities/stats/summary` - Get opportunity statistics
- `POST /opportunities` - Create opportunity
- `PUT /opportunities/:id` - Update opportunity

### Mitigation Plans
- `GET /mitigation-plans` - Get all plans (filters: `?riskId=`, `?opportunityId=`, `?status=`)
- `GET /mitigation-plans/:id` - Get plan by ID
- `POST /mitigation-plans` - Create plan
- `PUT /mitigation-plans/:id` - Update plan

## 🧪 Development

### Backend
```bash
cd backend
./start.sh        # Dev with hot reload (or: source .venv/bin/activate && uvicorn main:app --reload --port 8000)
# No yarn scripts; use uvicorn for production: uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
yarn dev          # Development server
yarn build        # Production build
yarn start        # Production server
```

## 📁 Project Structure

See [docs/APP-ARCHITECTURE.md](docs/APP-ARCHITECTURE.md) for a full overview. Summary:

```
hackathon-2/
├── backend/
│   ├── app/
│   │   ├── api/                # FastAPI routes (REST + WebSocket)
│   │   ├── models/             # SQLAlchemy models
│   │   ├── services/           # Agent logic, data sources, orchestrator
│   │   ├── schemas/            # Pydantic schemas
│   │   ├── config.py           # Settings (env-backed)
│   │   └── database.py         # DB session / engine
│   ├── .env.example            # Backend env template
│   ├── ensure_db.py            # Create PostgreSQL DB if missing
│   ├── start.sh                # One-command backend start
│   └── requirements.txt
├── frontend/
│   ├── app/                    # Next.js App Router
│   ├── components/             # React components
│   ├── lib/                    # API client, constants, providers
│   ├── .env.example            # Frontend env template
│   └── public/
├── docs/
│   ├── SETUP.md                # Setup guide (backend + frontend)
│   ├── APP-ARCHITECTURE.md     # Application architecture
│   └── DB-ARCHITECTURE.md      # Database schema and relations
└── README.md
```

## 🔌 Adding New Data Sources

To add a new data source in the Python backend:

1. **Create a new data source class** in `backend/app/services/data_sources/`, extending `BaseDataSource`:

```python
from app.services.data_sources.base import BaseDataSource, DataSourceResult


class NewDataSource(BaseDataSource):
    def get_type(self) -> str:
        # Unique key used in the manager, e.g. "new-source"
        return "new-source"

    async def _on_initialize(self) -> None:
        # Optional: warm up clients, read config, etc.
        pass

    async def is_available(self) -> bool:
        # Return False to temporarily disable this source
        return True

    async def fetch_data(self, params: dict | None = None) -> list[DataSourceResult]:
        # Fetch from external API or generate mock data
        payload = {"example": "value"}
        return [self._create_result(payload)]
```

2. **Register it with the `DataSourceManager`** in `backend/app/services/data_sources/manager.py`:

```python
from app.services.data_sources.new_source import NewDataSource

# inside DataSourceManager.initialize()
new_source = NewDataSource()
await new_source.initialize({})
self._sources[new_source.get_type()] = new_source
```

3. The agent can now fetch it by type (e.g. `["weather", "new-source"]`) and include it in the LLM analysis.

## 🎨 UI Features

- **Responsive Design**: Works on all screen sizes
- **Dark Mode**: Automatic dark mode support
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Loading States**: Smooth loading indicators
- **Error Handling**: Graceful error messages

## 📝 Notes

- The system works with mock data if API keys are not configured.
- Database schema is auto-synced in development mode.
- Agent runs **on demand** when `/agent/trigger` is called (e.g. from the dashboard). You can wire this into an external scheduler or cron if you want fully automatic cycles.
- All AI analysis uses Anthropic Claude or another configured LLM provider (fallback to mock if API key is not set).

## 🤝 Contributing

This is a hackathon project. Feel free to extend and improve!

## 📄 License

MIT
