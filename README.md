# Weather Agent API — Supply Chain Risk (Manufacturing)

Supply chain weather risk by location (pincode + country code). WeatherAPI.com, LangGraph, Ollama.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Set WEATHER_API_KEY in .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/v1/health
- Weather risk: `GET /api/v1/weather/risk?pincode=110001&country_code=IN`

## Env

| Variable | Default |
|----------|---------|
| WEATHER_API_KEY | required |
| OLLAMA_BASE_URL | http://localhost:11434 |
| OLLAMA_MODEL | llama3.2 |

## Response

`location`, `weather`, `risk` (overall_level, overall_score, factors, primary_concerns, suggested_actions), `agent_summary` (Ollama).
