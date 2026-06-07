"""API package."""
from .routes import (
    text_router,
    workbench_router,
    assets_router,
    tasks_router,
    insights_router,
    dashboard_router,
    settings_router,
    script_router,
    auth_router,
    projects_router,
)

__all__ = [
    "text_router",
    "workbench_router",
    "assets_router",
    "tasks_router",
    "insights_router",
    "dashboard_router",
    "settings_router",
    "script_router",
    "auth_router",
    "projects_router",
]
