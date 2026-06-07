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
    """AI服务封装 - 使用DeepSeek API，5步小说转剧本流程"""
    
    def __init__(self):
        self.client = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url=os.getenv("DEEPSEEK_API_BASE_URL", "https://api.deepseek.com/v1")
        )
        self.model = os.getenv("DEEPSEEK_V4_FLASH_MODEL", "deepseek-v4-flash")

    # ================================================================
    # 小说转剧本 5 步流程
    # ================================================================

    async def analyze_novel(self, text: str, title: str = "未命名剧本") -> str:
        """
        第1步：拆解原文 —— 提取人物、核心剧情、冲突，洗稿删水
        合并用户 Step 1 + Step 2（分析 + 场景拆分)
        """
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._analyze_local(text)

        prompt = f"""你是资深影视编剧，擅长小说改短剧剧本。请帮我把下面的小说片段改编为剧本前置拆解：

【第1步：拆解分析】
1. 提炼核心人物：人设、性格、当下情绪、人物关系
2. 提炼本段核心剧情、冲突点、反转点、看点
3. 删除所有无效心理描写、注水铺垫、无关环境描写
4. 梳理剧情逻辑，保证节奏紧凑，适合短剧/影视剧呈现

【第2步：场景拆分】
5. 按照「不同地点 + 不同时间」独立拆分单场镜头
6. 每一场标注：场次、时间（日/夜）、地点、出场人物
7. 每场只保留核心剧情，不拖沓、不冗余

输出格式：
---
## 人物分析
- 角色名：人设、性格、情绪
...

## 剧情大纲
核心冲突 + 关键转折

## 场景拆分
### 场景1：INT./EXT. 地点 - 时间
出场人物：...
剧情概要：...
---

以下是原文：
{text[:8000]}
"""
        return await self._call_ai(prompt)

    async def convert_to_script(self, text: str, script_type: str = "long") -> str:
        """
        第3-5步：台词转化 + 镜头适配 + 剧本规范化
        使用用户提供的万能提示词，一步完成从小说到成片剧本的转换
        """
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._convert_local(text)

        # 根据类型选择不同风格的提示词
        if script_type == "short":
            style_extra = """
【短剧专属要求】
- 每15-25秒一个小冲突，全程无废话
- 开头3秒抓眼球，结尾留钩子、悬念、反转
- 台词简短、犀利、有张力
- 动作细节更夸张，情绪更饱满，适合竖屏拍摄
- 精简人物，精简场景，降低拍摄难度"""
        else:
            style_extra = ""

        prompt = f"""你是资深影视编剧，擅长小说改短剧剧本。请将以下小说片段，完整改编为专业影视短剧剧本。

严格遵守以下规则：

1. 剧本格式（严格遵守，不得使用 markdown 格式）：
   每一场开头必须用下面这行格式：
   【场次】INT./EXT. 地点 - 时间（日/夜）｜出场：角色1、角色2
   
   紧接着是该场的动作描写和台词。示例：
   【场景1】INT. 咖啡厅 - 日｜出场：张三、李四
   ...
   
   对话格式（必须严格使用）：
   ***角色名***
       台词内容

2. 把小说的心理活动、叙述文字，全部转化为：
   - 人物表情（微笑、皱眉、眼神变化）
   - 微动作（握拳、后退、转头）
   - 语气标记（低沉地、冷冷地、颤抖地）
   - 行为细节（推门、坐下、起身）

3. 核心禁忌（必须遵守）：
   - 不要大段保留小说旁白，能演就不说
   - 不要保留大量心理描写，全部转动作、眼神、语气
   - 不要书面化台词，全部改成日常口语对话
   - 不要平铺直叙，每场必须有情绪推进/冲突/变化
   - 禁止大段旁白，能用动作和台词表达的，绝不旁白
   - 禁止使用 markdown 格式（* 加粗 / - 列表 等）
   - 角色名只能用原文出现的名字，不要编造

4. 环境描写精简，只写拍摄需要的画面
5. 节奏紧凑，适合实拍，镜头感强
6. 保留全部核心爽点、虐点、反转、情绪冲突
{style_extra}

以下是原文：
{text[:8000]}
"""
        return await self._call_ai(prompt)

    def _analyze_local(self, text: str) -> str:
        """本地分析回退"""
        lines = text.strip().split("\n")
        meaningful = [l for l in lines if len(l.strip()) > 10]
        result = ["## 人物分析", "待AI分析", "", "## 剧情大纲", "待AI分析", "", "## 场景拆分", "待AI分析", ""]
        if meaningful:
            result.append(f"原文共{len(lines)}行，{len(meaningful)}行有效内容。")
        return "\n".join(result)

    def _convert_local(self, text: str) -> str:
        """本地剧本转换回退"""
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        out = ["EXT. 未知地点 - 白天", ""]
        for line in lines[:30]:
            # 检测对话标记
            if line.startswith("——") or line.startswith("……"):
                out.append("    ***角色***")
                out.append(f"        {line}")
            elif line.startswith("(") and line.endswith(")"):
                out.append(f"    [{line[1:-1]}]")
            else:
                out.append(f"    {line}")
        return "\n".join(out)

    async def generate_yaml_ai(self, script_text: str, title: str = "未命名剧本") -> str:
        """用 AI 生成 YAML 结构化剧本"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return f"script:\n  title: \"{title}\"\n  episodes: []"

        prompt = f"""将以下剧本内容转换为 YAML 格式的结构化剧本：

{script_text[:6000]}

输出格式要求（严格 YAML，不要 markdown 代码块）：
script:
  title: "{title}"
  episodes:
    - id: ep_01
      title: "第一集"
      scenes:
        - id: sc_001
          type: "INT.|EXT."
          location: "地点"
          time: "白天|夜晚"
          characters: ["角色1", "角色2"]
          summary: "场景概要"
          dialogue_count: 3
"""
        response = await self._call_ai(prompt)
        if response:
            result = response.strip()
            for marker in ["```yaml", "```"]:
                result = result.replace(marker, "")
            return result.strip()
        return f"script:\n  title: \"{title}\"\n  episodes: []"

    # ================================================================
    # 旧方法（保留兼容）
    # ================================================================
    
    async def extract_dialogues(self, text: str) -> List[Dict[str, Any]]:
        """提取对话（步骤1）"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._extract_dialogues_local(text)
        
        # 按段落分批处理，每批最多8000字符
        prompt = self._build_chunked_prompt(
            text,
            task="从以下文本中提取所有对话内容",
            output_format="""[
            {
                "id": "唯一标识",
                "content": "对话内容",
                "start_pos": 起始位置,
                "end_pos": 结束位置
            }
        ]""",
        )
        
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
        
        prompt = self._build_chunked_prompt(
            text,
            task="从以下小说文本中提取人物角色和描写类型。请识别主要人物（3-5个）和次要人物，以及场景描写、心理描写、肖像描写、动作描写。",
            output_format="""{
            "main_characters": [{"id": "xxx", "name": "角色名", "role": "main", "description": "描述", "traits": ["性格特征"]}],
            "supporting_characters": [{"id": "xxx", "name": "角色名", "role": "supporting", "description": "描述", "traits": []}],
            "descriptions": [{"type": "scenery|psychology|portrait|action", "content": "内容"}]
        }""",
        )
        
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
        
        prompt = self._build_chunked_prompt(
            text,
            task="请用简洁的语言概括以下小说文本的主线剧情，不超过300字，包含主要人物和核心冲突。",
            output_format="直接返回剧情概括文本，不要用JSON格式",
        )
        
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
        prompt = self._build_chunked_prompt(
            text,
            task=f"请为以下文本中的对话标记说话人。人物列表：{character_names}",
            output_format="""[
            {
                "id": "对话ID",
                "speaker_name": "说话人姓名或null",
                "content": "对话内容"
            }
        ]""",
        )
        
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
        
        prompt = self._build_chunked_prompt(
            text,
            task="找出以下文本中无用的行号（从1开始）。无用行包括：纯粹的分隔线（如=============）、无意义的重复字符、纯粹的感叹词。",
            output_format="[行号1, 行号2, ...]",
        )
        
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
        
        prompt = f"""请润色以下剧本文本，清理多余空白和重复内容，优化对话表达，保持剧本格式，不改变原意：

{text[:12000]}"""
        
        response = await self._call_ai(prompt)
        return response.strip() if response else self._polish_script_local(text)
    
    def _polish_script_local(self, text: str) -> str:
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
    
    async def generate_yaml(self, text: str, title: str = "未命名剧本") -> str:
        """生成YAML格式的结构化剧本"""
        if not os.getenv("DEEPSEEK_API_KEY"):
            return self._generate_yaml_local(text, title)
        
        prompt = f"""将以下剧本内容转换为YAML格式的结构化剧本：

{text[:10000]}

输出格式要求：
```yaml
script:
  title: "{title}"
  episodes:
    - id: ep_01
      title: "剧集标题"
      cold_open:
        intent: "冷开场意图"
      scenes:
        - id: sc_001
          type: "INT. / EXT."
          location: "地点"
          time: "时间"
          summary: "场景概要"
          beats:
            - type: "action|dialogue"
              character: "角色名（对话时填写）"
              description: "描述"
```
请严格按照以上YAML格式输出。"""
        
        response = await self._call_ai(prompt)
        if response:
            # 去掉 markdown 代码块标记
            result = response.strip()
            if result.startswith("```yaml"):
                result = result[7:]
            if result.startswith("```"):
                result = result[3:]
            if result.endswith("```"):
                result = result[:-3]
            return result.strip()
        return self._generate_yaml_local(text, title)
    
    def _generate_yaml_local(self, text: str, title: str = "未命名剧本") -> str:
        """本地生成基本YAML"""
        lines = text.strip().split("\n")
        scenes = []
        current_scene = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith("INT.") or line.startswith("EXT."):
                if current_scene:
                    scenes.append(current_scene)
                current_scene = {"heading": line, "beats": []}
            elif current_scene is not None:
                current_scene["beats"].append(line)
        
        if current_scene:
            scenes.append(current_scene)
        
        if not scenes:
            scenes = [{"heading": "INT. 未知地点 - 白天", "beats": [l for l in lines[:20] if l.strip()]}]
        
        yaml_lines = [
            f"script:",
            f'  title: "{title}"',
            f"  episodes:",
            f"    - id: ep_01",
            f'      title: "第1集"',
            f"      scenes:",
        ]
        
        for i, scene in enumerate(scenes):
            yaml_lines.append(f"        - id: sc_{i+1:03d}")
            yaml_lines.append(f'          type: "{scene["heading"][:4].strip()}"')
            yaml_lines.append(f'          summary: "{scene["heading"]}"')
            yaml_lines.append(f"          beats:")
            for beat in scene["beats"][:5]:
                yaml_lines.append(f'            - description: "{beat[:60]}"')
        
        return "\n".join(yaml_lines)
    
    async def process_chapters(self, chapters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """逐章处理小说文本，每章独立调用AI"""
        results = []
        for chapter in chapters:
            chapter_text = chapter.get("content", "")
            chapter_title = chapter.get("title", f"第{chapter.get('index', '?')}章")
            
            if not chapter_text.strip():
                results.append({
                    "index": chapter.get("index"),
                    "title": chapter_title,
                    "dialogues": [],
                    "characters": {"main_characters": [], "supporting_characters": [], "descriptions": []},
                    "main_plot": "",
                    "scenes": [],
                    "error": "章节内容为空"
                })
                continue
            
            # 每章独立处理
            try:
                dialogues = await self.extract_dialogues(chapter_text)
                characters = await self.extract_characters(chapter_text)
                main_plot = await self.extract_main_plot(chapter_text)
                
                results.append({
                    "index": chapter.get("index"),
                    "title": chapter_title,
                    "dialogues": dialogues,
                    "characters": characters,
                    "main_plot": main_plot,
                })
            except Exception as e:
                results.append({
                    "index": chapter.get("index"),
                    "title": chapter_title,
                    "error": str(e),
                })
        
        return results
    
    def _build_chunked_prompt(self, text: str, task: str, output_format: str = "") -> str:
        """构建分块提示词，支持长文本处理"""
        max_chars = 8000  # 每段最多8000字符
        
        if len(text) <= max_chars:
            prompt = f"""{task}：
{text}

{output_format or ""}"""
        else:
            # 分多段处理
            chunks = []
            for i in range(0, len(text), max_chars):
                chunks.append(text[i:i + max_chars])
            
            prompt = f"""{task}（文本较长，已分为{len(chunks)}段）：

=== 第1段 ===
{chunks[0]}

=== 第2段（最后一段）===
{chunks[-1] if len(chunks) > 1 else ""}

{output_format or ""}"""
        
        return prompt

    async def _call_ai(self, prompt: str, max_tokens: int = 4000) -> str:
        """调用DeepSeek API"""
        try:
            max_prompt_length = 15000
            if len(prompt) > max_prompt_length:
                prompt = prompt[:max_prompt_length] + "\n\n（文本过长，已截断）"
            
            completion = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "你是一个专业的剧本创作助手，擅长处理小说文本的分析和转换。你输出的剧本格式专业、对话生动、镜头感强。"},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=max_tokens
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
