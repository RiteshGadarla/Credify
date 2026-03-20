from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .api import auth, deps
from .db.mongodb import connect_to_mongo, close_mongo_connection
from .core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

# CORS
origins = [
    "http://localhost:5173", # Vite
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

# Auth routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# Protected route example (ready for expansion)
@app.get("/me")
async def read_users_me(current_user: dict = Depends(deps.get_current_user)):
    return current_user

@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}
