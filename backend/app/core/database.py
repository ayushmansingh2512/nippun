from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

Base = declarative_base()

def build_engine(url: str):
    norm_url = url.strip()
    if norm_url.startswith("postgres://"):
        norm_url = norm_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif norm_url.startswith("postgresql://") and not norm_url.startswith("postgresql+asyncpg://"):
        norm_url = norm_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    if "channel_binding" in norm_url:
        norm_url = norm_url.replace("&channel_binding=require", "").replace("?channel_binding=require&", "?").replace("?channel_binding=require", "")
    if "sslmode=require" in norm_url:
        norm_url = norm_url.replace("sslmode=require", "ssl=require")

    engine_kwargs = {
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "connect_args": {"timeout": 10.0, "command_timeout": 10.0},
    }

    eng = create_async_engine(norm_url, echo=False, **engine_kwargs)
    session_factory = async_sessionmaker(
        bind=eng,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    return eng, session_factory

engine, AsyncSessionLocal = build_engine(settings.DATABASE_URL)

async def init_db():
    async with engine.begin() as conn:
        import app.models.schema  # noqa
        await conn.run_sync(Base.metadata.create_all)
    print(" [A24 Backend] Neon PostgreSQL database connected and tables verified.")

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

