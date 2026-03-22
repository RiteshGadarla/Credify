from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, deps, fact_check, history, ai_detection, process_text
from app.utils.mongo import connect_to_mongo, close_mongo_connection
from app.core.config import settings
from app.utils.logger import logger
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title=settings.PROJECT_NAME)

# CORS
origins = [
    "http://localhost:5173", # Vite
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

# Protected route example 
@app.get("/me")
async def read_users_me(current_user: dict = Depends(deps.get_current_user)):
    return current_user

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
