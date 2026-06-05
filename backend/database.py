"""
ScriptForge — 数据库连接模块

提供 SQLAlchemy 异步引擎和会话工厂，直连 Supabase PostgreSQL 云数据库。
"""

import os
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

# ── 数据库连接字符串 ──────────────────────────────────────────────
# 优先使用 DATABASE_URL 环境变量，否则 fallback 到从 SUPABASE_URL 拼接
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:[YOUR-PASSWORD]@db.chfraiixiyhfimgoysnj.supabase.co:5432/postgres",
)

# ── 异步引擎 ─────────────────────────────────────────────────────
engine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",  # SQL 日志，调试用
    pool_size=int(os.getenv("DB_POOL_SIZE", "10")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "20")),
)

# ── 会话工厂 ─────────────────────────────────────────────────────
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ── ORM 基类 ─────────────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ── 依赖注入：获取数据库会话 ─────────────────────────────────────
async def get_db() -> AsyncSession:  # type: ignore[misc]
    """FastAPI 依赖，每个请求创建一个独立会话，请求结束后自动关闭。"""
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()


# ── 连接检查 ─────────────────────────────────────────────────────
async def check_connection() -> dict:
    """测试数据库连通性，返回状态信息。"""
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar_one()
            return {"status": "ok", "version": version}
    except Exception as e:
        return {"status": "error", "message": str(e)}
