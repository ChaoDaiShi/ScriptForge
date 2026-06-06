"""
API routes package.
Contains all the API endpoint routes for the ScriptForge backend.
"""
from .text_deal import router as text_router
from .workbench import router as workbench_router
from .assets import router as assets_router
from .tasks import router as tasks_router
from .insights import router as insights_router
from .dashboard import router as dashboard_router
from .settings import router as settings_router
from .script import router as script_router

__all__ = [
    "text_router",
    "workbench_router",
    "assets_router",
    "tasks_router",
    "insights_router",
    "dashboard_router",
    "settings_router",
    "script_router",
]
