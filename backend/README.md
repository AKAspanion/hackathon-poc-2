# Supply Chain Agent API (FastAPI)

Backend API for the Predictive Supply Chain Agent system. Includes a **Trend Insights Agent** that reads supplier/material/global data from an Excel sheet, fetches real-time news and market trends, and uses an LLM (Anthropic, OpenAI, or Ollama) to generate predictive, actionable insights for manufacturers.

## Requirements

- **Python 3.11 or 3.12** (3.14 may fail on `pydantic-core` build)
- PostgreSQL (same DB as Node backend)
- Optional: `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` or Ollama for LLM analysis
- Optional: `NEWS_API_KEY` for live news fetching (falls back to rich mock data)

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with DB credentials and at least one LLM key
```

## Run

```bash
# From backend/ with venv activated — recommended
./start.sh

# Or manually
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Default port is **8000**. Health check: `GET http://localhost:8000/health`.

Interactive docs: `http://localhost:8000/docs`

---

## Trend Insights Agent

### What it does

1. Reads **Suppliers**, **Materials**, and **Global** sheets from an Excel file.
2. Builds targeted search queries per material, supplier, and global macro trend.
3. Fetches live news/trend signals via **NewsAPI** (or uses built-in mock articles if no key).
4. Sends all context to the configured **LLM** (Anthropic / OpenAI / Ollama).
5. Parses the LLM's structured JSON output into **TrendInsight** records persisted to PostgreSQL.
6. Runs on a configurable **background schedule** (default: every 60 minutes) and is also triggerable on demand via API.

### Excel file format

Place your Excel file at `data/mock_suppliers_demo.xlsx` (or set `TREND_AGENT_EXCEL_PATH`).

Required sheets and columns:

**Suppliers** sheet
| Column | Required | Example |
|---|---|---|
| supplier_id | yes | S001 |
| name | yes | SteelCore Industries |
| region | no | Asia Pacific |
| country | no | China |
| city | no | Shanghai |
| materials | no | steel, iron ore |
| risk_score | no | 72 |
| lead_time_days | no | 28 |
| annual_spend_usd | no | 4500000 |

**Materials** sheet
| Column | Required | Example |
|---|---|---|
| material_name | yes | steel |
| category | no | Metal |
| criticality | no | high |
| price_volatility | no | medium |
| avg_lead_time_days | no | 25 |
| substitute_available | no | yes |

**Global** sheet
| Column | Required | Example |
|---|---|---|
| macro_trend | yes | Red Sea shipping disruptions |
| region | no | Middle East / Europe |
| severity | no | high |
| time_horizon | no | short-term |

A fully populated demo file is already included at `data/mock_suppliers_demo.xlsx`.

### LLM providers

| Provider | Env var to set | Config value |
|---|---|---|
| **Anthropic** (default) | `ANTHROPIC_API_KEY` | `LLM_PROVIDER=anthropic` |
| **OpenAI** | `OPENAI_API_KEY` | `LLM_PROVIDER=openai` |
| **Ollama** (local) | — (needs Ollama running) | `LLM_PROVIDER=ollama` |
| **Mock** (no key needed) | — | any (falls back if no keys set) |

---

## API Reference

### Public endpoints
| Method | Path | Description |
|---|---|---|
| GET | `/` | Root |
| GET | `/health` | Health check |
| POST | `/oems/register` | Register a new OEM (returns JWT) |
| POST | `/oems/login` | Login (returns JWT) |

### Protected endpoints (Bearer JWT required)
| Method | Path | Description |
|---|---|---|
| GET | `/risks` | List supply chain risks |
| GET | `/opportunities` | List opportunities |
| GET | `/mitigation-plans` | List mitigation plans |
| GET | `/suppliers` | List suppliers |
| GET | `/agent/status` | Agent status |
| POST | `/agent/trigger` | Trigger full agent analysis |
| **POST** | **`/trend-insights/run`** | **Run trend-insights agent** |
| **GET** | **`/trend-insights`** | **List persisted insights** |
| **GET** | **`/trend-insights/{id}`** | **Get single insight** |

---

## Demo flow (quick start)

### 1. Start the backend

```bash
cd backend
./start.sh
```

### 2. Register and get a JWT

```bash
curl -s -X POST http://localhost:8000/oems/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Acme Motors", "email": "demo@acme.com", "password": "demo1234"}' \
  | python3 -m json.tool
```

Copy the `token` from the response.

### 3. Run the trend-insights agent

```bash
export TOKEN="paste_your_jwt_here"

curl -s -X POST http://localhost:8000/trend-insights/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oem_name": "Acme Motors"}' \
  | python3 -m json.tool
```

The response includes all generated insights with scope, severity, recommended actions, and confidence scores.

### 4. Query saved insights

```bash
# All insights
curl -s http://localhost:8000/trend-insights \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Filter by scope
curl -s "http://localhost:8000/trend-insights?scope=material&severity=high" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Filter by supplier/material name
curl -s "http://localhost:8000/trend-insights?entity_name=semiconductor" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

### 5. Use a custom Excel file

```bash
curl -s -X POST http://localhost:8000/trend-insights/run \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"oem_name": "Acme Motors", "excel_path": "/absolute/path/to/suppliers.xlsx"}' \
  | python3 -m json.tool
```

---

## Scheduler

| Job | Default interval | Config key |
|---|---|---|
| Full agent cycle | Every 5 minutes | hard-coded |
| Trend insights cycle | Every 60 minutes | `TREND_AGENT_INTERVAL_MINUTES` |

Disable trend insights scheduling: `TREND_AGENT_ENABLED=false` in `.env`.
