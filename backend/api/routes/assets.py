"""Assets API Routes."""
from typing import Optional

from fastapi import APIRouter, Query

from core.utils import error_response, success_response
from services import ProjectService

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", summary="获取资产列表")
async def get_assets(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    q: Optional[str] = Query(default=None),
):
    projects = await ProjectService.list_projects()
    filtered = [
        project for project in projects
        if not q or q.lower() in project.title.lower() or q.lower() in project.source_novel.lower()
    ]
    start = (page - 1) * size
    end = start + size
    return success_response(data={
        "assets": [project.model_dump(mode="json") for project in filtered[start:end]],
        "pagination": {
            "page": page,
            "size": size,
            "total": len(filtered),
            "pages": (len(filtered) + size - 1) // size,
        },
    })


@router.get("/{asset_id}", summary="获取资产详情")
async def get_asset(asset_id: str):
    project = await ProjectService.get_project(asset_id)
    if not project:
        return error_response(message="资产不存在", code=404)
    exports = await ProjectService.list_exports(asset_id)
    jobs = await ProjectService.list_distribution_jobs(asset_id)
    return success_response(data={
        "asset": project.model_dump(mode="json"),
        "exports": [item.model_dump(mode="json") for item in exports],
        "distribution_jobs": [job.model_dump(mode="json") for job in jobs],
    })
