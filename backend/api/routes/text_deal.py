from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import Dict, Any, List
import io

from schemas.text_schema import LongTextProcessing
from schemas.file_schema import TextFileUpload, TextEncoding
from core.utils import success_response

# 创建文本处理路由，前缀统一为 /api/text
router = APIRouter(prefix="/api/text", tags=["text-processing"])

# ========================================
# 文本处理相关路由 - 用于处理文本上传和分析
# ========================================

@router.post("/upload-text", summary="上传文本数据")
async def upload_text(data: LongTextProcessing) -> Dict[str, Any]:
    """
    上传文本数据并进行分析
    前端调用场景：用户直接在输入框粘贴或上传文本内容
    """
    chunks = data.get_chunks()
    stats = data.get_statistics()
    chapters = data.detect_chapters()
    
    return success_response(
        data={
            "text_id": data.text_id,
            "statistics": stats,
            "total_chunks": len(chunks),
            "chunks": chunks,
            "chapters": chapters,
            "total_chapters": len(chapters)
        }
    )


@router.post("/upload-file", summary="上传文本文件")
async def upload_file(
    file: UploadFile = File(...),
    encoding: TextEncoding = TextEncoding.UTF8
) -> Dict[str, Any]:
    """
    上传文本文件并进行分析
    前端调用场景：用户上传文本文件（.txt, .md 等）
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    content = await file.read()
    
    text_file = TextFileUpload(
        filename=file.filename,
        content=content,
        encoding=encoding
    )
    
    decoded_text = text_file.decoded_content
    
    text_processing = LongTextProcessing(
        text=decoded_text,
        source=file.filename
    )
    
    chunks = text_processing.get_chunks()
    stats = text_processing.get_statistics()
    chapters = text_processing.detect_chapters()
    
    return success_response(
        data={
            "text_id": text_processing.text_id,
            "filename": text_file.filename,
            "file_size": {
                "bytes": text_file.size_in_bytes,
                "kb": text_file.size_in_kb
            },
            "content_hash": text_file.content_hash,
            "statistics": stats,
            "total_chunks": len(chunks),
            "chunks": chunks,
            "chapters": chapters,
            "total_chapters": len(chapters)
        }
    )


@router.post("/process", summary="处理文本")
async def process_text(data: LongTextProcessing) -> Dict[str, Any]:
    """
    处理和分析文本
    前端调用场景：对已有文本进行重新分析或处理
    """
    chunks = data.get_chunks()
    stats = data.get_statistics()
    truncated = data.truncate()
    
    return success_response(
        data={
            "text_id": data.text_id,
            "statistics": stats,
            "truncated_text": truncated,
            "chunks": chunks
        }
    )


@router.get("/statistics/{text_id}", summary="获取文本统计信息")
async def get_statistics(text_id: str) -> Dict[str, Any]:
    """
    获取已保存文本的统计信息
    前端调用场景：查看之前保存的文本分析结果
    """
    return success_response(
        data={
            "text_id": text_id,
            "message": "此接口需要与数据库集成来获取已保存的文本统计信息"
        }
    )
