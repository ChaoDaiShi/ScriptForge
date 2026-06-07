from fastapi import APIRouter, Query

from core.utils import error_response, success_response
from schemas.script_schema import DistributionActionRequest, DistributionCreateRequest, ExportFormat, ProjectCreateRequest, ProjectUpdateRequest
from services import ProjectService

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", summary="项目列表")
async def list_projects(user_id: str | None = Query(default=None)):
    projects = await ProjectService.list_projects(user_id)
    return success_response(data={"projects": [project.model_dump(mode="json") for project in projects]})


@router.post("", summary="创建项目")
async def create_project(request: ProjectCreateRequest):
    project = await ProjectService.create_project(request)
    return success_response(data=project.model_dump(mode="json"), message="项目创建成功")


@router.get("/{project_id}", summary="项目详情")
async def get_project(project_id: str):
    project = await ProjectService.get_project(project_id)
    if not project:
        return error_response(message="项目不存在", code=404)
    return success_response(data=project.model_dump(mode="json"))


@router.patch("/{project_id}", summary="更新项目")
async def update_project(project_id: str, request: ProjectUpdateRequest):
    project = await ProjectService.update_project(project_id, request)
    if not project:
        return error_response(message="项目不存在", code=404)
    return success_response(data=project.model_dump(mode="json"), message="项目更新成功")


@router.delete("/{project_id}", summary="删除项目")
async def delete_project(project_id: str):
    deleted = await ProjectService.delete_project(project_id)
    if not deleted:
        return error_response(message="项目不存在", code=404)
    return success_response(data={"project_id": project_id}, message="项目删除成功")


@router.get("/{project_id}/exports", summary="导出记录")
async def list_exports(project_id: str):
    exports = await ProjectService.list_exports(project_id)
    return success_response(data={"exports": [item.model_dump(mode="json") for item in exports]})


@router.post("/{project_id}/exports/{format_name}", summary="创建导出")
async def create_export(project_id: str, format_name: str, script_id: str | None = Query(default=None)):
    try:
        export_format = ExportFormat(format_name)
    except ValueError:
        return error_response(message="不支持的导出格式", code=400)
    payload = await ProjectService.create_export(project_id, script_id, export_format)
    return success_response(data=payload.model_dump(mode="json"), message="导出任务已创建")


@router.get("/{project_id}/distribution-jobs", summary="分发任务列表")
async def list_distribution_jobs(project_id: str):
    jobs = await ProjectService.list_distribution_jobs(project_id)
    return success_response(data={"jobs": [job.model_dump(mode="json") for job in jobs]})


@router.post("/{project_id}/distribution-jobs", summary="创建分发任务")
async def create_distribution_job(project_id: str, request: DistributionCreateRequest):
    if request.project_id != project_id:
        return error_response(message="project_id 不匹配", code=400)
    payload = await ProjectService.create_distribution_job(request)
    return success_response(data=payload.model_dump(mode="json"), message="分发任务已创建")


@router.post("/{project_id}/distribution-jobs/{job_id}/dispatch", summary="执行分发")
async def dispatch_distribution_job(project_id: str, job_id: str, request: DistributionActionRequest):
    payload = await ProjectService.distribute_job(job_id)
    if not payload:
        return error_response(message="分发任务不存在", code=404)
    return success_response(data={**payload.model_dump(mode="json"), "requested_platforms": [p.value for p in request.platforms]}, message="分发完成")
