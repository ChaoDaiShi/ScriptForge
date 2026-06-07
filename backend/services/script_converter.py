"""
Script Converter Service.
将小说/轻小说文本转换为结构化剧本格式。

策略：
- 明确标记的对话（—— 「」 ""）→ 对白
- 明确标记的说话人（X说/道/问）→ 提取
- 不确定的 → 用占位符（角色甲/乙），不瞎猜
- ( ) → 舞台指示，[ ] → 旁白
- 位置关键词检测 → 场景分割
"""
import re
import uuid
from typing import List, Dict, Any, Tuple, Optional


class ScriptConverter:
    """小说 → 剧本格式转换器"""

    # 地点关键词 → (内外景, 地点名, 时间)
    LOCATION_PATTERNS = [
        (r"([\u4e00-\u9fa5·]{2,12})(?:首都|王都)", "INT.", "白天"),
        (r"([\u4e00-\u9fa5·]{2,12})(?:郊外|野外|森林|海边|山上|广场)", "EXT.", "白天"),
        (r"([\u4e00-\u9fa5·]{2,12})(?:王国|帝国|共和国|公国)", "EXT.", "白天"),
        (r"([\u4e00-\u9fa5]{1,6})(?:房间|卧室|客厅|厨房|餐厅|宫殿|大厅|教室|办公室|图书馆|酒店|车厢|店内)", "INT.", "白天"),
        # 预定义
        ("办公室", "INT.", "白天"),
        ("公司", "INT.", "白天"),
        ("学校", "INT.", "白天"),
        ("医院", "INT.", "白天"),
        ("街道", "EXT.", "白天"),
        ("公园", "EXT.", "白天"),
        ("花园", "EXT.", "白天"),
        ("操场", "EXT.", "白天"),
    ]

    def __init__(self):
        pass

    # ================================================================
    # 主入口
    # ================================================================

    def convert(self, text: str, title: str = "未命名剧本") -> Dict[str, Any]:
        """主转换入口"""
        # 1. 清理
        text = self._strip_chapter_headers(text)
        lines = text.split("\n")

        # 2. 逐行分类
        classified = self._classify(lines)

        # 3. 提取场景
        scenes = self._build_scenes(classified)

        # 4. 收集角色
        characters = self._collect_characters(scenes)

        # 5. 渲染
        script_text = self._render(scenes)
        yaml_text = self._render_yaml(scenes, title, characters)

        return {
            "script_text": script_text,
            "scenes": scenes,
            "yaml": yaml_text,
            "characters": characters,
        }

    # ================================================================
    # 预处理
    # ================================================================

    def _strip_chapter_headers(self, text: str) -> str:
        """移除章节标题"""
        patterns = [
            r"^第[一二三四五六七八九十百千零\d]+[章节部回卷集].*\n",
            r"^Chapter\s+\d+.*\n",
            r"^Volume\s+\d+.*\n",
            r"^[卷部篇][一二三四五六七八九十百千零\d]+.*\n",
        ]
        for pat in patterns:
            text = re.sub(pat, "", text, flags=re.MULTILINE | re.IGNORECASE)
        text = re.sub(r"^[-=*#]{3,}\s*$", "", text, flags=re.MULTILINE)
        return text.strip()

    # ================================================================
    # 行分类（核心）
    # ================================================================

    def _classify(self, lines: List[str]) -> List[Dict]:
        """
        逐行分类。每行 → {type, content, speaker?, ...}
        types: dialogue | stage | aside | narrative | empty
        """
        result = []

        for raw in lines:
            line = raw.strip()
            if not line:
                result.append({"type": "empty"})
                continue

            # 1) ( ) 舞台指示 / 场景标记
            sd = self._parse_stage_direction(line)
            if sd:
                result.append(sd)
                continue

            # 2) [ ] 旁白 / 独白
            ab = self._parse_aside(line)
            if ab:
                result.append(ab)
                continue

            # 3) 对话：Name：text
            dlg = self._parse_colon_dialogue(line)
            if dlg:
                result.append(dlg)
                continue

            # 4) 对话：——text
            dlg = self._parse_dash_dialogue(line)
            if dlg:
                result.append(dlg)
                continue

            # 5) 对话：「text」
            dlg = self._parse_quote_dialogue(line)
            if dlg:
                result.append(dlg)
                continue

            # 6) 裸对话（？结尾的短行，大概率是提问/反问）
            m = re.match(r"^(.+[？])$", line)
            if m and len(line) < 50:
                result.append({
                    "type": "dialogue",
                    "speaker": None,
                    "content": m.group(1),
                })
                continue

            # 7) 寻找行尾的 "Name说/道/问" → 标记下一行对话的说话人
            speaker_hint = self._extract_explicit_speaker(line)
            if speaker_hint:
                result.append({
                    "type": "narrative",
                    "content": line,
                    "next_speaker": speaker_hint,
                })
                continue

            # 7) 其余 → 叙述
            result.append({"type": "narrative", "content": line})

        return result

    # ---- 解析器 ----

    def _parse_stage_direction(self, line: str) -> Optional[Dict]:
        """(text) 或 （text） → 舞台指示"""
        m = re.match(r"^[\(（](.+?)[\)）]$", line)
        if not m:
            return None
        content = m.group(1).strip()
        content = re.sub(r"^——\s*", "", content)  # 去掉破折号前缀

        # 检测地点
        location = self._detect_location(content)
        is_scene_break = location is not None

        return {
            "type": "stage",
            "content": content,
            "location": location,
            "is_scene_break": is_scene_break,
        }

    def _parse_aside(self, line: str) -> Optional[Dict]:
        """[text] 或 【text】 → 旁白"""
        m = re.match(r"^[\[【](.+?)[\]】]$", line)
        if not m:
            return None
        content = m.group(1).strip()
        # 去掉末尾省略号和引号
        content = re.sub(r"['\"]*\.{3}$", "", content)
        content = re.sub(r"^——\s*", "", content)
        return {"type": "aside", "content": content}

    def _parse_colon_dialogue(self, line: str) -> Optional[Dict]:
        """角色名：台词"""
        m = re.match(r"^([\u4e00-\u9fa5·]{2,6})[:：]\s*(.+)", line)
        if not m:
            return None
        return {"type": "dialogue", "speaker": m.group(1), "content": m.group(2)}

    def _parse_dash_dialogue(self, line: str) -> Optional[Dict]:
        """——台词 或 ……台词（保留前缀）"""
        # —— 破折号开头的对话
        m = re.match(r"^(——\s*.+)", line)
        if m:
            return {"type": "dialogue", "speaker": None, "content": m.group(1)}
        # …… 省略号开头的对话
        m = re.match(r"^(……\s*.+)", line)
        if m and len(m.group(1)) < 60:
            return {"type": "dialogue", "speaker": None, "content": m.group(1)}
        return None

    def _parse_quote_dialogue(self, line: str) -> Optional[Dict]:
        """「text」 或 "text" 或 『text』"""
        for left, right in [("「", "」"), ("『", "』"), ('"', '"'), ("\u201c", "\u201d")]:
            if line.startswith(left) and line.endswith(right):
                return {
                    "type": "dialogue",
                    "speaker": None,
                    "content": line[1:-1],
                }
        # 只有左引号（多行对话的首行）
        for left in ["「", "『", '"']:
            if line.startswith(left) and left * 2 not in line:
                return {
                    "type": "dialogue",
                    "speaker": None,
                    "content": line[1:],
                }
        return None

    def _extract_explicit_speaker(self, line: str) -> Optional[str]:
        """
        从叙述行中提取 "X说/X道/X问" 模式，返回说话人名。
        排除非对话动词（如 知道/感到/觉得）。
        """
        m = re.search(
            r"([\u4e00-\u9fa5]{1,3})"
            r"(?:低沉地|轻轻地|大声地|小声地|淡淡地|冷冷地|"
            r"缓缓地|慢慢地|以[\u4e00-\u9fa5]+的神情|"
            r"微微|默默|轻轻|一笑)?"
            r"(?:说道|回答|答道|开口道|出声|喃喃自语|问道|喊道|叫道|"
            r"(?<!知)说|(?<!知)道|(?<!感)觉|(?<!不)问|喊|叫|答)",
            line
        )
        if m:
            return m.group(1)
        return None

    # ---- 工具 ----

    def _detect_location(self, text: str) -> Optional[str]:
        """从文本中提取地点"""
        for pat, loc_type, tod in self.LOCATION_PATTERNS:
            m = re.search(pat, text)
            if m:
                return m.group(0) if m.groups() else pat
        return None

    # ================================================================
    # 场景聚合
    # ================================================================

    def _build_scenes(self, classified: List[Dict]) -> List[Dict]:

        def _resolve_loc(location: str) -> Tuple[str, str, str]:
            """解析地点 → (内外景, 地点名, 时间)"""
            for pat, lt, td in self.LOCATION_PATTERNS:
                m = re.search(pat, location)
                if m:
                    return (lt, m.group(0), td)
            indoor_kw = ["室", "房", "厅", "店", "馆", "殿", "宫", "内", "之间"]
            for kw in indoor_kw:
                if kw in location:
                    return ("INT.", location, "白天")
            outdoor_kw = ["郊外", "外", "野", "森", "原", "海", "山"]
            for kw in outdoor_kw:
                if kw in location:
                    return ("EXT.", location, "白天")
            return ("EXT.", location, "白天")

        scenes: List[Dict] = []
        current = self._new_scene("开场")
        pending_speaker: Optional[str] = None  # 来自上行的 "X说" 提示
        conversation_idx = 0  # 对话序号，用于轮替占位符
        last_speaker_in_conv: Optional[str] = None

        for item in classified:
            t = item["type"]

            if t == "empty":
                continue

            if t == "stage":
                if item.get("is_scene_break") and current["beats"]:
                    scenes.append(current)
                    loc = item.get("location") or item.get("content", "未知地点")
                    # 解析地点类型
                    loc_type, loc_name, tod = _resolve_loc(loc)
                    current = self._new_scene(item["content"][:30], loc_type, loc_name, tod)
                    current["beats"].append({"type": "stage", "content": item["content"]})
                    continue
                current["beats"].append({"type": "stage", "content": item["content"]})
                # 舞台指示中也可能有 "X说" 提示 → 下一行对话的说话人
                stage_sp = self._extract_explicit_speaker(item.get("content", ""))
                if stage_sp:
                    pending_speaker = stage_sp
                continue

            if t == "aside":
                current["beats"].append({"type": "aside", "content": item["content"]})
                continue

            if t == "narrative":
                # 携带 next_speaker 提示
                ns = item.get("next_speaker")
                current["beats"].append({
                    "type": "narrative",
                    "content": item.get("content", ""),
                })
                if ns:
                    pending_speaker = ns
                continue

            if t == "dialogue":
                speaker = item.get("speaker")

                if speaker:
                    # 有明确说话人
                    last_speaker_in_conv = speaker
                elif pending_speaker:
                    # 上一行有 "X说" 提示
                    speaker = pending_speaker
                    last_speaker_in_conv = speaker
                    pending_speaker = None
                else:
                    # 没有说话人信息 → 用占位符
                    speaker = None

                current["beats"].append({
                    "type": "dialogue",
                    "speaker": speaker,
                    "content": item.get("content", ""),
                })
                conversation_idx += 1
                continue

        if current["beats"]:
            scenes.append(current)
        if not scenes:
            scenes.append(self._new_scene("开场"))

        # 后处理：同场景内连续对话分配占位符
        for scene in scenes:
            self._assign_placeholder_speakers(scene["beats"])

        return scenes

    def _assign_placeholder_speakers(self, beats: List[Dict]):
        """
        为没有明确说话人的连续对话分配 角色甲/乙 占位符。
        按照交替模式：第一个无名对话 → 角色甲，第二个 → 角色乙，第三个 → 角色甲...
        如果中间有明确说话人，重新计数。
        """
        placeholder_idx = 0
        seen_named_speakers: List[str] = []

        for beat in beats:
            if beat["type"] != "dialogue":
                continue

            if beat.get("speaker"):
                # 有明确说话人 → 记录并重置占位符计数
                sp = beat["speaker"]
                if sp not in seen_named_speakers:
                    seen_named_speakers.append(sp)
                # 重置：下个无名对话从新计数
                placeholder_idx = 0
            else:
                placeholder_idx += 1
                # 如果有已知说话人，用轮替模式
                if seen_named_speakers:
                    idx = (placeholder_idx - 1) % len(seen_named_speakers)
                    beat["speaker"] = seen_named_speakers[idx]
                else:
                    # 没有已知说话人，用 角色甲/乙 两人交替
                    labels = ["角色甲", "角色乙"]
                    idx = (placeholder_idx - 1) % 2
                    beat["speaker"] = labels[idx]

    def _new_scene(
        self,
        context: str,
        loc_type: str = "INT.",
        location: str = "未知地点",
        time_of_day: str = "白天",
    ) -> Dict:
        scene_id = f"sc_{uuid.uuid4().hex[:8]}"
        return {
            "id": scene_id,
            "header": f"{loc_type} {location} - {time_of_day}",
            "type": loc_type,
            "location": location,
            "time": time_of_day,
            "beats": [],
        }

    # ================================================================
    # 角色收集
    # ================================================================

    def _collect_characters(self, scenes: List[Dict]) -> List[Dict]:
        """收集有名字的角色"""
        counts: Dict[str, int] = {}
        for scene in scenes:
            for beat in scene["beats"]:
                sp = beat.get("speaker")
                if sp and sp not in ("角色甲", "角色乙", "角色丙"):
                    counts[sp] = counts.get(sp, 0) + 1

        return [
            {"id": f"char_{uuid.uuid4().hex[:8]}", "name": n, "dialogue_count": c}
            for n, c in sorted(counts.items(), key=lambda x: x[1], reverse=True)
        ]

    # ================================================================
    # 渲染
    # ================================================================

    def _render(self, scenes: List[Dict]) -> str:
        """渲染为剧本格式"""
        out: List[str] = []
        for i, scene in enumerate(scenes):
            if i > 0:
                out.append("")
            out.append(scene["header"])
            out.append("")

            for beat in scene["beats"]:
                bt = beat["type"]
                if bt == "dialogue":
                    speaker = beat.get("speaker", "角色")
                    out.append(f"    ***{speaker}***")
                    out.append(f"        {beat.get('content', '')}")
                elif bt == "stage":
                    out.append(f"    [{beat.get('content', '')}]")
                elif bt == "aside":
                    out.append(f"    [{beat.get('content', '')}]")
                elif bt == "narrative":
                    out.append(f"    {beat.get('content', '')}")
            out.append("")

        return "\n".join(out)

    def _render_yaml(
        self, scenes: List[Dict], title: str, characters: List[Dict]
    ) -> str:
        """渲染 YAML"""

        def e(s):
            return s.replace('"', '\\"').replace("\n", "\\n")

        yl = [
            "script:",
            f'  title: "{e(title)}"',
            "  episodes:",
            "    - id: ep_01",
            '      title: "第一集"',
            "      characters:",
        ]
        for ch in characters[:10]:
            yl.append(f'        - id: "{ch["id"]}"')
            yl.append(f'          name: "{e(ch["name"])}"')
            yl.append(f"          dialogue_count: {ch['dialogue_count']}")
        yl.append("      scenes:")
        for sc in scenes:
            yl.append(f"        - id: {sc['id']}")
            yl.append(f'          type: "{sc["type"]}"')
            yl.append(f'          location: "{e(sc["location"])}"')
            yl.append(f'          time: "{sc["time"]}"')
            yl.append("          beats:")
            for beat in sc["beats"]:
                bt = beat["type"]
                if bt == "dialogue":
                    yl.append("            - type: dialogue")
                    yl.append(f'              character: "{e(beat.get("speaker", "?"))}"')
                    dlg = beat.get("content", "")
                    if len(dlg) > 60:
                        dlg = dlg[:60] + "..."
                    yl.append(f'              line: "{e(dlg)}"')
                else:
                    ct = beat.get("content", "")
                    if len(ct) > 60:
                        ct = ct[:60] + "..."
                    yl.append(f"            - type: {bt}")
                    yl.append(f'              description: "{e(ct)}"')
        return "\n".join(yl)


# 模块级单例
script_converter = ScriptConverter()
