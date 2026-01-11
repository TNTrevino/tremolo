import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import api

# Load environment variables from .env file
load_dotenv()

# Get configuration from environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

app = FastAPI(
    title="Music21 Microservice",
    description=(
        "FastAPI microservice for generating music exercises using music21"
    ),
    version="2.0.0",
    debug=DEBUG,
)

# CORS middleware configuration
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Common React dev server
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

# Allow additional origins from environment variable
env_origins = os.getenv("ALLOWED_ORIGINS", "")
if env_origins:
    origins.extend(
        [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/music")
