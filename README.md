# Predictive Supply Chain Agent (Manufacturing)

A "Global Watchtower" for manufacturing logistics that continuously monitors real-time external data streams (Weather, Global News, Traffic, Market Trends) and translates raw data into specific Operational Risks or Opportunities, autonomously generating mitigation plans.

## 🎯 Project Overview

**Theme**: Predictive Supply Chain Resilience & Risk Intelligence

**Mission**: Move beyond reactive panic to proactive planning by building an intelligent agent that monitors global data streams and provides actionable insights for supply chain management.

## 🏗️ Architecture

The project is split into two separate applications:

### Backend (`/backend`)
- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **AI/ML**: LangChain, Anthropic Claude, LangGraph
- **Features**:
  - Generic data source connectors (Weather, News, Traffic, Market Trends)
  - AI-powered risk detection and opportunity identification
  - Automatic mitigation plan generation
  - RESTful API for frontend integration
  - Scheduled monitoring (every 5 minutes)

### Frontend (`/frontend`)
- **Framework**: Next.js 16 with App Router
- **Styling**: TailwindCSS
- **State Management**: TanStack Query
- **Features**:
  - Real-time dashboard
  - Agent status monitoring
  - Risks and opportunities visualization
  - Mitigation plans display
  - Auto-refresh every 30 seconds

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
yarn install

# Set up PostgreSQL database
createdb supply_chain

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration:
# - Database credentials
# - ANTHROPIC_API_KEY (for AI analysis)
# - Optional: WEATHER_API_KEY, NEWS_API_KEY

# Run migrations (auto-sync in development)
yarn start:dev
```

The backend will run on `http://localhost:3001`

### Frontend Setup

```bash
cd frontend

# Install dependencies
yarn install

# Configure environment variables
cp .env.example .env
# Edit .env with backend URL (default: http://localhost:3001)

# Run development server
yarn dev
```

The frontend will run on `http://localhost:3000`

## 📊 Features

### Data Sources
- **Weather**: Real-time weather data (OpenWeatherMap API or mock)
- **News**: Supply chain related news (NewsAPI or mock)
- **Traffic**: Traffic and logistics data (mock, ready for real API)
- **Market**: Commodity and market trends (mock, ready for real API)

### Agent Capabilities
- **Continuous Monitoring**: Automatically monitors all data sources every 5 minutes
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

## 🔧 Configuration

### Environment Variables

#### Backend (`.env`)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=supply_chain

# API Keys
ANTHROPIC_API_KEY=your_key_here
WEATHER_API_KEY=your_key_here (optional)
NEWS_API_KEY=your_key_here (optional)

# Application
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend (`.env`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

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
yarn start:dev    # Development with hot reload
yarn build        # Production build
yarn start:prod   # Production mode
```

### Frontend
```bash
cd frontend
yarn dev          # Development server
yarn build        # Production build
yarn start        # Production server
```

## 📁 Project Structure

```
hackathon-2/
├── backend/
│   ├── src/
│   │   ├── agent/              # Agent orchestration
│   │   ├── data-sources/       # Data source connectors
│   │   ├── database/           # Database entities
│   │   ├── risks/              # Risks module
│   │   ├── opportunities/      # Opportunities module
│   │   └── mitigation-plans/   # Mitigation plans module
│   └── package.json
├── frontend/
│   ├── app/                    # Next.js app directory
│   ├── components/             # React components
│   ├── lib/                    # Utilities and API client
│   └── package.json
└── README.md
```

## 🔌 Adding New Data Sources

To add a new data source:

1. Create a new service implementing `IDataSource` interface:
```typescript
export class NewDataSourceService extends BaseDataSource {
  getType(): string {
    return 'new-source';
  }
  
  async fetchData(params?: Record<string, any>): Promise<DataSourceResult[]> {
    // Implementation
  }
  
  // ... other methods
}
```

2. Register it in `DataSourceModule`:
```typescript
@Module({
  providers: [
    // ... existing
    NewDataSourceService,
  ],
  exports: [
    // ... existing
    NewDataSourceService,
  ],
})
```

3. The agent will automatically start monitoring it!

## 🎨 UI Features

- **Responsive Design**: Works on all screen sizes
- **Dark Mode**: Automatic dark mode support
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Loading States**: Smooth loading indicators
- **Error Handling**: Graceful error messages

## 📝 Notes

- The system works with mock data if API keys are not configured
- Database schema is auto-synced in development mode
- Agent runs automatically every 5 minutes via cron job
- All AI analysis uses Anthropic Claude (fallback to mock if API key not set)

## 🤝 Contributing

This is a hackathon project. Feel free to extend and improve!

## 📄 License

MIT
