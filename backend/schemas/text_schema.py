from pydantic import BaseModel, Field, field_validator
from typing import Optional, Union, List, Dict, Any
import re
from datetime import datetime
import hashlib

class LongTextProcessing(BaseModel):
    text: str = Field(..., description="原始文本")
    text_id: Optional[str] = Field(default=None, description="文本唯一标识")
    max_length: int = Field(default=10000, ge=1, le=1000000, description="最大处理长度")
    chunk_size: int = Field(default=1000, ge=100, le=10000, description="分块大小")

    source: Optional[str] = Field(default=None, description="文本来源")
    language: str = Field(default="zh", description="语言代码")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="元数据")
    
    @field_validator('text')
    @classmethod
    def validate_text(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("文本内容不能为空")
        return v.strip()
    
    @field_validator('text_id')
    @classmethod
    def generate_text_id(cls, v: Optional[str], info) -> str:
        if v is None:
            text = info.data.get('text', '')
            if text:
                return hashlib.md5(text.encode()).hexdigest()[:16]
        return v or ''
    
    def get_chunks(self) -> List[str]:
        chunks = []
        text = self.text
        sentences = re.split(r'[。！？!?]+', text)
        current_chunk = ""
        
        for sentence in sentences:
            if not sentence.strip():
                continue
                
            if len(current_chunk) + len(sentence) < self.chunk_size:
                current_chunk += sentence + "。"
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + "。"
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        if not chunks or any(len(chunk) > self.chunk_size * 1.5 for chunk in chunks):
            chunks = [text[i:i + self.chunk_size] for i in range(0, len(text), self.chunk_size)]
        
        return chunks
    
    def get_statistics(self) -> Dict[str, Any]:
        text = self.text
        return {
            "total_chars": len(text),
            "total_words": len(re.findall(r'\b\w+\b', text)),
            "total_sentences": len(re.findall(r'[。！？!?]+', text)),
            "total_paragraphs": len([p for p in text.split('\n') if p.strip()]),
            "avg_word_length": sum(len(word) for word in re.findall(r'\b\w+\b', text)) / max(1, len(re.findall(r'\b\w+\b', text))),
        }
    
    def truncate(self, max_length: Optional[int] = None) -> str:
        max_len = max_length or self.max_length
        if len(self.text) <= max_len:
            return self.text
        return self.text[:max_len] + "..."
    
    class Config:
        arbitrary_types_allowed = True