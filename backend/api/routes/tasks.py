"""Tasks API Routes."""
from math import ceil
from typing import Optional

from fastapi import APIRouter, Query

from core.utils import error_response, success_response
from schemas.script_schema import TaskCreateRequest, TaskDetailResponse, TaskListResponse, TaskPagination, TaskUpdateRequest
from services.script_service import ScriptService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", summary="获取任务列表")
async def get_tasks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
):
    tasks = await ScriptService.list_all_tasks(status=status, project_id=project_id)
    total = len(tasks)
    pages = ceil(total / size) if total else 0
    start = (page - 1) * size
    end = start + size
    payload = TaskListResponse(
        tasks=tasks[start:end],
        pagination=TaskPagination(page=page, size=size, total=total, pages=pages),
    )
    return success_response(data=payload.model_dump(mode="json"))


@router.get("/{task_id}", summary="获取任务详情")
async def get_task(task_id: str):
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)
    item = await ScriptService.serialize_task(task)
    if not item:
        return error_response(message="关联剧本不存在", code=404)
    return success_response(data=TaskDetailResponse(task=item).model_dump(mode="json"))


@router.post("", summary="创建任务")
async def create_task(request: TaskCreateRequest):
    script = await ScriptService.get_script(request.script_id)
    if not script:
        return error_response(message="剧本不存在", code=404)
    task = await ScriptService.create_processing_task(request.script_id, request.project_id)
    item = await ScriptService.serialize_task(task)
    if not item:
        return error_response(message="任务创建失败", code=500)
    return success_response(data=TaskDetailResponse(task=item).model_dump(mode="json"), message="任务创建成功")


@router.put("/{task_id}", summary="更新任务")
async def update_task(task_id: str, request: TaskUpdateRequest):
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)
    if request.status is None:
        item = await ScriptService.serialize_task(task)
        return success_response(data=TaskDetailResponse(task=item).model_dump(mode="json"), message="任务信息未变更")
    return error_response(message="当前仅支持系统内部更新任务状态", code=400)


@router.delete("/{task_id}", summary="删除任务")
async def delete_task(task_id: str):
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)
    deleted = await ScriptService.delete_task(task_id)
    if not deleted:
        return error_response(message="任务不存在", code=404)
    return success_response(data={"task_id": task_id}, message="任务删除成功")


@router.post("/{task_id}/retry", summary="重试任务")
async def retry_task(task_id: str):
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)
    retried_task = await ScriptService.create_processing_task(task.script_id, task.project_id)
    item = await ScriptService.serialize_task(retried_task)
    if not item:
        return error_response(message="重试任务创建失败", code=500)
    return success_response(data=TaskDetailResponse(task=item).model_dump(mode="json"), message="重试任务已创建")


@router.get("/queues", summary="获取队列状态")
async def get_queues():
    tasks = await ScriptService.list_all_tasks()
    return success_response(data={
        "queues": [{
            "name": "script-processing",
            "pending": len([task for task in tasks if task.status == "queued"]),
            "running": len([task for task in tasks if task.status == "running"]),
            "failed": len([task for task in tasks if task.status == "failed"]),
        }]
    })


@router.get("/logs", summary="获取任务日志")
async def get_logs(task_id: Optional[str] = Query(None), page: int = Query(1, ge=1), size: int = Query(50, ge=1, le=200)):
    logs = []
    if task_id:
        task = await ScriptService.get_task(task_id)
        if task and task.step_results:
            logs = [{"step": key, "payload": value} for key, value in task.step_results.items()]
    return success_response(data={
        "logs": logs,
        "pagination": {
            "page": page,
            "size": size,
            "total": len(logs),
            "pages": ceil(len(logs) / size) if logs else 0,
        },
    })
