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
    
    def detect_chapters(self) -> List[Dict[str, Any]]:
        """识别文本中的章节结构"""
        lines = self.text.split('\n')
        # 更全面的章节检测正则表达式
        chapter_regex = re.compile(
            r'^(第[一二三四五六七八九十百千零\d]+[章节部回卷]|'
            r'Chapter\s+\d+|'
            r'VOLUME\s*\d+|'
            r'卷[一二三四五六七八九十百千零\d]+|'
            r'第\s*[一二三四五六七八九十百零\d]+\s*[章节部回卷]|'
            r'Ep\.\s*\d+|'
            r'Episode\s+\d+)',
            re.IGNORECASE
        )
        
        # 需要过滤的关键词
        filter_keywords = [
            '插图', '插图页', 'color', 'COLOR', 'illustration', 'Illustration',
            'postscript', 'Postscript', '后记', '序', '序章', '前言',
            '目录', 'contents', 'Contents', 'CONTENTS',
            '作者简介', '作者紹介', 'about the author'
        ]
        
        chapters = []
        current_chapter = None
        
        for i, line in enumerate(lines):
            trimmed = line.strip()
            
            # 检查是否匹配章节模式
            matches_pattern = chapter_regex.match(trimmed)
            
            # 额外的验证规则
            is_valid = matches_pattern and (
                # 检查是否包含过滤关键词
                not any(keyword in trimmed for keyword in filter_keywords) and
                # 检查是否包含特殊引号
                not any(char in trimmed for char in ['『', '「', '【', '（', '“', '"']) and
                # 检查长度
                len(trimmed) <= 100 and
                # 检查是否为纯章节标题格式（避免误匹配普通文本）
                (
                    re.search(r'第[一二三四五六七八九十百千零\d]+[章节部回卷集]', trimmed) or
                    re.search(r'[卷部篇][一二三四五六七八九十百千零\d]+', trimmed) or
                    re.search(r'Chapter\s+\d+', trimmed, re.IGNORECASE) or
                    re.search(r'Volume\s+\d+', trimmed, re.IGNORECASE)
                )
            )
            
            if is_valid:
                # 保存前一个章节的字数
                if current_chapter is not None:
                    current_chapter['word_count'] = current_chapter['end_pos'] - current_chapter['start_pos']
                    chapters.append(current_chapter)
                
                # 开始新章节
                current_chapter = {
                    'index': len(chapters) + 1,
                    'title': trimmed[:80],  # 限制标题长度
                    'start_pos': i,
                    'end_pos': i,
                    'word_count': 0
                }
            elif current_chapter is not None:
                current_chapter['end_pos'] = i + 1
        
        # 保存最后一个章节
        if current_chapter is not None:
            current_chapter['word_count'] = current_chapter['end_pos'] - current_chapter['start_pos']
            chapters.append(current_chapter)
        
        # 计算每章的实际字符数
        for chapter in chapters:
            start = chapter['start_pos']
            end = chapter['end_pos']
            chapter_text = '\n'.join(lines[start:end])
            chapter['word_count'] = len(chapter_text)
        
        # 如果检测到的章节不足3个，尝试基于段落创建虚拟章节
        if len(chapters) < 3 and len(self.text) > 0:
            paragraphs = [p for p in self.text.split('\n\n') if p.strip()]
            if len(paragraphs) >= 3:
                chapters = []
                chunk_size = max(1, len(paragraphs) // 3)
                for i in range(0, len(paragraphs), chunk_size):
                    chunk = paragraphs[i:i+chunk_size]
                    chapter_text = '\n\n'.join(chunk)
                    chapters.append({
                        'index': len(chapters) + 1,
                        'title': f'第 {len(chapters) + 1} 部分',
                        'word_count': len(chapter_text)
                    })
        
        return chapters
    
    def truncate(self, max_length: Optional[int] = None) -> str:
        max_len = max_length or self.max_length
        if len(self.text) <= max_len:
            return self.text
        return self.text[:max_len] + "..."
    
    class Config:
        arbitrary_types_allowed = True