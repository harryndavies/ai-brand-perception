# Perception AI

A brand intelligence platform that analyses how brands are perceived using Claude AI. It generates comprehensive reports covering sentiment analysis, brand pillar identification, competitive positioning, and historical trend tracking — all from a single API call.

## Architecture

```
                         +-------------------+
                         |    Browser/UI     |
                         |  React + Vite     |
                         +--------+----------+
                                  |
                             HTTP / SSE
                                  |
                         +--------v----------+
                         |      nginx        |
                         |  (reverse proxy)  |
                         +--------+----------+
                                  |
                           /api/* |
                                  |
                         +--------v----------+
                         |  FastAPI Server   |
                         |  (API + Auth)     |
                         +---+----------+----+
                             |          |
                  POST /reports    SSE /stream
                  dispatches task   pub/sub
                             |          |
                         +---v----------v----+
                         |      Redis        |
                         | (broker + pubsub) |
                         +---+----------+----+
                             |          ^
                      task queue     progress
                             |      updates
                         +---v----------+----+
                         |  Celery Worker    |
                         |  (decrypts user   |
                         |   API key)        |
                         +--------+----------+
                                  |
                         +--------v----------+
                         |   Claude API      |
                         |  (single call,    |
                         |   3 perspectives) |
                         +--------+----------+
                                  |
                         +--------v----------+
                         |  Aggregate &      |
                         |  Persist          |
                         +--------+----------+
                                  |
                         +--------v----------+
                         |    MongoDB        |
                         | (users, reports)  |
                         +-------------------+
```

## User Flow

```
  +------------------+     +------------------+     +------------------+
  |   Sign Up /      |     |   Add Anthropic  |     |   Click "New     |
  |   Log In         +---->+   API Key        +---->+   Analysis"      |
  |                  |     |   (sidebar icon)  |     |   (modal)        |
  +------------------+     +------------------+     +--------+---------+
                                                             |
                                                    Enter brand name
                                                    + competitors
                                                             |
                                                    +--------v---------+
                                                    |   Submit Form    |
                                                    +--------+---------+
                                                             |
                           +--------------------+            |
                           |  SSE connection    |<-----------+
                           |  opens, shows      |   API creates report,
                           |  progress bar      |   queues Celery task
                           +--------+-----------+
                                    |
                           Worker picks up task,
                           decrypts user's API key,
                           calls Claude API
                                    |
                           +--------v-----------+
                           |  Analysis complete |
                           |  Modal closes,     |
                           |  navigates to      |
                           |  report page       |
                           +--------+-----------+
                                    |
                           +--------v-----------+
                           |  Interactive       |
                           |  report with       |
                           |  pillars, charts,  |
                           |  competitor map,   |
                           |  sentiment trend   |
                           +--------------------+
```

## Features

- **Single-call AI analysis** -- One Claude API call returns brand perception, news sentiment, and competitor analysis in a structured JSON response
- **Bring your own key** -- Users provide their own Anthropic API key, encrypted at rest with Fernet (AES-128) using a dedicated encryption key
- **Event-driven processing** -- Celery workers consume analysis jobs from a Redis-backed message queue
- **Real-time progress** -- Server-Sent Events deliver live updates via Redis pub/sub (no polling)
- **Brand pillar extraction** -- Identifies and scores core brand attributes with confidence levels
- **Sentiment scoring** -- Quantifies brand perception on a -1.0 to 1.0 scale across multiple dimensions
- **Competitor positioning** -- Maps brands against competitors on premium and lifestyle axes
- **Historical trends** -- Charts real sentiment data from past analyses (not simulated)
- **Input validation & rate limiting** -- Pydantic validation on all inputs, Redis-backed rate limiting (5 analyses/min per user)
- **Security hardening** -- Separate keys for JWT signing and encryption, bcrypt password hashing, CORS configuration via env vars

## Tech Stack

### Frontend

- React 19 + TypeScript
- Vite 6
- Tailwind CSS v4
- Zustand (state management)
- TanStack React Query (server state)
- React Router v7
- Recharts (data visualisation)
- shadcn/ui + Base UI components

### Backend

- FastAPI (Python 3.12)
- Celery (task queue)
- Redis (message broker + pub/sub progress)
- MongoDB via Motor (async) + PyMongo (sync)
- Anthropic SDK (Claude)
- Fernet encryption (cryptography)
- JWT authentication (python-jose + bcrypt)
- Uvicorn

### Infrastructure

- Docker + Docker Compose
- nginx (reverse proxy + SPA routing)
- GitHub Actions CI (tests, type-check, build, Docker)

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/harryndavies/ai-brand-perception.git
   cd ai-brand-perception
   ```

2. **Configure environment variables**

   Create a `.env` file in the project root:

   ```
   SECRET_KEY=your-jwt-signing-secret
   ENCRYPTION_KEY=your-fernet-encryption-key
   ```

   Generate a secure encryption key:

   ```bash
   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```

   > **Note:** No server-side Anthropic API key is needed. Each user provides their own key through the UI, which is encrypted and stored in the database.

3. **Start all services**

   ```bash
   docker compose up --build
   ```

   This starts:
   - **Frontend** (nginx) -- [http://localhost:3000](http://localhost:3000)
   - **Backend** (FastAPI) -- [http://localhost:8000](http://localhost:8000)
   - **Worker** (Celery) -- processes analysis jobs
   - **MongoDB** -- document database
   - **Redis** -- message broker and pub/sub progress

4. **Create an account and add your API key**

   Sign up at [http://localhost:3000](http://localhost:3000), then click the key icon in the sidebar to add your [Anthropic API key](https://console.anthropic.com/).

### Running Tests

```bash
# Frontend (Vitest)
npm run test:frontend

# Backend (pytest)
npm run test:backend

# Both
npm run test
```

## Project Structure

```
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf              # Reverse proxy + SPA config
│   └── src/
│       ├── components/         # UI components (dialogs, report charts, layout)
│       ├── pages/              # Route pages (dashboard, reports, login, signup)
│       ├── stores/             # Zustand stores (auth)
│       ├── lib/                # API client and utilities
│       └── types/              # TypeScript type definitions
├── backend/
│   ├── Dockerfile
│   └── app/
│       ├── worker.py           # Celery app configuration
│       ├── tasks.py            # Analysis Celery task (single Claude call)
│       ├── models/             # Pydantic models (user, report)
│       ├── routes/             # API endpoints (auth, reports)
│       ├── services/           # SSE streaming via Redis pub/sub
│       ├── middleware.py        # Correlation ID + request logging
│       └── core/               # Config, database, auth, encryption, logging, progress
├── docker-compose.yml          # Full stack orchestration
├── .github/workflows/ci.yml   # CI pipeline
└── package.json                # Workspace root with dev scripts
```

## How It Works

1. User signs up and adds their Anthropic API key (encrypted with Fernet, stored in MongoDB)
2. User opens the "New Analysis" modal, enters a brand name and optional competitors
3. The API server validates input, checks rate limits, creates a report record, and dispatches a Celery task
4. Redis progress state is seeded immediately so the SSE stream has data before the worker starts
5. The Celery worker decrypts the user's API key and makes a single Claude API call with a structured prompt covering brand perception, news sentiment, and competitor analysis
6. Progress updates are published via Redis pub/sub -- the SSE stream pushes them to the frontend in real time
7. Results are aggregated, historical trend data is built from past analyses of the same brand, and the report is persisted to MongoDB
8. The frontend navigates to the report page with interactive charts and tabbed views

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Register a new user |
| `POST` | `/api/auth/login` | Log in |
| `GET` | `/api/auth/me` | Get current user (includes `has_api_key`) |
| `PUT` | `/api/auth/api-key` | Save encrypted Anthropic API key |
| `DELETE` | `/api/auth/api-key` | Remove stored API key |
| `GET` | `/api/reports` | List reports for current user |
| `POST` | `/api/reports` | Create analysis (requires API key, rate limited) |
| `GET` | `/api/reports/:id` | Get report details |
| `GET` | `/api/reports/:id/stream` | SSE stream for analysis progress |
| `GET` | `/api/health` | Health check |

## Security

- **API keys** are encrypted at rest using Fernet (AES-128-CBC) with a dedicated `ENCRYPTION_KEY`, separate from the JWT `SECRET_KEY`
- **Passwords** are hashed with bcrypt
- **JWT tokens** expire after 7 days
- **Input validation** enforced via Pydantic (brand length, competitor count, password complexity)
- **Rate limiting** at 5 analyses per 60 seconds per user via Redis
- **CORS origins** configurable via `CORS_ORIGINS` env var
- **Production guards** -- `SECRET_KEY` and `ENCRYPTION_KEY` must be explicitly set when `ENV=production`
