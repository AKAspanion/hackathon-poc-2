## Shipping Agent - Shipping Risk Intelligence Service

This service is a FastAPI-based backend that evaluates shipping risk for manufacturing suppliers using multiple operational factors (mode, distance, transit time, port congestion, historical delays, redundancy).

### Tech Stack
- **FastAPI** for the web framework
- **PostgreSQL** for persistence
- **SQLAlchemy** for ORM
- **Pydantic v2** for schemas and settings

### Setup

All steps are run from inside the `shipping_agent/` directory.

1. **Create and activate virtual environment**

```bash
cd shipping_agent
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

2. **Install dependencies**

```bash
pip install -r requirements.txt
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and set `DATABASE_URL` for your PostgreSQL instance.

```bash
cp .env.example .env
```

If you get **"role 'postgres' does not exist"**: on macOS (e.g. Homebrew PostgreSQL) the default superuser is your system username. In `.env`, set for example:

```bash
DATABASE_URL=postgresql://YOUR_MAC_USERNAME@localhost:5432/shipping_agent
```

Create the database (if it doesn't exist):

```bash
createdb shipping_agent
```

**Using DBeaver:** Create a PostgreSQL connection in DBeaver, then create a database named `shipping_agent`. In `.env`, set `DATABASE_URL` using the same host, port, user and password (e.g. `postgresql://user:password@localhost:5432/shipping_agent` or `@dbbrever` if that’s your host).

4. **Run the API server**

Tables are created on startup. From inside `shipping_agent/`:

```bash
uvicorn app.main:app --reload
```

Or:

```bash
python run.py
```

### Testing the connection

1. **Health check:** `GET http://localhost:8000/` → `{"status":"ok","service":"..."}`  
2. **Create a supplier:** `POST http://localhost:8000/suppliers/` with the example JSON below → 201 and supplier object.  
3. **List suppliers:** `GET http://localhost:8000/suppliers/` → list including the new supplier.  
4. **Run shipping risk:** `POST http://localhost:8000/shipping-risk/1` (use the supplier `id` from step 2) → risk score, level, factors and recommended actions.

Use the API docs at **http://localhost:8000/docs** to run these from the browser.

### Key Endpoints

- `POST /suppliers/` - create supplier
- `GET /suppliers/` - list suppliers
- `GET /suppliers/{supplier_id}` - get supplier
- `PUT /suppliers/{supplier_id}` - update supplier
- `DELETE /suppliers/{supplier_id}` - delete supplier
- `POST /shipping-risk/{supplier_id}` - run risk engine for one supplier, persist assessment, return JSON
- `POST /shipping-risk/run-all` - run risk engine for all suppliers, persist assessments, return list of results

### Example Supplier Payload

```json
{
  "name": "Chennai Chip Supplier",
  "material_name": "Semiconductor Chips",
  "location_city": "Chennai",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "shipping_mode": "Sea",
  "distance_km": 350,
  "avg_transit_days": 3,
  "historical_delay_percentage": 18,
  "port_used": "Chennai Port",
  "alternate_route_available": false,
  "is_critical_supplier": true
}
```

### Running in the Swarm

This service is designed to act as an independent **Shipping Intelligence Service** that can later be combined with:
- a **Weather Agent** service
- a **News Agent** service
- a higher-level **Aggregator** service

The risk result JSON is structured to be easily consumed by other agents.
