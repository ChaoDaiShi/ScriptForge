"""
AI Service for ScriptForge.
Handles interactions with DeepSeek AI models for script processing.
"""
from typing import List, Dict, Any, Optional
import re
import uuid
import os
from dotenv import load_dotenv
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

class AIService:
    """AI服务封装 - 使用DeepSeek API"""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url=os.getenv("DEEPSEEK_API_BASE_URL", "https://api.deepseek.com/v1")
        )
        self.model = os.getenv("DEEPSEEK_V4_FLASH_MODEL", "deepseek-v4-flash")
    
    async def extract_dialogues(self, text: str) -> List[Dict[str, Any]]:
        """提取对话（步骤1）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._extract_dialogues_local(text)
        
        prompt = f"""从以下文本中提取所有对话内容，并以JSON格式返回：
        {text[:3000]}
        
        输出格式：
        [
            {{
                "id": "唯一标识",
                "content": "对话内容",
                "start_pos": 起始位置,
                "end_pos": 结束位置
            }}
        ]
        """
        
        response = await self._call_ai(prompt)
        try:
            return self._parse_json_response(response)
        except:
            return self._extract_dialogues_local(text)
    
    def _extract_dialogues_local(self, text: str) -> List[Dict[str, Any]]:
        """本地规则提取对话"""
        dialogues = []
        dialogue_patterns = [
            r'[""]([^""]+)[""]',
            r'["]([^"]+)["]',
            r'[「『]([^」』]+)[」』]',
            r'[\[【]([^\]】]+)[\]】]'
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
    
    async def extract_characters(self, text: str) -> Dict[str, Any]:
        """提取人物和描写类型（步骤2）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._extract_characters_local(text)
        
        prompt = f"""从以下小说文本中提取人物角色和描写类型：
        {text[:3000]}
        
        请识别主要人物（3-5个）和次要人物，以及场景描写、心理描写、肖像描写、动作描写。
        
        输出格式：
        {{
            "main_characters": [{{"id": "xxx", "name": "角色名", "role": "main", "description": "描述", "traits": ["性格特征"]}}],
            "supporting_characters": [{{"id": "xxx", "name": "角色名", "role": "supporting", "description": "描述", "traits": []}}],
            "descriptions": [{{"type": "scenery|psychology|portrait|action", "content": "内容"}}]
        }}
        """
        
        response = await self._call_ai(prompt)
        try:
            return self._parse_json_response(response)
        except:
            return self._extract_characters_local(text)
    
    def _extract_characters_local(self, text: str) -> Dict[str, Any]:
        """本地规则提取人物"""
        words = re.findall(r'[\u4e00-\u9fa5]{2,4}', text)
        word_counts = {}
        for word in words:
            if len(word) >= 2:
                word_counts[word] = word_counts.get(word, 0) + 1
        
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
        
        descriptions = []
        sentences = re.split(r'[。！？!?]', text)
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
            
            if any(keyword in sentence for keyword in ['看', '见', '景色', '风景', '周围', '环境']):
                descriptions.append({"type": "scenery", "content": sentence})
            elif any(keyword in sentence for keyword in ['想', '觉得', '认为', '心里', '内心']):
                descriptions.append({"type": "psychology", "content": sentence})
            elif any(keyword in sentence for keyword in ['长', '高', '矮', '胖', '瘦', '脸', '眼睛', '头发']):
                descriptions.append({"type": "portrait", "content": sentence})
            elif any(keyword in sentence for keyword in ['走', '跑', '跳', '坐', '站', '拿']):
                descriptions.append({"type": "action", "content": sentence})
        
        return {
            "main_characters": main_characters,
            "supporting_characters": supporting_characters,
            "descriptions": descriptions
        }
    
    async def extract_main_plot(self, text: str) -> str:
        """提取主线（步骤3）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._extract_main_plot_local(text)
        
        prompt = f"""请用简洁的语言概括以下小说文本的主线剧情：
        {text[:4000]}
        
        输出要求：
        1. 不超过300字
        2. 包含主要人物和核心冲突
        3. 简洁明了
        """
        
        response = await self._call_ai(prompt)
        return response.strip() if response else self._extract_main_plot_local(text)
    
    def _extract_main_plot_local(self, text: str) -> str:
        sentences = re.split(r'[。！？!?]', text)
        meaningful_sentences = [s.strip() for s in sentences if len(s.strip()) > 10]
        
        if len(meaningful_sentences) >= 4:
            return f"{meaningful_sentences[0]}。{meaningful_sentences[1]}。...{meaningful_sentences[-2]}。{meaningful_sentences[-1]}。"
        elif meaningful_sentences:
            return "。".join(meaningful_sentences) + "。"
        
        return "主线待分析"
    
    async def tag_dialogue_speakers(self, text: str, characters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """标记对话主体（步骤4）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._tag_dialogue_speakers_local(text, characters)
        
        character_names = ", ".join([c["name"] for c in characters])
        prompt = f"""请为以下文本中的对话标记说话人：
        人物列表：{character_names}
        
        文本：
        {text[:3000]}
        
        输出格式：
        [
            {{
                "id": "对话ID",
                "speaker_name": "说话人姓名或null",
                "content": "对话内容"
            }}
        ]
        """
        
        response = await self._call_ai(prompt)
        try:
            return self._parse_json_response(response)
        except:
            return self._tag_dialogue_speakers_local(text, characters)
    
    def _tag_dialogue_speakers_local(self, text: str, characters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        dialogues = self._extract_dialogues_local(text)
        character_names = [c["name"] for c in characters]
        
        tagged_dialogues = []
        for dialogue in dialogues:
            speaker_name = None
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
    
    async def analyze_scene(self, description: str, scene_number: int) -> Dict[str, Any]:
        """分析场景（步骤6）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._analyze_scene_local(description, scene_number)
        
        prompt = f"""分析以下场景描述：
        {description}
        
        请判断：
        1. is_interior: 是否室内场景（true/false）
        2. location: 地点描述
        3. time_of_day: 时间（白天/夜晚/清晨/黄昏）
        
        输出格式：
        {{
            "scene_number": {scene_number},
            "is_interior": true/false,
            "location": "地点",
            "time_of_day": "时间"
        }}
        """
        
        response = await self._call_ai(prompt)
        try:
            result = self._parse_json_response(response)
            result["scene_number"] = scene_number
            return result
        except:
            return self._analyze_scene_local(description, scene_number)
    
    def _analyze_scene_local(self, description: str, scene_number: int) -> Dict[str, Any]:
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
    
    async def convert_psychology(self, psychology_text: str, character_name: str) -> str:
        """转化心理描写（步骤7）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._convert_psychology_local(psychology_text, character_name)
        
        prompt = f"""将以下心理描写转化为动作或神态描写：
        人物：{character_name}
        心理描写：{psychology_text}
        
        输出要求：
        1. 使用剧本格式
        2. 不超过50字
        3. 符合人物性格
        """
        
        response = await self._call_ai(prompt)
        return response.strip() if response else self._convert_psychology_local(psychology_text, character_name)
    
    def _convert_psychology_local(self, psychology_text: str, character_name: str) -> str:
        if "高兴" in psychology_text or "开心" in psychology_text:
            return f"***{character_name}*** 脸上露出笑容"
        elif "难过" in psychology_text or "伤心" in psychology_text:
            return f"***{character_name}*** 眼中泛起泪光"
        elif "紧张" in psychology_text or "害怕" in psychology_text:
            return f"***{character_name}*** 双手微微颤抖"
        elif "思考" in psychology_text or "想" in psychology_text:
            return f"***{character_name}*** 眉头微皱，若有所思"
        
        return f"***{character_name}*** 若有所思"
    
    async def detect_useless_lines(self, text: str) -> List[int]:
        """检测无用语句（步骤9）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._detect_useless_lines_local(text)
        
        prompt = f"""找出以下文本中无用的行号（从1开始）：
        {text[:3000]}
        
        无用行包括：
        1. 纯粹的分隔线（如=============）
        2. 无意义的重复字符
        3. 纯粹的感叹词
        
        输出格式：
        [行号1, 行号2, ...]
        """
        
        response = await self._call_ai(prompt)
        try:
            return self._parse_json_response(response)
        except:
            return self._detect_useless_lines_local(text)
    
    def _detect_useless_lines_local(self, text: str) -> List[int]:
        lines = text.split('\n')
        useless_lines = []
        
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            if len(line) < 3 and all(c == line[0] for c in line):
                useless_lines.append(i + 1)
            elif re.match(r'^[啊嗯哦哇哈嘿咦咦嗯]+$', line):
                useless_lines.append(i + 1)
        
        return useless_lines
    
    async def polish_script(self, text: str) -> str:
        """润色剧本（步骤11）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._polish_script_local(text)
        
        prompt = f"""请润色以下剧本文本：
        {text[:4000]}
        
        润色要求：
        1. 清理多余空白和重复内容
        2. 优化对话表达
        3. 保持剧本格式
        4. 不改变原意
        """
        
        response = await self._call_ai(prompt)
        return response.strip() if response else self._polish_script_local(text)
    
    def _polish_script_local(self, text: str) -> str:
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
    
    async def _call_ai(self, prompt: str) -> str:
        """调用DeepSeek API"""
        try:
            max_prompt_length = 15000
            if len(prompt) > max_prompt_length:
                prompt = prompt[:max_prompt_length] + "\n\n（文本过长，已截断）"
            
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的剧本创作助手，擅长处理小说文本的分析和转换。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            return completion.choices[0].message.content or ""
        except Exception as e:
            print(f"AI调用失败: {str(e)}")
            if "maximum context length" in str(e) or "context_length" in str(e).lower():
                print("文本过长，将使用本地规则处理")
            return ""
    
    def _parse_json_response(self, response: str) -> Any:
        """解析JSON响应"""
        import json
        # 移除可能的markdown代码块标记
        response = response.strip()
        if response.startswith("```json"):
            response = response[7:]
        if response.endswith("```"):
            response = response[:-3]
        return json.loads(response.strip())
