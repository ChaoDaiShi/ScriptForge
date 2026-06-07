import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

sys.path.append(str(Path(__file__).parent))

from api import (
    assets_router,
    auth_router,
    dashboard_router,
    insights_router,
    projects_router,
    script_router,
    settings_router,
    tasks_router,
    text_router,
    workbench_router,
)
from core.database import probe_supabase

app = FastAPI(title="ScriptForge API", version="0.2.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(text_router)
app.include_router(workbench_router)
app.include_router(assets_router)
app.include_router(tasks_router)
app.include_router(insights_router)
app.include_router(dashboard_router)
app.include_router(settings_router)
app.include_router(script_router)
app.include_router(auth_router)
app.include_router(projects_router)


def service_payload() -> dict:
    return {
        "service": "scriptforge-backend",
        "status": "ok",
        "database": probe_supabase(),
        "endpoints": [
            "/health",
            "/api/health",
            "/api/auth/*",
            "/api/projects/*",
            "/api/text/*",
            "/api/workbench/*",
            "/api/assets/*",
            "/api/tasks/*",
            "/api/insights/*",
            "/api/dashboard/*",
            "/api/settings/*",
            "/api/scripts/*",
        ],
    }


@app.get("/")
def root():
    return service_payload()


@app.get("/health")
@app.get("/api/health")
def health():
    return {**service_payload()}
