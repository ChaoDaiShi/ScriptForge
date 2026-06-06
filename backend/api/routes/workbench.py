"""
Workbench API Routes.
Handles episode and scene management for script writing.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from core.utils import success_response, error_response

router = APIRouter(prefix="/api/workbench", tags=["workbench"])


@router.get("/episodes", summary="获取剧集列表")
async def get_episodes(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量")
):
    """
    获取剧集列表（支持分页）
    前端调用场景：显示所有剧集项目
    """
    return success_response(data={
        "episodes": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })


@router.get("/episodes/{episode_id}", summary="获取剧集详情")
async def get_episode(episode_id: str):
    """
    获取单集详情
    前端调用场景：进入某个剧集的工作台
    """
    return success_response(data={"episode": {}})


@router.post("/episodes", summary="创建剧集")
async def create_episode(
    title: str = Body(..., embed=True, description="剧集标题"),
    description: Optional[str] = Body(None, embed=True, description="剧集简介")
):
    """
    创建新剧集
    前端调用场景：用户点击"新建剧集"按钮
    """
    return success_response(data={"episode_id": ""}, message="剧集创建成功")


@router.put("/episodes/{episode_id}", summary="更新剧集")
async def update_episode(
    episode_id: str,
    title: Optional[str] = Body(None, embed=True),
    description: Optional[str] = Body(None, embed=True)
):
    """
    更新剧集信息
    前端调用场景：修改剧集标题、简介等基本信息
    """
    return success_response(data={"episode_id": episode_id}, message="剧集更新成功")


@router.delete("/episodes/{episode_id}", summary="删除剧集")
async def delete_episode(episode_id: str):
    """
    删除剧集
    前端调用场景：删除不再需要的剧集
    """
    return success_response(data={"episode_id": episode_id}, message="剧集删除成功")


@router.get("/episodes/{episode_id}/scenes", summary="获取场景列表")
async def get_scenes(episode_id: str):
    """
    获取某集的所有场景
    前端调用场景：显示中间栏的场景列表
    """
    return success_response(data={"scenes": []})


@router.post("/episodes/{episode_id}/scenes", summary="创建场景")
async def create_scene(
    episode_id: str,
    heading: str = Body(..., embed=True, description="场景头"),
    content: Optional[str] = Body(None, embed=True, description="场景内容")
):
    """
    创建新场景
    前端调用场景：用户添加新的场景
    """
    return success_response(data={"scene_id": ""}, message="场景创建成功")


@router.put("/episodes/{episode_id}/scenes/{scene_id}", summary="更新场景")
async def update_scene(
    episode_id: str,
    scene_id: str,
    heading: Optional[str] = Body(None, embed=True),
    content: Optional[str] = Body(None, embed=True)
):
    """
    更新场景内容
    前端调用场景：用户编辑场景的节拍、对话等
    """
    return success_response(data={"scene_id": scene_id}, message="场景更新成功")


@router.delete("/episodes/{episode_id}/scenes/{scene_id}", summary="删除场景")
async def delete_scene(episode_id: str, scene_id: str):
    """
    删除场景
    前端调用场景：删除不需要的场景
    """
    return success_response(data={"scene_id": scene_id}, message="场景删除成功")


@router.get("/episodes/{episode_id}/characters", summary="获取角色列表")
async def get_characters(episode_id: str):
    """
    获取某集的角色列表
    前端调用场景：显示左侧栏的人物档案
    """
    return success_response(data={"characters": []})


@router.post("/episodes/{episode_id}/characters", summary="创建角色")
async def create_character(
    episode_id: str,
    name: str = Body(..., embed=True, description="角色名称"),
    description: Optional[str] = Body(None, embed=True, description="角色描述")
):
    """
    创建新角色
    前端调用场景：用户添加新的人物卡片
    """
    return success_response(data={"character_id": ""}, message="角色创建成功")


@router.get("/episodes/{episode_id}/history", summary="获取编辑历史")
async def get_history(episode_id: str):
    """
    获取编辑历史
    前端调用场景：显示右侧栏的版本历史
    """
    return success_response(data={"revisions": []})


@router.get("/episodes/{episode_id}/yaml", summary="获取YAML结构")
async def get_yaml(episode_id: str):
    """
    获取 YAML 结构
    前端调用场景：显示右侧栏的 YAML 视图
    """
    return success_response(data={"yaml": ""})


@router.post("/episodes/{episode_id}/generate", summary="启动AI生成")
async def generate_content(episode_id: str):
    """
    启动 AI 生成
    前端调用场景：用户点击"继续流式生成"按钮
    """
    return success_response(data={"status": "generating"}, message="生成任务已启动")


@router.post("/episodes/{episode_id}/upload-source", summary="上传原著素材")
async def upload_source(episode_id: str, file: UploadFile = File(...)):
    """
    上传原著素材
    前端调用场景：用户上传小说或原著文本
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    return success_response(data={"file_id": ""}, message="文件上传成功")
