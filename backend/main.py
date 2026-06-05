import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from supabase_client import probe_supabase

app = FastAPI(title="ScriptForge API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def service_payload() -> dict:
    return {
        "service": "scriptforge-backend",
        "status": "ok",
        "endpoints": ["/health", "/api/health"],
    }


@app.get("/")
def root():
    return service_payload()


@app.get("/health")
@app.get("/api/health")
def health():
    return {
        **service_payload(),
        "supabase": probe_supabase(),
    }
