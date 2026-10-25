from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.routes_chat import router as chat_router
from app.api.routes_reports import router as reports_router
from app.api.routes_appointments import router as appointments_router
from app.api.routes_health import router as health_router
from app.api.routes_auth import router as auth_router

import asyncio

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables (Neon DB / SQLite) with timeout protection
    try:
        await asyncio.wait_for(init_db(), timeout=3.5)
        print(" [A24 Backend] Database tables initialized successfully.")
    except Exception as e:
        print(f" [A24 Backend] Database init notice: {e}")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A24-Styled Multi-Agent Healthcare Platform with Gemini Key Rotator, Neon DB, and Google Workspace Actuators",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development allow all; in production use settings.cors_origin_list
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix="/api/v1", tags=["Health"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Multi-Agent Chat"])
app.include_router(reports_router, prefix="/api/v1/reports", tags=["Medical Reports"])
app.include_router(appointments_router, prefix="/api/v1/appointments", tags=["Appointments & Calendar"])

@app.get("/")
def root():
    return {
        "title": "A24 Healthcare Multi-Agent System",
        "tagline": "Autonomous Clinical Lab Telemetry & Specialized Concierge",
        "docs_url": "/docs",
        "version": "1.0.0",
        "author": "Ayushman Singh",
        "database": "sqlite3_aiosqlite"
    }
