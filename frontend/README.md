# Predictive Supply Chain Agent - Frontend

Frontend dashboard for the Predictive Supply Chain Agent system built with Next.js, React, TypeScript, and TailwindCSS.

## Features

- **Real-time Dashboard**: View agent status, risks, opportunities, and mitigation plans
- **Auto-refresh**: Data automatically refreshes every 30 seconds
- **Manual Trigger**: Manually trigger agent analysis
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Mode**: Supports dark mode via system preferences

## Tech Stack

- **Next.js 16**: React framework with App Router
- **TypeScript**: Type safety
- **TailwindCSS**: Styling
- **TanStack Query**: Data fetching and caching
- **Axios**: HTTP client
- **date-fns**: Date formatting

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your backend API URL
```

3. Run development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles
├── components/
│   ├── AgentStatus.tsx     # Agent status component
│   ├── RisksList.tsx       # Risks list component
│   ├── OpportunitiesList.tsx # Opportunities list component
│   └── MitigationPlansList.tsx # Mitigation plans list component
└── lib/
    ├── api.ts              # API client and types
    └── providers.tsx       # TanStack Query provider
```

## Development

```bash
# Development mode
yarn dev

# Production build
yarn build
yarn start
```
