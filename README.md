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
  - `schemas/`: Pydantic data models (DTOs).
  - `models/`: Database collections/models.
  - `utils/`: High-performance utility modules (Logger, Auth, Gemini, Mongo).
- **Async Database Driver:** Uses `motor` for high-performance MongoDB interactions.
- **Security:** JWT Authentication with `python-jose` and `passlib` (bcrypt).
- **AI Integration:** Seamless connection to Google Gemini models for analysis.


#### Frontend (React + Vite)

- **Light Theme UI:** A clean, modern aesthetic using premium blue accents.
- **Context API:** Global authentication state management via `AuthContext`.
- **Protected Routes:** Dashboard access restricted to authenticated users.
- **Animations:** Smooth transitions using `framer-motion`.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Axios, Framer Motion, Lucide Icons
- **Backend:** FastAPI, Uvicorn, Motor (MongoDB), Pydantic
- **Auth:** JWT, Google OAuth 2.0
- **Database:** MongoDB


Developed with ❤️ by Tristar.
