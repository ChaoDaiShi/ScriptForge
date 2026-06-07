"""
全局工具函数模块

包含项目中常用的辅助函数，如响应格式化、日期处理、文件操作、文本清理等
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Union
import hashlib
import json
import re
from functools import wraps
import time

from fastapi.responses import JSONResponse


# ============================================================
# 响应格式化函数
# ============================================================

def success_response(
    data: Any = None,
    message: str = "操作成功",
    code: int = 200
) -> JSONResponse:
    """统一成功响应格式"""
    return JSONResponse(status_code=code, content={
        "code": code,
        "status": "success",
        "message": message,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


def error_response(
    message: str = "操作失败",
    code: int = 400,
    errors: Optional[Dict[str, Any]] = None
) -> JSONResponse:
    """统一错误响应格式"""
    response = {
        "code": code,
        "status": "error",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if errors:
        response["errors"] = errors
    return JSONResponse(status_code=code, content=response)


# ============================================================
# 字符串处理函数
# ============================================================

def sanitize_filename(filename: str) -> str:
    """清理文件名，移除非法字符"""
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    filename = filename.strip()
    return filename or "unnamed_file"


def truncate_text(text: str, max_length: int = 100, suffix: str = "...") -> str:
    """截断文本并添加后缀"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix


def extract_text_between_markers(text: str, start_marker: str, end_marker: str) -> list:
    """提取两个标记之间的所有文本"""
    pattern = f'{re.escape(start_marker)}(.*?){re.escape(end_marker)}'
    return re.findall(pattern, text, re.DOTALL)


# ============================================================
# 哈希与加密函数
# ============================================================

def generate_hash(content: Union[str, bytes], algorithm: str = "md5") -> str:
    """生成字符串或字节的哈希值"""
    if isinstance(content, str):
        content = content.encode('utf-8')
    
    hash_obj = hashlib.new(algorithm)
    hash_obj.update(content)
    return hash_obj.hexdigest()


def generate_short_id(content: str, length: int = 8) -> str:
    """生成短唯一ID"""
    return hashlib.md5(content.encode()).hexdigest()[:length]


# ============================================================
# 日期时间函数
# ============================================================

def get_current_timestamp() -> int:
    """获取当前时间戳（秒）"""
    return int(time.time())


def get_current_timestamp_ms() -> int:
    """获取当前时间戳（毫秒）"""
    return int(time.time() * 1000)


def format_datetime(dt: Optional[datetime] = None, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """格式化日期时间为字符串"""
    if dt is None:
        dt = datetime.now(timezone.utc)
    return dt.strftime(format_str)


def parse_datetime(date_string: str, format_str: str = "%Y-%m-%d %H:%M:%S") -> datetime:
    """解析字符串为日期时间"""
    return datetime.strptime(date_string, format_str)


# ============================================================
# JSON 处理函数
# ============================================================

def safe_json_loads(json_string: str, default: Any = None) -> Any:
    """安全解析 JSON，失败时返回默认值"""
    try:
        return json.loads(json_string)
    except (json.JSONDecodeError, TypeError):
        return default


def safe_json_dumps(obj: Any, default: str = "{}") -> str:
    """安全序列化对象为 JSON，失败时返回默认值"""
    try:
        return json.dumps(obj, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        return default


# ============================================================
# 文件操作函数
# ============================================================

def get_file_extension(filename: str) -> str:
    """获取文件扩展名"""
    return filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''


def is_text_file(filename: str) -> bool:
    """判断是否为文本文件"""
    text_extensions = {'txt', 'md', 'json', 'yaml', 'yml', 'xml', 'csv', 'log'}
    return get_file_extension(filename) in text_extensions


def format_file_size(size_bytes: int) -> str:
    """格式化文件大小为可读字符串"""
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


# ============================================================
# 性能装饰器
# ============================================================

def timing_decorator(func):
    """记录函数执行时间的装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        print(f"[{func.__name__}] 执行耗时: {end_time - start_time:.4f} 秒")
        return result
    return wrapper


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """失败自动重试的装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    print(f"[{func.__name__}] 第 {attempt + 1} 次尝试失败: {e}")
                    time.sleep(delay)
            return None
        return wrapper
    return decorator


# ============================================================
# 文本清理函数
# ============================================================

def remove_chapter_markers(text: str) -> str:
    """移除章节标题标记（支持多种格式）
    
    处理的格式：
    - \\n第*章 或 \\n第*章（换行+章节）
    - 第*章\\n 或 第*章\\n（章节+换行）
    - 第 * 章（有空格）
    - 第*卷（卷的规则同上）
    
    示例:
        \\n第一章  ->  (移除整行)
        第二章\\n  ->  (移除整行)
        第 1 章   ->  (移除整行)
    """
    # 匹配章节/卷标题行：可选换行 + 第 + 数字 + 空格可选 + 章/卷 + 可选换行
    # 使用 ^ 或 \\n 作为行开始标记
    chapter_pattern = r'(?:^|\n)\s*第\s*\d+\s*(?:章|卷)\s*(?:\n|$)'
    text = re.sub(chapter_pattern, '\n', text)
    
    # 清理行首的多余换行
    text = re.sub(r'^\n+', '', text)
    
    # 清理多余的连续空行
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def remove_heading_markers(text: str, marker: str = '#') -> str:
    """移除 Markdown 标题标记
    
    Args:
        text: 输入文本
        marker: 标题标记符号，默认 '#'
    
    示例:
        ### 标题  ->  标题
        #### 子标题  ->  子标题
        ##### 三级标题  ->  三级标题
    """
    # 匹配连续3个或更多个指定标记符号开头的行
    escaped_marker = re.escape(marker)
    pattern = rf'^{escaped_marker}{{3,}}\s*(.+?)\s*$'
    
    def replace_heading(match):
        # 只保留标题文字，移除标记
        return match.group(1).strip() if match.group(1) else ''
    
    lines = []
    for line in text.split('\n'):
        cleaned_line = re.sub(pattern, replace_heading, line)
        lines.append(cleaned_line)
    
    result = '\n'.join(lines)
    
    # 清理可能的空行
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result.strip()


def remove_markdown_markers(text: str) -> str:
    """移除常见的 Markdown 标记符号
    
    处理：
    - 标题标记（#、##、###等）
    - 加粗标记（**text**）
    - 斜体标记（*text* 或 _text_）
    - 删除线（~~text~~）
    """
    # 移除标题标记（1-6个#）
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
    
    # 移除加粗标记
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    
    # 移除斜体标记
    text = re.sub(r'\*(.+?)\*', r'\1', text)
    text = re.sub(r'_(.+?)_', r'\1', text)
    
    # 移除删除线
    text = re.sub(r'~~(.+?)~~', r'\1', text)
    
    return text


def clean_text(
    text: str,
    remove_chapters: bool = True,
    remove_markdown: bool = False,
    normalize_whitespace: bool = True
) -> str:
    """综合文本清理函数
    
    Args:
        text: 输入文本
        remove_chapters: 是否移除章节标记
        remove_markdown: 是否移除 Markdown 标记
        normalize_whitespace: 是否规范化空白字符
    
    Returns:
        清理后的文本
    
    示例:
        input = '''
        \\n第一章 剧情开始
        
        ### 这是一个标题
        
        这里是正文内容
        '''
        
        clean_text(input, remove_chapters=True, remove_markdown=True)
        -> '剧情开始\\n\\n这是一个标题\\n\\n这里是正文内容'
    """
    result = text
    
    # 1. 移除章节标题标记
    if remove_chapters:
        result = remove_chapter_markers(result)
    
    # 2. 移除 Markdown 标记
    if remove_markdown:
        result = remove_markdown_markers(result)
    
    # 3. 规范化空白字符
    if normalize_whitespace:
        # 合并多个空格/制表符为单个空格
        result = re.sub(r'[ \t]+', ' ', result)
        # 限制连续空行
        result = re.sub(r'\n{3,}', '\n\n', result)
        # 清理行首行尾空格
        result = '\n'.join(line.strip() for line in result.split('\n'))
    
    return result.strip()


def text_deal(string: str, **kwargs) -> str:
    """文本处理主函数
    
    综合处理文本，移除章节标记、Markdown 标记等
    
    Args:
        string: 输入的原始文本
        **kwargs: 可选参数
            - remove_chapters: 是否移除章节标记，默认 True
            - remove_markdown: 是否移除 Markdown 标记，默认 False
            - normalize_whitespace: 是否规范化空白，默认 True
    
    Returns:
        处理后的文本
    
    示例:
        text = '''
        \\n第一章 初入江湖
        
        ### 江湖往事
        
        这是一段正文内容
        
        \\n第二卷 风云再起
        '''
        
        result = text_deal(text)
    """
    return clean_text(
        text=string,
        remove_chapters=kwargs.get('remove_chapters', True),
        remove_markdown=kwargs.get('remove_markdown', False),
        normalize_whitespace=kwargs.get('normalize_whitespace', True)
    )
