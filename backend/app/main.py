from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, deps, fact_check, history, ai_detection, process_text, report, deepfake_detection
from app.utils.mongo import connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.utils.logger import logger
from fastapi.staticfiles import StaticFiles
import os

description = """
**Credify** is an end-to-end, agentic AI platform designed to automate the process of verifying information, analyzing media for manipulations, and detecting AI-generated content.

### Core Capabilities
*   **Multi-Agent Verification Pipeline:** Sophisticated orchestrator managing specialized agents for claim parsing, retrieval, scoring, and analysis.
*   **Media Analysis:** Deepfake and AI-manipulation detection for image-based evidence.
*   **AI Content Detection:** Identification of synthetic text patterns from models like GPT, Claude, and Llama.
*   **Professional Reporting:** Generation of detailed, verifiable PDF reports with credibility metrics.
"""

tags_metadata = [
    {"name": "auth", "description": "Authentication and User Management (JWT)"},
    {"name": "fact_check", "description": "Core Agentic Verification Pipeline"},
    {"name": "ai_detection", "description": "AI-Generated Text Identification"},
    {"name": "deepfake_detection", "description": "Media Manipulation & Deepfake Analysis"},
    {"name": "history", "description": "User History & Verification Records"},
    {"name": "report", "description": "Automated PDF Report Generation"},
    {"name": "process", "description": "Text Processing Utilities"},
]

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=description,
    version="1.0.0",
    openapi_tags=tags_metadata,
    docs_url="/docs",
    redoc_url="/redoc"
)
# CORS
origins = [
    "http://localhost:4173",
    "http://localhost:5173",
    "http://localhost:3000",
]

uploads_path = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_path, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=uploads_path), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    logger.info("Starting up FastAPI application...")
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Shutting down FastAPI application...")
    await close_mongo_connection()

# Auth routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(fact_check.router, prefix="/api/fact-check", tags=["fact_check"])
app.include_router(history.router, prefix="/api/history", tags=["history"])
app.include_router(ai_detection.router, prefix="/api/ai-detection", tags=["ai_detection"])
app.include_router(process_text.router, prefix="/api/process", tags=["process"])
app.include_router(report.router, prefix="/api/report", tags=["report"])
app.include_router(deepfake_detection.router, prefix="/api/deepfake-detection", tags=["deepfake_detection"])

# Protected route example 
@app.get("/me")
async def read_users_me(current_user: dict = Depends(deps.get_current_user)):
    return current_user

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
