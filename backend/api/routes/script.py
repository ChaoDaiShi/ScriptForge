"""
Script Processing API Routes.
Handles script creation, processing, and export.
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from typing import Optional, Dict, Any
from schemas.script_schema import (
    Script, ScriptType, ProcessingTask, ProcessingStatus, ScriptCreateRequest
)
from core.utils import success_response, error_response
from services.script_service import ScriptService

router = APIRouter(prefix="/api/scripts", tags=["scripts"])


@router.post("", summary="创建剧本")
async def create_script(request: ScriptCreateRequest):
    """
    创建新剧本
    - title: 剧本标题
    - type: 剧本类型（feature_film 或 short_film）
    - text: 原始文本
    """
    try:
        script = await ScriptService.create_script(request)
        return success_response(data=script.model_dump(mode="json"), message="剧本创建成功")
    except Exception as e:
        return error_response(message=str(e), code=500)


@router.get("", summary="获取剧本列表")
async def list_scripts(
    type: Optional[ScriptType] = Query(None, description="剧本类型筛选")
):
    """
    获取剧本列表
    - type: 可选，按类型筛选
    """
    scripts = await ScriptService.list_scripts(type)
    return success_response(data=[s.model_dump(mode="json") for s in scripts])


@router.get("/{script_id}", summary="获取剧本详情")
async def get_script(script_id: str):
    """
    获取单个剧本详情
    """
    script = await ScriptService.get_script(script_id)
    if not script:
        return error_response(message="剧本不存在", code=404)
    return success_response(data=script.model_dump(mode="json"))


@router.delete("/{script_id}", summary="删除剧本")
async def delete_script(script_id: str):
    """
    删除剧本及其关联数据
    """
    success = await ScriptService.delete_script(script_id)
    if not success:
        return error_response(message="剧本不存在", code=404)
    return success_response(message="剧本删除成功")


@router.post("/{script_id}/process", summary="启动剧本处理流程")
async def start_processing(script_id: str, background_tasks: BackgroundTasks):
    """
    启动剧本异步处理流程
    返回任务ID，可通过该ID查询处理进度
    """
    try:
        script = await ScriptService.get_script(script_id)
        if not script:
            return error_response(message="剧本不存在", code=404)
        
        task = await ScriptService.create_processing_task(script_id)
        
        # 后台任务处理
        background_tasks.add_task(ScriptService.process_script, script_id, task.id)
        
        return success_response(
            data=task.model_dump(mode="json"),
            message="处理任务已启动"
        )
    except Exception as e:
        return error_response(message=str(e), code=500)


@router.get("/{script_id}/tasks", summary="获取剧本处理任务列表")
async def get_tasks(script_id: str):
    """
    获取剧本的所有处理任务
    """
    tasks = await ScriptService.get_tasks(script_id)
    return success_response(data=[t.model_dump(mode="json") for t in tasks])


@router.get("/tasks/{task_id}", summary="获取单个处理任务")
async def get_task(task_id: str):
    """
    获取单个处理任务详情（含进度）
    """
    task = await ScriptService.get_task(task_id)
    if not task:
        return error_response(message="任务不存在", code=404)
    return success_response(data=task.model_dump(mode="json"))


@router.get("/{script_id}/export/json", summary="导出剧本为JSON格式")
async def export_json(script_id: str):
    """
    导出剧本为JSON格式
    """
    try:
        json_data = await ScriptService.export_json(script_id)
        return success_response(data=json_data)
    except ValueError as e:
        return error_response(message=str(e), code=404)
    except Exception as e:
        return error_response(message=str(e), code=500)


@router.get("/{script_id}/export/yaml", summary="导出剧本为YAML格式")
async def export_yaml(script_id: str):
    """
    导出剧本为YAML格式
    """
    try:
        yaml_data = await ScriptService.export_yaml(script_id)
        return success_response(data={"yaml": yaml_data})
    except ValueError as e:
        return error_response(message=str(e), code=404)
    except Exception as e:
        return error_response(message=str(e), code=500)
