# Credify – Fact & Claim Verification System

## 🚀 Quick Start

Follow these steps to get the project up and running.

### 1. Prerequisites

- **Node.js** (v18+)
- **Python** (v3.8+)
- **MongoDB** (Running locally or on Atlas)

### 2. Setup

Run the appropriate command for your OS in the root directory to install all dependencies and create the Python virtual environment:

#### 🐧 Linux/macOS

```bash
npm run install:linux
```

#### 🪟 Windows

```bash
npm run install:windows
```

### 3. Environment Configuration

Create `.env` files for both backend and frontend using the provided examples.

#### 🖥️ Backend (`backend/.env`)

Create this file and add the following:

```env
PROJECT_NAME=Credify
FAST_API_PORT=8000
MONGO_URI=mongodb://localhost:27017
DATABASE_NAME=credify_db
JWT_SECRET=your_super_secret_jwt_key
JWT_ALGORITHM=HS256
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
ACCESS_TOKEN_EXPIRE_MINUTES=43200
GEMINI_API_KEY=your_gemini_api_key
SERPER_API_KEY=your_serper_api_key
```

#### 🌐 Frontend (`frontend/.env`)

Create this file and add the following:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_APP_NAME=Credify
```

---

### 4. Running the Project

You can run both the frontend and backend concurrently:

#### 🐧 Execution: Linux/macOS

```bash
npm run dev:linux
```

#### 🪟 Execution: Windows

```bash
npm run dev:windows
```

Alternatively, you can run them separately:

- **Backend (Dev):** `npm run backend:linux` or `npm run backend:windows`
- **Backend (Prod):** `npm run backend:prod` (Runs with multi-worker support)
- **Frontend:** `npm run frontend`

The Backend will run on [http://localhost:8000](http://localhost:8000) (as configured in `.env`) and the Frontend on [http://localhost:5173](http://localhost:5173).

### ⚙️ Backend Runner (`run.py`)
The backend includes a dedicated `run.py` script for advanced management:
- `--env development`: Enables hot-reload and debug logging.
- `--env production`: Optimizes for performance.
- `--workers N`: Sets the number of worker processes in production mode.

---

### 🏗️ Architecture

#### Backend (FastAPI)

- **Scalable Architecture:** Modular project structure inside the `app/` subfolder:
  - `core/`: Application settings and global configuration.
  - `routers/`: API route definitions.
  - `services/`: Business logic layer separating logic from transport.
  - `models/`: Centralized Pydantic data models and Database schemas.
  - `agents/`: AI agents dedicated to processing claims and summarization.
  - `tools/`: Reusable tools (e.g. Real-Time Search) used by the agents.
  - `utils/`: High-performance utility modules (Logger, Auth, Gemini, Mongo).
- **Async Database Driver:** Uses `motor` for high-performance MongoDB interactions.
- **Security:** JWT Authentication with `python-jose` and `passlib` (bcrypt).
- **Multi-Agent System:** Advanced AI pipeline orchestrating Gemini models and Real-Time external Search APIs (Serper) to perform verifiable fact-checking, complete with token streaming.


#### Frontend (React + Vite)

- **Dashboard UI:** A clean, command-center inspired dashboard showcasing dynamic interaction, responsive metrics, and personalized user history.
- **Context API:** Global authentication state management via `AuthContext`.
- **Protected Routes:** Dashboard access restricted to authenticated users.
- **Animations:** Smooth transitions using `framer-motion`.

---

### 🤖 The Agentic Flow

Credify's core is powered by an orchestrator-driven multi-agent system that parallelizes claim verification. From user input to final output, the process involves:

1. **Claim Parser Agent**: Decomposes raw user input into distinct, structurally verifiable claims and optimal search queries.
2. **Evidence Retrieval Agent**: Interfaces with external search tools (e.g. Serper API) to gather real-world news and raw data related to the claims.
3. **Credibility Scoring Agent**: Evaluates the retrieved search results for reliability and factual consistency, ranking the best sources.
4. **Verification Agent**: Analyzes the claims specifically against the high-scored evidence to formulate an initial verdict and calculate a confidence score.
5. **Debate Agent** *(Optional)*: Engages dynamically if the system detects a `CONFLICT` or computes a low-confidence score. It synthesizes multiple perspectives to act as a logic tie-breaker.
6. **Response Agent**: Aggregates the gathered evidence and verification contexts to establish the final verifiable conclusion and reasoning.
7. **Summary Agent**: Condenses the extensive technical analysis into an easily digestible, user-friendly summary.

These agents are seamlessly managed by an orchestrator which safely runs parallel execution, resolving race conditions with atomic database updates, and synchronously streaming updates to the dashboard UI.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Axios, Framer Motion, Lucide Icons
- **Backend:** FastAPI, Uvicorn, Motor (MongoDB), Pydantic, Agentic Flow, Serper API
- **Auth:** JWT, Google OAuth 2.0
- **Database:** MongoDB


Developed with ❤️ by Tristar.
