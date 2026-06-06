"""
API package.
Contains all API-related modules including routes.
"""
from .routes import (
    text_router,
    workbench_router,
    assets_router,
    tasks_router,
    insights_router,
    dashboard_router,
    settings_router,
    script_router,
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
]
