# Predictive Supply Chain Agent - Backend

Backend API for the Predictive Supply Chain Agent system built with NestJS, LangGraph, LangChain, and PostgreSQL.

## Features

- **Data Source Connectors**: Generic interface for connecting to external data sources (Weather, News, Traffic, Market Trends)
- **Agent Orchestration**: AI-powered analysis using LangChain and Anthropic Claude
- **Risk Detection**: Automatic identification of supply chain risks
- **Opportunity Identification**: Detection of optimization opportunities
- **Mitigation Planning**: AI-generated mitigation plans for risks and opportunities
- **RESTful API**: Complete API for frontend integration

## Tech Stack

- **NestJS**: Backend framework
- **PostgreSQL**: Database
- **TypeORM**: ORM
- **LangChain**: LLM framework
- **Anthropic Claude**: AI model for analysis
- **LangGraph**: Agent orchestration framework (available, ready for advanced workflows)

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Set up PostgreSQL database:
```bash
createdb supply_chain
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run migrations (auto-sync in development):
```bash
npm run start:dev
```

## API Endpoints

### Agent
- `GET /agent/status` - Get agent status
- `POST /agent/trigger` - Manually trigger analysis

### Risks
- `GET /risks` - Get all risks (with optional filters: ?status=, ?severity=)
- `GET /risks/:id` - Get risk by ID
- `POST /risks` - Create risk
- `PUT /risks/:id` - Update risk
- `GET /risks/stats/summary` - Get risk statistics

### Opportunities
- `GET /opportunities` - Get all opportunities (with optional filters: ?status=, ?type=)
- `GET /opportunities/:id` - Get opportunity by ID
- `POST /opportunities` - Create opportunity
- `PUT /opportunities/:id` - Update opportunity
- `GET /opportunities/stats/summary` - Get opportunity statistics

### Mitigation Plans
- `GET /mitigation-plans` - Get all plans (with optional filters: ?riskId=, ?opportunityId=, ?status=)
- `GET /mitigation-plans/:id` - Get plan by ID
- `POST /mitigation-plans` - Create plan
- `PUT /mitigation-plans/:id` - Update plan

## Development

```bash
# Development mode with hot reload
yarn start:dev

# Production build
yarn build
yarn start:prod
```

## Data Sources

The system includes generic data source connectors:
- **Weather**: OpenWeatherMap API (or mock data)
- **News**: NewsAPI (or mock data)
- **Traffic**: Mock implementation (ready for real API integration)
- **Market**: Mock implementation (ready for real API integration)

To add a new data source, implement the `IDataSource` interface and register it in `DataSourceModule`.
