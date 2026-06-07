"""
Script Converter Service.
将小说文本真正转换为结构化剧本格式。
支持中文小说、日式轻小说翻译等多种体裁。
"""
import re
import uuid
from typing import List, Dict, Any, Tuple


class ScriptConverter:
    """小说文本 → 剧本格式转换器"""

    # 场景切换关键词（必须是独立短句才视为切换）
    SCENE_TRANSITION_KEYWORDS = [
        "与此同时", "另一方面", "不久之后", "第二天",
        "几天后", "数日后", "一个月后", "就在这时",
        "镜头转到", "画面一转", "切换", "转眼",
    ]

    # 地点关键词映射
    LOCATION_KEYWORDS = {
        "首都": ("EXT.", "首都", "白天"),
        "郊外": ("EXT.", "郊外", "白天"),
        "办公室": ("INT.", "办公室", "白天"),
        "公司": ("INT.", "公司", "白天"),
        "房间": ("INT.", "房间", "白天"),
        "卧室": ("INT.", "卧室", "夜晚"),
        "家里": ("INT.", "家", "白天"),
        "客厅": ("INT.", "客厅", "白天"),
        "厨房": ("INT.", "厨房", "白天"),
        "餐厅": ("INT.", "餐厅", "白天"),
        "教室": ("INT.", "教室", "白天"),
        "医院": ("INT.", "医院", "白天"),
        "图书馆": ("INT.", "图书馆", "白天"),
        "酒店": ("INT.", "酒店", "白天"),
        "车厢": ("INT.", "车厢", "白天"),
        "公园": ("EXT.", "公园", "白天"),
        "街道": ("EXT.", "街道", "白天"),
        "森林": ("EXT.", "森林", "白天"),
        "海边": ("EXT.", "海边", "白天"),
        "山上": ("EXT.", "山上", "白天"),
        "广场": ("EXT.", "广场", "白天"),
        "操场": ("EXT.", "操场", "白天"),
        "花园": ("EXT.", "花园", "白天"),
        "王座": ("INT.", "王座之间", "白天"),
        "王都": ("EXT.", "王都", "白天"),
    }

    # 对话指示标记（行首）
    DIALOGUE_MARKERS = [
        r"^——",          # 破折号开头的对话
        r"^——\s",        # 破折号+空格
        r"^「[^」]*」$",   # 日式单引号完整对话行
        r"^『[^』]*』$",   # 日式双引号完整对话行
        r"^\"[^\"]*\"$",   # 英文引号对话行
        r"^\u201c[^\u201d]*\u201d$",  # 中文双引号
        r"^[\[【]",       # 方括号开头
    ]

    def __init__(self):
        self._name_pattern = re.compile(r"[\u4e00-\u9fa5]{2,4}")

    # ================================================================
    # 主入口
    # ================================================================

    def convert(self, text: str, title: str = "未命名剧本") -> Dict[str, Any]:
        """
        主转换入口：将小说文本转换为结构化剧本。
        """
        # 1. 预处理
        text = self._clean_chapter_headers(text)

        # 2. 拆分为行
        lines = text.split("\n")

        # 3. 提取所有人名
        all_names = self._extract_all_names(lines)

        # 4. 行分类 + 说话人分配
        classified = self._classify_lines(lines, all_names)

        # 5. 聚合为场景
        scenes = self._build_scenes_from_lines(classified, all_names)

        # 6. 提取角色
        characters = self._extract_characters(scenes)

        # 7. 渲染
        script_text = self._render_script(scenes)

        # 8. YAML
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

    def _clean_chapter_headers(self, text: str) -> str:
        """移除章节标题行和无关格式"""
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
    # 人名提取
    # ================================================================

    def _extract_all_names(self, lines: List[str]) -> List[str]:
        """从全文中提取人物名（含单字名如菲/空/白）"""
        full_text = "\n".join(lines)

        names_set: Dict[str, int] = {}

        # ---- 方法1: 单字名检测（在主语位置出现） ----
        for line in lines:
            # "X感到" "X看着" "X说" "X和Y" 等
            single_names = re.findall(
                r"([\u4e00-\u9fa5])(?:和|与|感到|看着|注视|走向|向前|向后|"
                r"微微|默默|轻轻|缓缓|冷冷|淡淡|慢慢地|缓缓地|"
                r"说道|回答|开口|一笑|的脸上|的记忆)",
                line
            )
            for n in single_names:
                if self._is_likely_name(n, full_text):
                    names_set[n] = names_set.get(n, 0) + 3

        # ---- 方法2: 2-3字名检测 ----
        for line in lines:
            name_contexts = re.findall(
                r"([\u4e00-\u9fa5]{2,3})"
                r"(?:的|感到|走向|看着|注视|转[向过头身]|微微|轻轻|默默|向前|向后|"
                r"想起|觉得|认为|说道|回答|开口|出声|一笑|的脸上|的眼前)",
                line
            )
            for n in name_contexts:
                if self._is_likely_name(n, full_text):
                    names_set[n] = names_set.get(n, 0) + 1

        # ---- 过滤：只保留像人名的 ----
        # 高频排除词
        non_name_suffixes = {"种", "件", "者", "爱", "达", "容", "除", "功", "轻", "略", "绘", "界", "合", "样", "人"}
        non_name_words = {
            "不过", "而且", "但是", "所以", "因为", "虽然", "如果", "然后",
            "可以", "应该", "已经", "没有", "这样", "那样", "什么", "怎么",
            "这个", "那个", "一个", "每个", "开始", "结束", "突然", "忽然",
            "人类", "世界", "自己", "他们", "我们", "她们", "你们", "大家",
            "眼睛", "时候", "地方", "东西", "声音", "感觉", "知道", "觉得",
            "以为", "可能", "似乎", "好像", "完全", "全部", "终于", "终于",
            "因此", "于是", "接着", "然后", "最后", "终于", "不久", "这时",
            "不禁", "不由", "然而", "只是", "一阵", "一眼", "一点",
            "首都", "都市", "国家", "对方", "原本", "爱尔文", "加尔得",
            "不要", "同时", "向来", "一切",
            "发现", "感到", "目光", "时间", "周围", "气氛", "空气",
            "神色", "表情", "脸上", "内心", "心中",
            "眼前", "背后", "身边", "面前",
            "看到", "听见", "想到", "说道", "回答", "喊道",
            "远处", "远方", "旁边",
            "那样", "一样", "这种", "真是", "简直", "几乎",
            "什么", "怎么", "为什么",
        }

        filtered = {}
        for name, count in names_set.items():
            if name in non_name_words or name in non_name_suffixes:
                continue
            if len(name) == 1 and not self._is_single_char_name(name, lines):
                continue
            filtered[name] = count

        # 排序
        sorted_names = sorted(
            [(n, c) for n, c in filtered.items() if c >= 2],
            key=lambda x: x[1], reverse=True
        )

        # 去重
        result = []
        for name, count in sorted_names:
            is_substr = any(
                name != other and name in other
                for other, _ in sorted_names
            )
            if not is_substr:
                result.append(name)

        return result[:12]

    def _is_likely_name(self, word: str, full_text: str) -> bool:
        """检查一个词是否像人名（不在常见排除词中）"""
        non_name = {
            "不过", "而且", "但是", "所以", "因为", "虽然", "如果", "然后",
            "可以", "应该", "已经", "没有", "这样", "那样", "什么", "怎么",
            "这个", "那个", "人类", "世界", "自己", "他们", "我们", "她们",
            "眼睛", "时候", "地方", "东西", "声音", "感觉", "知道", "觉得",
            "以为", "可能", "似乎", "好像", "完全", "全部", "终于", "终于",
            "因此", "于是", "接着", "然后", "最后", "终于", "不久", "这时",
            "不禁", "不由", "然而", "只是", "一阵", "一眼", "一点",
            "首都", "都市", "国家", "对方", "原本",
            "不要", "同时", "向来", "一切",
            "发现", "目光", "时间", "周围", "气氛", "空气",
            "神色", "表情", "内心", "心中", "眼前", "背后", "身边",
            "远处", "远方", "旁边", "所谓", "那么", "这样",
            "轻轻", "缓缓", "慢慢", "淡淡", "冷冷", "默默", "微微",
        }
        return word not in non_name

    def _is_single_char_name(self, char: str, lines: List[str]) -> bool:
        """判断单字是否像人名（在主语位置经常出现、有所有格'的'紧跟）"""
        count_as_subject = 0
        for line in lines:
            # 在主语位置出现: "X的" "X感到" "X和" "X与"
            if re.search(rf"{char}(?:的|感到|和|与|看着|说道|回答|开口|向前|向后|微微|默默|轻轻)", line):
                count_as_subject += 1
        return count_as_subject >= 2

    # ================================================================
    # 行分类
    # ================================================================

    def _classify_lines(
        self, lines: List[str], all_names: List[str]
    ) -> List[Tuple[str, Dict[str, Any]]]:
        """
        逐行分类，返回 [(type, data), ...]
        types: dialogue, stage, action, empty, scene_marker
        """
        result = []
        last_speaker = None

        for raw_line in lines:
            line = raw_line.strip()
            if not line:
                result.append(("empty", {"content": ""}))
                continue

            # 1) 舞台指示 / 场景标记：(...)  or （...）
            stage = self._extract_stage_direction(line)
            if stage:
                result.append(("stage", stage))
                continue

            # 2) 对话
            dlg = self._extract_dialogue_line(line, all_names, last_speaker)
            if dlg:
                if dlg.get("speaker"):
                    last_speaker = dlg["speaker"]
                result.append(("dialogue", dlg))
                continue

            # 3) 动作/叙述
            result.append(("action", {
                "content": self._clean_narrative(line),
                "mentioned_names": self._find_names_in_line(line, all_names),
            }))

        return result

    # ================================================================
    # 舞台指示提取
    # ================================================================

    def _extract_stage_direction(self, line: str) -> Dict[str, Any] | None:
        """检测并提取舞台指示——(...)、（...）或 [...]"""
        # 全角/半角括号
        paren_match = re.match(r"^[\(（](.+?)[\)）]$", line)
        if paren_match:
            content = paren_match.group(1).strip()
            # 提取地点
            location = self._detect_location(content)
            # 去掉破折号前缀
            display = re.sub(r"^——\s*", "", content)
            return {
                "content": display,
                "location": location,
                "is_scene_marker": location is not None,
            }

        # 方括号（旁白/独白指示）
        bracket_match = re.match(r"^[\[【](.+?)[\]】]$", line)
        if bracket_match:
            content = bracket_match.group(1).strip()
            if content.endswith("..."):
                content = content[:-3]
            return {
                "content": content,
                "location": None,
                "is_scene_marker": False,
            }

        return None

    # ================================================================
    # 对话提取
    # ================================================================

    def _extract_dialogue_line(
        self, line: str, all_names: List[str], last_speaker: str | None
    ) -> Dict[str, Any] | None:
        """从单行提取对话内容和说话人"""

        # A) 破折号开头的对话：——text
        dash_match = re.match(r"^——\s*(.+)$", line)
        if dash_match:
            content = dash_match.group(1).strip()
            speaker = self._infer_speaker_from_context(
                line, content, all_names, last_speaker
            )
            return {"speaker": speaker, "content": content, "style": "dash"}

        # B) 日式引号完整行：「...」
        jp_match = re.match(r"^「(.+)」$", line)
        if jp_match:
            content = jp_match.group(1).strip()
            speaker = self._infer_speaker_from_context(
                line, content, all_names, last_speaker
            )
            return {"speaker": speaker, "content": content, "style": "jp"}

        # C) 「 开头但跨行时只有开头
        if line.startswith("「") and "」" not in line:
            content = line[1:].strip()
            speaker = self._infer_speaker_from_context(
                line, content, all_names, last_speaker
            )
            return {"speaker": speaker, "content": content, "style": "jp_partial"}

        # D) 引号对话："..."
        quote_match = re.match(r'^"([^"]+)"$', line)
        if quote_match:
            content = quote_match.group(1).strip()
            speaker = self._infer_speaker_from_context(
                line, content, all_names, last_speaker
            )
            return {"speaker": speaker, "content": content, "style": "en_quote"}

        # E) 方框对话（日式）：【...】
        bracket_dlg = re.match(r"^[\[【](.+?)[\]】]$", line)
        if bracket_dlg:
            content = bracket_dlg.group(1).strip()
            speaker = self._infer_speaker_from_context(
                line, content, all_names, last_speaker
            )
            return {"speaker": speaker, "content": content, "style": "bracket"}

        # F) 冒号对话：名字：内容
        colon_match = re.match(
            r"^([\u4e00-\u9fa5·]{2,6})[:：]\s*(.+)", line
        )
        if colon_match:
            speaker = colon_match.group(1)
            content = colon_match.group(2).strip()
            return {"speaker": speaker, "content": content, "style": "colon"}

        # G) 启发式：无标记对话行
        # 规则：有对话语气标记 + 行较短 + 不是明显叙述
        is_bare_line = self._is_bare_dialogue(line, all_names)
        if is_bare_line:
            content = line
            speaker = self._infer_speaker_from_context(
                line, content, all_names, last_speaker
            )
            return {"speaker": speaker, "content": content, "style": "bare"}

        return None

    def _is_bare_dialogue(self, line: str, all_names: List[str]) -> bool:
        """判断无标记行是否为对话"""
        # 对话语气标志（行尾）
        has_tone_end = bool(re.search(r"[？！~]$", line))

        # 行首省略号（思考/对话）
        starts_ellipsis = line.startswith("……") or line.startswith("...")

        # 对话语气词（行中任意位置）
        has_dialogue_particle = any(p in line for p in [
            "呢", "吧", "吗", "嘛", "喔", "呀", "啦", "咯", "哦", "噢", "呗",
            "♪", "～", "~",
        ])

        # 音乐符号
        has_music_note = "&#9834" in line or "&#9833" in line or "♪" in line

        # 人称代词（对话常含 你/我）
        has_personal_pronoun = any(p in line for p in ["你", "我", "您"])

        # 排除明显的叙述行
        is_narrative = any(kw in line for kw in [
            "然后克拉米", "接着", "于是", "最后", "不久后", "这时",
            "看到那样的", "听到那", "完全接触", "是在这",
        ])

        # 排除太长的行
        is_too_long = len(line) > 80

        if is_narrative or is_too_long:
            return False

        # 强信号：破折号或省略号开头
        if starts_ellipsis:
            return True

        # 强信号：行尾问号/感叹号 + 短行
        if has_tone_end and len(line) < 50:
            return True

        # 有语气词或音乐符号
        if has_dialogue_particle or has_music_note:
            return True

        # 短行 + 含人称代词（大概率是对话）
        if has_personal_pronoun and len(line) < 40:
            return True

        # 以角色名开头（呼语）
        for name in all_names:
            if line.startswith(name) and len(name) >= 1:
                rest = line[len(name):]
                if rest and rest[0] in "，,、。！？：: ":
                    return True

        return False

    def _infer_speaker_from_context(
        self, line: str, content: str,
        all_names: List[str], last_speaker: str | None
    ) -> str | None:
        """从上下文推断说话人"""
        # 1. 对话内容本身含有人名引用时，通常是另一个人在说
        #    例如「哎呀，克拉米...」→ 说话人不是克拉米
        for name in all_names:
            if name in content and name != "我":
                # 其他人说，不是被提到的这个人
                # 找到不是这个人的上一个说话人
                continue

        # 2. 返回上一个说话人（轮替模式）
        return last_speaker

    # ================================================================
    # 上下文助手
    # ================================================================

    def _find_names_in_line(self, line: str, all_names: List[str]) -> List[str]:
        """在行中查找出现的人名"""
        found = []
        for name in all_names:
            if name in line:
                found.append(name)
        return found

    def _find_direct_address(self, line: str, all_names: List[str]) -> str | None:
        """检测对话行开头的直接呼语（如 菲，你... → 菲是被呼唤的人）"""
        for name in all_names:
            if line.startswith(name):
                rest = line[len(name):]
                if rest and rest[0] in "，,、。！？：: ":
                    return name
        return None

    def _clean_narrative(self, line: str) -> str:
        """清理叙述行"""
        line = re.sub(r"^——\s*", "", line)  # 去掉破折号前缀
        line = line.strip()
        return line

    def _detect_location(self, text: str) -> str | None:
        """从文本中检测地点（支持架空世界）"""
        # 先查预定义地点映射
        for keyword, (_, loc_name, _) in self.LOCATION_KEYWORDS.items():
            if keyword in text:
                return loc_name

        # 架空世界地点模式
        patterns = [
            # XX首都
            (r"([\u4e00-\u9fa5·]{2,10})首都", "首都"),
            # XX郊外
            (r"([\u4e00-\u9fa5·]{2,10})郊外", "郊外"),
            # XX王国/帝国/共和国
            (r"([\u4e00-\u9fa5·]{2,10})(?:王国|帝国|共和国|公国)", "国"),
        ]

        for pat, suffix in patterns:
            m = re.search(pat, text)
            if m:
                # 返回完整地点名
                return m.group(0)

        return None

    # ================================================================
    # 场景聚合
    # ================================================================

    def _build_scenes_from_lines(
        self, classified: List[Tuple[str, Dict]], all_names: List[str]
    ) -> List[Dict]:
        """将分类后的行聚合为场景，并分配说话人"""
        scenes = []
        current_scene = self._new_scene("开场")

        # 用于追踪当前说话上下文
        last_narrative_spoke_of = None  # 上次叙述涉及的人
        last_speaker = None

        for line_type, data in classified:
            if line_type == "empty":
                continue

            if line_type == "stage":
                if data.get("is_scene_marker") and current_scene["beats"]:
                    # 新场景
                    scenes.append(current_scene)
                    loc = data.get("location") or self._detect_location(data["content"]) or "未知地点"
                    current_scene = self._new_scene(data["content"][:40], location=loc)
                # 舞台指示作为节拍
                current_scene["beats"].append({
                    "type": "stage",
                    "content": data["content"],
                })
                continue

            if line_type == "action":
                # 追踪叙述中提到的角色
                names = data.get("mentioned_names", [])
                if names:
                    last_narrative_spoke_of = names[0]

                current_scene["beats"].append({
                    "type": "action",
                    "content": data["content"],
                })
                continue

            if line_type == "dialogue":
                speaker = data.get("speaker")
                content = data.get("content", "")

                if speaker and speaker != "角色":
                    # 已有明确说话人
                    last_speaker = speaker
                else:
                    # 推断说话人
                    direct_addr = self._find_direct_address(content, all_names)

                    if direct_addr:
                        # 呼语模式: "菲，你..." → 说话者是除了"菲"以外的另一人
                        others = [n for n in all_names if n != direct_addr]
                        speaker = others[0] if others else (last_speaker or all_names[0] if all_names else "角色")
                    elif last_speaker:
                        speaker = last_speaker
                    elif last_narrative_spoke_of:
                        speaker = last_narrative_spoke_of
                    else:
                        speaker = all_names[0] if all_names else "角色"

                    if speaker and speaker != "角色":
                        last_speaker = speaker

                current_scene["beats"].append({
                    "type": "dialogue",
                    "speaker": speaker or "角色",
                    "content": data.get("content", ""),
                })
                continue

        if current_scene["beats"]:
            scenes.append(current_scene)

        if not scenes:
            scenes.append(self._new_scene("开场"))

        return scenes

    def _new_scene(self, context: str, location: str | None = None) -> Dict:
        """创建新场景"""
        scene_id = f"sc_{uuid.uuid4().hex[:8]}"

        if location is None:
            location = self._detect_location(context)

        loc_type, loc_name, time_of_day = self._resolve_location(location)

        return {
            "id": scene_id,
            "header": f"{loc_type} {loc_name} - {time_of_day}",
            "type": loc_type,
            "location": loc_name,
            "time": time_of_day,
            "beats": [],
        }

    def _resolve_location(self, location: str | None) -> Tuple[str, str, str]:
        """解析地点类型和时间"""
        if not location:
            return ("EXT.", "未知地点", "白天")

        # 预定义地点
        for keyword, (lt, ln, td) in self.LOCATION_KEYWORDS.items():
            if keyword in (location or ""):
                return (lt, ln, td)

        # 室内标志
        indoor_keywords = ["室", "房", "厅", "店", "馆", "之间", "殿", "宫", "首都", "内"]
        # 室外标志
        outdoor_keywords = ["郊外", "外", "野", "森", "原", "海", "山", "王国", "帝国"]

        # 优先检测室内
        for kw in indoor_keywords:
            if kw in (location or ""):
                return ("INT.", location, "白天")
        for kw in outdoor_keywords:
            if kw in (location or ""):
                return ("EXT.", location, "白天")

        return ("EXT.", location, "白天")

    # ================================================================
    # 角色提取
    # ================================================================

    def _extract_characters(self, scenes: List[Dict]) -> List[Dict]:
        """从场景中提取人物列表"""
        char_counts: Dict[str, int] = {}
        for scene in scenes:
            for beat in scene["beats"]:
                speaker = beat.get("speaker")
                if speaker and speaker != "角色":
                    char_counts[speaker] = char_counts.get(speaker, 0) + 1

        return [
            {"id": f"char_{uuid.uuid4().hex[:8]}", "name": n, "dialogue_count": c}
            for n, c in sorted(char_counts.items(), key=lambda x: x[1], reverse=True)
        ]

    # ================================================================
    # 剧本渲染
    # ================================================================

    def _render_script(self, scenes: List[Dict]) -> str:
        """将场景渲染为剧本格式文本"""
        lines = []
        for i, scene in enumerate(scenes):
            if i > 0:
                lines.append("")
            lines.append(scene["header"])
            lines.append("")

            for beat in scene["beats"]:
                bt = beat["type"]
                if bt == "dialogue":
                    speaker = beat.get("speaker", "角色")
                    content = beat.get("content", "")
                    lines.append(f"    ***{speaker}***")
                    lines.append(f"        {content}")
                elif bt == "stage":
                    lines.append(f"    [{beat.get('content', '')}]")
                elif bt == "action":
                    lines.append(f"    {beat.get('content', '')}")
            lines.append("")

        return "\n".join(lines)

    def _render_yaml(
        self, scenes: List[Dict], title: str, characters: List[Dict]
    ) -> str:
        """渲染 YAML 格式"""

        def esc(s: str) -> str:
            return s.replace('"', '\\"').replace("\n", "\\n")

        yl = [
            f"script:",
            f'  title: "{esc(title)}"',
            f"  episodes:",
            f"    - id: ep_01",
            f'      title: "第一集"',
            f"      characters:",
        ]
        for ch in characters[:10]:
            yl.append(f'        - id: "{ch["id"]}"')
            yl.append(f'          name: "{esc(ch["name"])}"')
            yl.append(f'          dialogue_count: {ch["dialogue_count"]}')
        yl.append(f"      scenes:")
        for scene in scenes:
            yl.append(f"        - id: {scene['id']}")
            yl.append(f'          type: "{scene["type"]}"')
            yl.append(f'          location: "{esc(scene["location"])}"')
            yl.append(f'          time: "{scene["time"]}"')
            yl.append(f"          beats:")
            for beat in scene["beats"]:
                bt = beat["type"]
                if bt == "dialogue":
                    yl.append(f"            - type: dialogue")
                    yl.append(f'              character: "{esc(beat.get("speaker", "?"))}"')
                    dlg = beat.get("content", "")
                    if len(dlg) > 60:
                        dlg = dlg[:60] + "..."
                    yl.append(f'              line: "{esc(dlg)}"')
                else:
                    ct = beat.get("content", "")
                    if len(ct) > 60:
                        ct = ct[:60] + "..."
                    yl.append(f"            - type: {bt}")
                    yl.append(f'              description: "{esc(ct)}"')
        return "\n".join(yl)


script_converter = ScriptConverter()
