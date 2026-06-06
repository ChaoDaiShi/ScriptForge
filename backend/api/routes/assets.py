"""
Assets API Routes.
Handles script asset management and export.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from core.utils import success_response, error_response

router = APIRouter(prefix="/api/assets", tags=["assets"])


@router.get("", summary="获取资产列表")
async def get_assets(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None, description="资产类型筛选"),
    q: Optional[str] = Query(None, description="搜索关键词")
):
    """
    获取资产列表（支持分页、筛选、搜索）
    前端调用场景：显示剧本库的所有资产卡片
    """
    return success_response(data={
        "assets": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })


@router.get("/{asset_id}", summary="获取资产详情")
async def get_asset(asset_id: str):
    """
    获取单个资产详情
    前端调用场景：点击某个资产卡片查看详情
    """
    return success_response(data={"asset": {}})


@router.post("", summary="创建资产")
async def create_asset(
    title: str = Body(..., embed=True, description="资产标题"),
    type: str = Body(..., embed=True, description="资产类型"),
    content: Optional[str] = Body(None, embed=True, description="资产内容")
):
    """
    创建新资产
    前端调用场景：点击"新建资产"按钮
    """
    return success_response(data={"asset_id": ""}, message="资产创建成功")


@router.put("/{asset_id}", summary="更新资产")
async def update_asset(
    asset_id: str,
    title: Optional[str] = Body(None, embed=True),
    type: Optional[str] = Body(None, embed=True),
    content: Optional[str] = Body(None, embed=True)
):
    """
    更新资产信息
    前端调用场景：编辑资产的标题、类型、内容等
    """
    return success_response(data={"asset_id": asset_id}, message="资产更新成功")


@router.delete("/{asset_id}", summary="删除资产")
async def delete_asset(asset_id: str):
    """
    删除资产
    前端调用场景：删除不再需要的资产
    """
    return success_response(data={"asset_id": asset_id}, message="资产删除成功")


@router.post("/upload", summary="上传资产文件")
async def upload_asset(file: UploadFile = File(...)):
    """
    上传资产文件
    前端调用场景：用户上传文本、PDF、图片等素材
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    return success_response(data={"file_id": ""}, message="文件上传成功")


@router.post("/{asset_id}/export/yaml", summary="导出YAML")
async def export_yaml(asset_id: str):
    """
    导出 YAML 格式
    前端调用场景：用户点击"导出YAML"按钮
    """
    return success_response(data={"download_url": ""}, message="导出任务已创建")


@router.post("/{asset_id}/export/pdf", summary="导出PDF")
async def export_pdf(asset_id: str):
    """
    导出 PDF 格式
    前端调用场景：用户点击"导出PDF"按钮
    """
    return success_response(data={"download_url": ""}, message="导出任务已创建")


@router.get("/search", summary="搜索资产")
async def search_assets(
    q: str = Query(..., description="搜索关键词"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    """
    搜索资产
    前端调用场景：用户在搜索框输入关键词
    """
    return success_response(data={
        "results": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })
