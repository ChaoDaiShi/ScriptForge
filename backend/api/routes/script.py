"""Script Processing API Routes."""
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Query

from core.utils import error_response, success_response
from schemas.script_schema import ScriptType, ScriptCreateRequest, TaskDetailResponse
from services.script_service import ScriptService

router = APIRouter(prefix="/api/scripts", tags=["scripts"])


@router.post("", summary="创建剧本")
async def create_script(request: ScriptCreateRequest):
    try:
        script = await ScriptService.create_script(request)
        return success_response(data=script.model_dump(mode="json"), message="剧本创建成功")
    except Exception as error:
        return error_response(message=str(error), code=500)


@router.get("", summary="获取剧本列表")
async def list_scripts(type: Optional[ScriptType] = Query(None), project_id: Optional[str] = Query(None)):
    scripts = await ScriptService.list_scripts(type, project_id)
    return success_response(data=[script.model_dump(mode="json") for script in scripts])


@router.get("/{script_id}", summary="获取剧本详情")
async def get_script(script_id: str):
    script = await ScriptService.get_script(script_id)
    if not script:
        return error_response(message="剧本不存在", code=404)
    return success_response(data=script.model_dump(mode="json"))


@router.delete("/{script_id}", summary="删除剧本")
async def delete_script(script_id: str):
    success = await ScriptService.delete_script(script_id)
    if not success:
        return error_response(message="剧本不存在", code=404)
    return success_response(message="剧本删除成功")


@router.post("/{script_id}/process", summary="启动剧本处理流程")
async def start_processing(script_id: str, background_tasks: BackgroundTasks, project_id: Optional[str] = Query(default=None)):
    try:
        script = await ScriptService.get_script(script_id)
        if not script:
            return error_response(message="剧本不存在", code=404)
        task = await ScriptService.create_processing_task(script_id, project_id or script.project_id)
        item = await ScriptService.serialize_task(task)
        if not item:
            return error_response(message="任务创建成功但序列化失败", code=500)
        background_tasks.add_task(ScriptService.process_script, script_id, task.id)
        return success_response(data=TaskDetailResponse(task=item).model_dump(mode="json"), message="处理任务已启动")
    except Exception as error:
        return error_response(message=str(error), code=500)


@router.get("/{script_id}/tasks", summary="获取剧本处理任务列表")
async def get_tasks(script_id: str):
    tasks = await ScriptService.get_tasks(script_id)
    return success_response(data=[task.model_dump(mode="json") for task in tasks])


@router.get("/{script_id}/export/json", summary="导出剧本为JSON格式")
async def export_json(script_id: str):
    try:
        return success_response(data=await ScriptService.export_json(script_id))
    except ValueError as error:
        return error_response(message=str(error), code=404)
    except Exception as error:
        return error_response(message=str(error), code=500)


@router.get("/{script_id}/export/yaml", summary="导出剧本为YAML格式")
async def export_yaml(script_id: str):
    try:
        yaml_data = await ScriptService.export_yaml(script_id)
        return success_response(data={"yaml": yaml_data})
    except ValueError as error:
        return error_response(message=str(error), code=404)
    except Exception as error:
        return error_response(message=str(error), code=500)
