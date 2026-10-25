from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.core.config import settings

router = APIRouter()

@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "connected"
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"degraded: {str(e)}"

    return {
        "status": "operational",
        "service": "A24 Healthcare Multi-Agent Backend",
        "database": db_status,
        "cloudflare_proxy": settings.CLOUDFLARE_GEMINI_PROXY_URL,
        "agents": [
            {"id": "triage", "name": "CLOVER", "role": "Report Ingest", "status": "active"},
            {"id": "pharma", "name": "FLOWER", "role": "Pharmacology Advisor", "status": "active"},
            {"id": "kinesio", "name": "SQUARE", "role": "Kinesiology Coach", "status": "active"},
            {"id": "concierge", "name": "GHOST", "role": "Doctor Scout & Scheduler", "status": "active"},
        ]
    }
