"""
AI Service for ScriptForge.
Handles interactions with external AI models for script processing.
"""
from typing import List, Dict, Any, Optional
import re
import uuid
from core.utils import text_deal

class AIService:
    """AI服务封装 - 当前版本使用本地规则处理，后续可接入真实AI接口"""
    
    @staticmethod
    def extract_dialogues(text: str) -> List[Dict[str, Any]]:
        """提取对话（步骤1）
        
        通过"..."、「」、[]等符号识别对话，使用|id|标记唯一标识
        """
        dialogues = []
        dialogue_patterns = [
            r'[""]([^""]+)[""]',  # 中文引号
            r'["]([^"]+)["]',  # 英文引号
            r'[「『]([^」』]+)[」』]',  # 日文引号
            r'[\[【]([^\]】]+)[\]】]'  # 方括号
        ]
        
        for pattern in dialogue_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                content = match.group(1).strip()
                if content:
                    dialogue_id = str(uuid.uuid4())[:8]
                    dialogues.append({
                        "id": dialogue_id,
                        "content": content,
                        "start_pos": match.start(),
                        "end_pos": match.end()
                    })
        
        return dialogues

    @staticmethod
    def extract_characters(text: str) -> Dict[str, Any]:
        """提取人物和描写类型（步骤2）
        
        当前为简单规则实现，后续可接入真实AI
        """
        # 简单规则：找出重复出现的名词作为人物
        words = re.findall(r'[\u4e00-\u9fa5]{2,4}', text)
        word_counts = {}
        for word in words:
            if len(word) >= 2:
                word_counts[word] = word_counts.get(word, 0) + 1
        
        # 排序取最频繁的
        sorted_words = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)
        
        main_characters = []
        supporting_characters = []
        
        for i, (name, count) in enumerate(sorted_words[:10]):
            if i < 3 and count > 2:
                main_characters.append({
                    "id": str(uuid.uuid4())[:8],
                    "name": name,
                    "role": "main",
                    "description": f"主要人物，出现{count}次",
                    "traits": []
                })
            elif count > 1:
                supporting_characters.append({
                    "id": str(uuid.uuid4())[:8],
                    "name": name,
                    "role": "supporting",
                    "description": f"次要人物，出现{count}次",
                    "traits": []
                })
        
        # 分离描写类型（简单规则实现）
        descriptions = []
        sentences = re.split(r'[。！？!?]', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # 简单关键词匹配
            if any(keyword in sentence for keyword in ['看', '见', '景色', '风景', '周围', '环境']):
                descriptions.append({
                    "type": "scenery",
                    "content": sentence
                })
            elif any(keyword in sentence for keyword in ['想', '觉得', '认为', '心里', '内心']):
                descriptions.append({
                    "type": "psychology",
                    "content": sentence
                })
            elif any(keyword in sentence for keyword in ['长', '高', '矮', '胖', '瘦', '脸', '眼睛', '头发']):
                descriptions.append({
                    "type": "portrait",
                    "content": sentence
                })
            elif any(keyword in sentence for keyword in ['走', '跑', '跳', '坐', '站', '拿']):
                descriptions.append({
                    "type": "action",
                    "content": sentence
                })
        
        return {
            "main_characters": main_characters,
            "supporting_characters": supporting_characters,
            "descriptions": descriptions
        }

    @staticmethod
    def extract_main_plot(text: str) -> str:
        """提取主线（步骤3）
        
        当前为简单规则实现，后续可接入真实AI
        """
        # 简单规则：取前几句和后几句作为主线摘要
        sentences = re.split(r'[。！？!?]', text)
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if len(meaningful_sentences) >= 4:
            return f"{meaningful_sentences[0]}。{meaningful_sentences[1]}。...{meaningful_sentences[-2]}。{meaningful_sentences[-1]}。"
        elif meaningful_sentences:
            return "。".join(meaningful_sentences) + "。"
        
        return "主线待分析"

    @staticmethod
    def tag_dialogue_speakers(text: str, characters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """标记对话主体（步骤4）
        
        当前为简单规则实现，后续可接入真实AI
        """
        dialogues = AIService.extract_dialogues(text)
        character_names = [c["name"] for c in characters]
        
        tagged_dialogues = []
        for dialogue in dialogues:
            speaker_name = None
            # 在对话前查找人名
            dialogue_start = dialogue["start_pos"]
            context_before = text[max(0, dialogue_start - 30):dialogue_start]
            
            for name in character_names:
                if name in context_before:
                    speaker_name = name
                    break
            
            tagged_dialogues.append({
                "id": dialogue["id"],
                "speaker_name": speaker_name,
                "content": dialogue["content"]
            })
        
        return tagged_dialogues

    @staticmethod
    def analyze_scene(description: str, scene_number: int) -> Dict[str, Any]:
        """分析场景（步骤6）
        
        当前为简单规则实现，后续可接入真实AI
        """
        # 简单规则：根据关键词判断
        is_interior = any(keyword in description for keyword in ['房间', '屋内', '家里', '室内', '办公室'])
        location = "某地点"
        time_of_day = "白天"
        
        location_keywords = ['公园', '学校', '家里', '办公室', '街道', '森林', '海边', '山上']
        for keyword in location_keywords:
            if keyword in description:
                location = keyword
                break
        
        if any(keyword in description for keyword in ['晚上', '夜晚', '深夜', '黄昏', '傍晚']):
            time_of_day = "夜晚"
        elif any(keyword in description for keyword in ['清晨', '早上', '黎明']):
            time_of_day = "清晨"
        
        return {
            "scene_number": scene_number,
            "is_interior": is_interior,
            "location": location,
            "time_of_day": time_of_day
        }

    @staticmethod
    def convert_psychology(psychology_text: str, character_name: str) -> str:
        """转化心理描写（步骤7）
        
        将心理描写转化为动作或神态描写
        """
        # 简单规则实现
        if "高兴" in psychology_text or "开心" in psychology_text:
            return f"***{character_name}*** 脸上露出笑容"
        elif "难过" in psychology_text or "伤心" in psychology_text:
            return f"***{character_name}*** 眼中泛起泪光"
        elif "紧张" in psychology_text or "害怕" in psychology_text:
            return f"***{character_name}*** 双手微微颤抖"
        elif "思考" in psychology_text or "想" in psychology_text:
            return f"***{character_name}*** 眉头微皱，若有所思"
        
        return f"***{character_name}*** 若有所思"

    @staticmethod
    def detect_useless_lines(text: str) -> List[int]:
        """检测无用语句（步骤9）
        
        当前为简单规则实现，后续可接入真实AI
        """
        lines = text.split('\n')
        useless_lines = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # 检查是否为无意义重复
            if len(line) < 3 and all(c == line[0] for c in line):
                useless_lines.append(i + 1)
            # 检查是否为纯粹的感叹词
            elif re.match(r'^[啊嗯哦哇哈嘿咦咦嗯]+$', line):
                useless_lines.append(i + 1)
        
        return useless_lines

    @staticmethod
    def polish_script(text: str) -> str:
        """润色剧本（步骤11）
        
        当前为简单规则实现，后续可接入真实AI
        """
        # 清理多余空白
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
