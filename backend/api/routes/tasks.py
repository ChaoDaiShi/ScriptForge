"""
Tasks API Routes.
Handles task management and queue monitoring.
"""
from math import ceil
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from core.utils import error_response, success_response
from schemas.script_schema import (
    TaskCreateRequest,
    TaskDetailResponse,
    TaskListResponse,
    TaskPagination,
    TaskUpdateRequest,
)
from services.script_service import ScriptService

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.get("", summary="获取任务列表")
async def get_tasks(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="任务状态筛选")
):
    """
    获取任务列表（支持分页、筛选）
    前端调用场景：显示任务看板的所有任务
    """
    tasks = await ScriptService.list_all_tasks(status=status)
    total = len(tasks)
    pages = ceil(total / size) if total else 0
    start = (page - 1) * size
    end = start + size
    payload = TaskListResponse(
        tasks=tasks[start:end],
        pagination=TaskPagination(
            page=page,
            size=size,
            total=total,
            pages=pages,
        ),
    )
    return success_response(data=payload.model_dump(mode="json"))


@router.get("/{task_id}", summary="获取任务详情")
async def get_task(task_id: str):
    """
    获取单个任务详情
    前端调用场景：查看某个任务的详细信息
    """
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)

    item = await ScriptService.serialize_task(task)
    if not item:
        return error_response(message="关联剧本不存在", code=404)

    payload = TaskDetailResponse(task=item)
    return success_response(data=payload.model_dump(mode="json"))


@router.post("", summary="创建任务")
async def create_task(request: TaskCreateRequest):
    """
    创建新任务
    前端调用场景：用户提交批处理任务
    """
    script = await ScriptService.get_script(request.script_id)
    if not script:
        return error_response(message="剧本不存在", code=404)

    task = await ScriptService.create_processing_task(request.script_id)
    item = await ScriptService.serialize_task(task)
    if not item:
        raise HTTPException(status_code=500, detail="任务创建成功但序列化失败")

    return success_response(
        data=TaskDetailResponse(task=item).model_dump(mode="json"),
        message="任务创建成功",
    )


@router.put("/{task_id}", summary="更新任务")
async def update_task(
    task_id: str,
    request: TaskUpdateRequest,
):
    """
    更新任务信息
    前端调用场景：修改任务的参数、优先级等
    """
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)

    updates = {}
    if request.status is not None:
        updates["status"] = request.status

    if updates:
        return error_response(message="当前仅支持读取任务状态，暂不支持直接修改", code=400)

    item = await ScriptService.serialize_task(task)
    if not item:
        return error_response(message="关联剧本不存在", code=404)

    return success_response(
        data=TaskDetailResponse(task=item).model_dump(mode="json"),
        message="任务信息未变更",
    )


@router.delete("/{task_id}", summary="删除任务")
async def delete_task(task_id: str):
    """
    删除任务
    前端调用场景：取消不需要的任务
    """
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)

    script = await ScriptService.get_script(task.script_id)
    if script:
        await ScriptService.delete_script(task.script_id)

    return success_response(data={"task_id": task_id}, message="任务删除成功")


@router.post("/{task_id}/retry", summary="重试任务")
async def retry_task(task_id: str):
    """
    重试失败任务
    前端调用场景：用户点击"重试"按钮
    """
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)

    retried_task = await ScriptService.create_processing_task(task.script_id)
    item = await ScriptService.serialize_task(retried_task)
    if not item:
        return error_response(message="重试任务创建失败", code=500)

    return success_response(
        data=TaskDetailResponse(task=item).model_dump(mode="json"),
        message="重试任务已创建",
    )


@router.get("/queues", summary="获取队列状态")
async def get_queues():
    """
    获取队列状态
    前端调用场景：显示队列健康状况
    """
    return success_response(data={"queues": []})


@router.get("/logs", summary="获取任务日志")
async def get_logs(
    task_id: Optional[str] = Query(None, description="任务ID筛选"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200)
):
    """
    获取任务日志
    前端调用场景：查看处理日志详情
    """
    return success_response(data={
        "logs": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })
