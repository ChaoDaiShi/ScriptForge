"""
Core package.
Contains core utilities, configurations, and database connections.
"""
from .utils import (
    success_response,
    error_response,
    text_deal,
    remove_chapter_markers,
    remove_heading_markers,
    remove_markdown_markers,
    clean_text,
)
from .config import settings

__all__ = [
    "success_response",
    "error_response",
    "text_deal",
    "remove_chapter_markers",
    "remove_heading_markers",
    "remove_markdown_markers",
    "clean_text",
    "settings",
]
