"""
Dashboard API Routes.
Handles API metrics, webhooks, and API key management.
"""
from fastapi import APIRouter, Query, Body
from typing import List, Optional, Dict, Any
from core.utils import success_response, error_response

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", summary="获取仪表盘数据")
async def get_dashboard():
    """
    获取仪表盘数据
    前端调用场景：显示仪表盘的综合概览
    """
    return success_response(data={"dashboard": {}})


@router.get("/metrics", summary="获取统计指标")
async def get_metrics(
    start_date: Optional[str] = Query(None, description="开始日期"),
    end_date: Optional[str] = Query(None, description="结束日期")
):
    """
    获取统计指标
    前端调用场景：显示三个关键指标卡片
    """
    return success_response(data={
        "api_requests": 0,
        "webhook_success_rate": 0,
        "active_api_keys": 0
    })


@router.get("/api-requests", summary="获取API请求记录")
async def get_api_requests(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """
    获取 API 请求记录
    前端调用场景：查看 API 请求历史
    """
    return success_response(data={
        "requests": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })


@router.get("/webhooks", summary="获取Webhook状态")
async def get_webhooks():
    """
    获取 Webhook 状态
    前端调用场景：查看 Webhook 回调链路
    """
    return success_response(data={"webhooks": []})


@router.get("/api-keys", summary="获取API密钥列表")
async def get_api_keys(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    """
    获取 API 密钥列表
    前端调用场景：管理活跃的 API 密钥
    """
    return success_response(data={
        "api_keys": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })


@router.post("/api-keys", summary="创建API密钥")
async def create_api_key(
    name: str = Body(..., embed=True, description="密钥名称"),
    permissions: Optional[List[str]] = Body(None, embed=True, description="权限列表")
):
    """
    创建新 API 密钥
    前端调用场景：用户生成新的 API 密钥
    """
    return success_response(data={"api_key": ""}, message="API密钥创建成功")


@router.delete("/api-keys/{key_id}", summary="撤销API密钥")
async def revoke_api_key(key_id: str):
    """
    撤销 API 密钥
    前端调用场景：用户删除不再使用的密钥
    """
    return success_response(data={"key_id": key_id}, message="API密钥已撤销")
