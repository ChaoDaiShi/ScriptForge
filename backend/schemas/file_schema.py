from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union, List, Dict, Any
import re
from enum import Enum
from datetime import datetime
import hashlib

class TextEncoding(str,Enum):
    UTF8 = "utf-8"
    GBK= "gbk"
    GBK2312 = "gbk2312"
    ASCII = "ascii"
    LATIN1 = "latin-1"

class TextFileUpload(BaseModel):
    filename: str = Field(..., description="FileName")
    content: bytes = Field(..., description="FileContent")
    encoding: TextEncoding = Field(TextEncoding.UTF8, description="FileEncoding")

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, v:str)->str:
        if not v:
            raise ValueError("文件名不能为空")
        if len(v) > 255:
            raise ValueError("文件名过长")
        
        if any(char in v for char in['..','/','\\',':']):
            raise ValueError("文件名包含非法字符")
        return v
    
    @property
    def decoded_content(self) -> str:
        try:
            return self.content.decode(self.encoding)
        except UnicodeDecodeError:
            import chardet
            result = chardet.detect(self.content)
            detected_encoding = result['encoding'] or 'utf-8'
            return self.content.decode(detected_encoding, errors='ignore')
    
    @property
    def content_hash(self) -> str:
        return hashlib.md5(self.content).hexdigest()
    
    @property
    def size_in_bytes(self) -> int:
        return len(self.content)
    
    @property
    def size_in_kb(self) -> float:
        return len(self.content) / 1024
    
    class Config:
        arbitrary_types_allowed = True