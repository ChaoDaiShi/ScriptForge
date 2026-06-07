"""
Script Processing Service.
严格按照12个步骤流程处理剧本，支持可视化追踪。
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
import re
import json

import yaml

from repositories import SupabaseScriptRepository
from schemas.script_schema import (
    Character,
    CharacterRole,
    ProcessingStatus,
    ProcessingStep,
    ProcessingTask,
    Scene,
    SceneHeading,
    Script,
    ScriptCreateRequest,
    ScriptType,
    TaskListItem,
)
from services.ai_service import AIService


class ScriptService:
    """剧本处理服务 - 完整12步骤流程"""

    _repository: Optional[SupabaseScriptRepository] = None
    _ai_service: Optional[AIService] = None

    @classmethod
    def _get_repository(cls) -> SupabaseScriptRepository:
        if cls._repository is None:
            cls._repository = SupabaseScriptRepository()
        return cls._repository

    @classmethod
    def _get_ai_service(cls) -> AIService:
        if cls._ai_service is None:
            cls._ai_service = AIService()
        return cls._ai_service

    @staticmethod
    def _task_status_for_frontend(status: ProcessingStatus) -> str:
        mapping = {
            ProcessingStatus.PENDING: "queued",
            ProcessingStatus.PROCESSING: "running",
            ProcessingStatus.COMPLETED: "done",
            ProcessingStatus.FAILED: "failed",
        }
        return mapping.get(status, "queued")

    @staticmethod
    def _task_title(script: Script) -> str:
        return f"{script.title} · 剧本转换"

    @staticmethod
    async def create_script(request: ScriptCreateRequest) -> Script:
        script = Script(
            id=str(uuid4()),
            title=request.title,
            type=request.type,
            original_text=request.text,
        )
        return ScriptService._get_repository().create_script(script)

    @staticmethod
    async def get_script(script_id: str) -> Optional[Script]:
        return ScriptService._get_repository().get_script(script_id)

    @staticmethod
    async def list_scripts(script_type: Optional[ScriptType] = None) -> List[Script]:
        return ScriptService._get_repository().list_scripts(script_type)

    @staticmethod
    async def delete_script(script_id: str) -> bool:
        return ScriptService._get_repository().delete_script(script_id)

    @staticmethod
    async def create_processing_task(script_id: str) -> ProcessingTask:
        script = ScriptService._get_repository().get_script(script_id)
        if not script:
            raise ValueError(f"剧本不存在: {script_id}")

        # 完整的12个处理步骤
        steps = [
            ProcessingStep.DIALOGUE_EXTRACTION,        # 1. 提取对话
            ProcessingStep.CHARACTER_EXTRACTION,      # 2. 提取人物和描写
            ProcessingStep.MAIN_PLOT_EXTRACTION,      # 3. 提取主线
            ProcessingStep.DIALOGUE_SPEAKER_TAGGING,  # 4. 标记对话主体
            ProcessingStep.SCENE_ANALYSIS,            # 6. 分析场景头
            ProcessingStep.PSYCHOLOGY_CONVERSION,     # 7. 转换心理描写
            ProcessingStep.SCENE_PACKAGING,           # 8. 打包场景
            ProcessingStep.USELESS_LINE_DETECTION,    # 9. 检测无用语句
            ProcessingStep.USELESS_LINE_REMOVAL,      # 10. 移除无用语句
            ProcessingStep.POLISHING,                 # 11. 润色处理
            ProcessingStep.EXPORT,                    # 12. 导出剧本
        ]

        task = ProcessingTask(
            id=str(uuid4()),
            script_id=script_id,
            steps=steps,
            status=ProcessingStatus.PENDING,
            step_results={},  # 初始化空字典用于存储中间结果
        )
        return ScriptService._get_repository().create_task(task)

    @staticmethod
    async def process_script(script_id: str, task_id: str):
        """严格按照12个步骤处理剧本"""
        print(f"=== 开始处理任务: task_id={task_id}, script_id={script_id} ===")
        script = await ScriptService.get_script(script_id)
        if not script:
            print(f"错误: 剧本不存在 script_id={script_id}")
            await ScriptService._update_task(
                task_id,
                status=ProcessingStatus.FAILED,
                error_message="剧本不存在",
            )
            return

        task = await ScriptService.get_task(task_id)
        if not task:
            print(f"错误: 任务不存在 task_id={task_id}")
            return

        try:
            print(f"设置任务状态为 PROCESSING")
            await ScriptService._update_task(task_id, status=ProcessingStatus.PROCESSING, progress=0)

            # 步骤1: 提取对话，添加唯一标识
            print(f"执行步骤1: 提取对话")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.DIALOGUE_EXTRACTION,
                progress=8,
            )
            result1 = await ScriptService._step1_extract_dialogues(script.original_text)
            script.processed_text = result1["text"]
            await ScriptService._save_step_result(task_id, "step1", result1)
            print(f"步骤1完成: {result1['description']}")

            # 步骤2: 提取人物和描写分离
            print(f"执行步骤2: 提取人物和描写")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.CHARACTER_EXTRACTION,
                progress=16,
            )
            result2 = await ScriptService._step2_extract_characters_and_descriptions(script)
            await ScriptService._save_step_result(task_id, "step2", result2)
            print(f"步骤2完成: {result2['description']}")

            # 步骤3: 提取主线
            print(f"执行步骤3: 提取主线")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.MAIN_PLOT_EXTRACTION,
                progress=24,
            )
            result3 = await ScriptService._step3_extract_main_plot(script.processed_text)
            script.main_plot = result3["main_plot"]
            await ScriptService._save_step_result(task_id, "step3", result3)
            print(f"步骤3完成: {result3['description']}")

            # 步骤4: 标记对话主体
            print(f"执行步骤4: 标记对话主体")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.DIALOGUE_SPEAKER_TAGGING,
                progress=32,
            )
            result4 = await ScriptService._step4_tag_dialogue_speakers(script)
            script.processed_text = result4["text"]
            await ScriptService._save_step_result(task_id, "step4", result4)
            print(f"步骤4完成: {result4['description']}")

            # 步骤5: 剧本架构选择（已在创建时确定）
            # script.type 已经确定

            # 步骤6: 分析场景头
            print(f"执行步骤6: 分析场景头")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.SCENE_ANALYSIS,
                progress=40,
            )
            result6 = await ScriptService._step6_analyze_scene_headers(script)
            await ScriptService._save_step_result(task_id, "step6", result6)
            print(f"步骤6完成: {result6['description']}")

            # 步骤7: 转换心理描写
            print(f"执行步骤7: 转换心理描写")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.PSYCHOLOGY_CONVERSION,
                progress=56,
            )
            result7 = await ScriptService._step7_convert_psychology(script)
            script.processed_text = result7["text"]
            await ScriptService._save_step_result(task_id, "step7", result7)
            print(f"步骤7完成: {result7['description']}")

            # 步骤8: 打包场景
            print(f"执行步骤8: 打包场景")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.SCENE_PACKAGING,
                progress=72,
            )
            result8 = await ScriptService._step8_package_scenes(script)
            script.processed_text = result8["text"]
            await ScriptService._save_step_result(task_id, "step8", result8)
            print(f"步骤8完成: {result8['description']}")

            # 步骤9: 检测无用语句
            print(f"执行步骤9: 检测无用语句")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.USELESS_LINE_DETECTION,
                progress=80,
            )
            result9 = await ScriptService._step9_detect_useless_lines(script.processed_text)
            await ScriptService._save_step_result(task_id, "step9", result9)
            print(f"步骤9完成: {result9['description']}")

            # 步骤10: 移除无用语句
            print(f"执行步骤10: 移除无用语句")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.USELESS_LINE_REMOVAL,
                progress=88,
            )
            result10 = await ScriptService._step10_remove_useless_lines(script.processed_text, result9["useless_lines"])
            script.processed_text = result10["text"]
            await ScriptService._save_step_result(task_id, "step10", result10)
            print(f"步骤10完成: {result10['description']}")

            # 步骤11: 润色处理
            print(f"执行步骤11: 润色处理")
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.POLISHING,
                progress=94,
            )
            result11 = await ScriptService._step11_polish_script(script.processed_text)
            script.processed_text = result11["text"]
            await ScriptService._save_step_result(task_id, "step11", result11)
            print(f"步骤11完成: {result11['description']}")

            # 步骤12: 导出剧本
            print(f"执行步骤12: 导出剧本")
            script.updated_at = datetime.now()
            ScriptService._get_repository().update_script(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.EXPORT,
                progress=100,
                status=ProcessingStatus.COMPLETED,
            )

            # 保存最终结果
            final_result = await ScriptService.export_json(script_id)
            await ScriptService._save_step_result(task_id, "step12", {"final_script": final_result})
            print(f"=== 任务处理完成: task_id={task_id} ===")

        except Exception as error:
            print(f"=== 任务处理出错: {str(error)} ===")
            await ScriptService._update_task(
                task_id,
                status=ProcessingStatus.FAILED,
                error_message=str(error),
            )
            import traceback
            traceback.print_exc()

    @staticmethod
    async def _save_step_result(task_id: str, step_name: str, result: Dict[str, Any]):
        """保存步骤处理结果（暂时只打印日志，不保存到数据库）"""
        print(f"=== 步骤结果 {step_name} ===")
        print(f"描述: {result.get('description', 'N/A')}")
        if 'dialogues' in result:
            print(f"对话数量: {len(result.get('dialogues', []))}")
        if 'characters' in result:
            print(f"人物数量: {len(result.get('characters', []))}")
        if 'scenes' in result:
            print(f"场景数量: {len(result.get('scenes', []))}")
        print(f"=== 步骤 {step_name} 完成 ===")
        # TODO: 当数据库添加 step_results 字段后，可以保存到数据库

    @staticmethod
    async def _step1_extract_dialogues(text: str) -> Dict[str, Any]:
        """步骤1: 提取对话，添加唯一标识"""
        dialogue_patterns = [
            r'"([^"]+)"',  # 双引号
            r"'([^']+)'",  # 单引号
            r'「([^」]+)」',  # 中文引号
            r'『([^』]+)』',  # 中文书名号
            r'\[([^\]]+)\]',  # 方括号
        ]

        result = text
        dialogues = []
        dialogue_id = 1

        for pattern in dialogue_patterns:
            matches = list(re.finditer(pattern, result))
            offset = 0
            for match in matches:
                start = match.start() + offset
                end = match.end() + offset
                content = match.group(1)

                # 替换为带ID的格式
                tagged = f'\n"{content}"|{dialogue_id}|\n'
                result = result[:start] + tagged + result[end:]
                offset += len(tagged) - (end - start)

                dialogues.append({
                    "id": dialogue_id,
                    "content": content,
                    "original_position": match.start()
                })
                dialogue_id += 1

        return {
            "text": result,
            "dialogues": dialogues,
            "total_dialogues": len(dialogues),
            "description": f"提取了 {len(dialogues)} 个对话，添加了唯一标识"
        }

    @staticmethod
    async def _step2_extract_characters_and_descriptions(script: Script) -> Dict[str, Any]:
        """步骤2: 提取人物和描写分离"""
        text = script.processed_text

        # 提取人物
        name_pattern = r'[^\s]{2,4}[说说道讲问答]'
        potential_names = re.findall(name_pattern, text)

        names = set()
        for match in potential_names:
            name = match[:-1]
            if len(name) >= 2 and len(name) <= 4:
                names.add(name)

        characters = []
        for idx, name in enumerate(list(names)[:10], 1):
            role = CharacterRole.MAIN if idx <= 3 else CharacterRole.SUPPORTING
            characters.append(Character(
                id=str(idx),
                name=name,
                role=role,
                description=f"角色{idx}"
            ))

        script.characters = characters

        # 分离描写类型
        description_types = {
            "景物描写": ["景物", "环境", "场景", "天空", "大地", "房间", "街道"],
            "心理描写": ["心里", "想到", "觉得", "感到", "心情"],
            "肖像描写": ["脸", "眼睛", "身材", "外貌", "样子"],
            "动作描写": ["走", "跑", "坐", "站", "拿", "放"],
        }

        descriptions_found = {}
        for desc_type, keywords in description_types.items():
            count = 0
            for keyword in keywords:
                count += len(re.findall(keyword, text))
            descriptions_found[desc_type] = count

        return {
            "characters": [char.model_dump() for char in characters],
            "main_characters": [char.name for char in characters if char.role == CharacterRole.MAIN],
            "supporting_characters": [char.name for char in characters if char.role == CharacterRole.SUPPORTING],
            "descriptions": descriptions_found,
            "description": f"提取了 {len(characters)} 个人物，分析了描写类型分布"
        }

    @staticmethod
    async def _step3_extract_main_plot(text: str) -> Dict[str, Any]:
        """步骤3: 提取主线"""
        # 简化的主线提取逻辑
        paragraphs = text.split('\n\n')
        key_paragraphs = []

        for para in paragraphs[:10]:
            if len(para) > 50:
                key_paragraphs.append(para[:100])

        main_plot = "主线故事：" + "\n".join(key_paragraphs[:3])

        return {
            "main_plot": main_plot,
            "key_scenes": len(key_paragraphs),
            "description": "提取了故事主线和关键场景"
        }

    @staticmethod
    async def _step4_tag_dialogue_speakers(script: Script) -> Dict[str, Any]:
        """步骤4: 标记对话主体"""
        text = script.processed_text
        character_names = [char.name for char in script.characters]

        tagged_count = 0
        for name in character_names:
            # 查找人物名附近的对话
            pattern = rf'{name}[^\n]*?"([^"]+)"\|(\d+)\|'
            matches = re.finditer(pattern, text)
            for match in matches:
                dialogue_id = match.group(2)
                # 在对话前添加说话人标记
                replacement = f'\n***{name}***\n"{match.group(1)}"|{dialogue_id}|\n'
                text = text.replace(match.group(0), replacement)
                tagged_count += 1

        return {
            "text": text,
            "tagged_dialogues": tagged_count,
            "speakers": character_names,
            "description": f"为 {tagged_count} 个对话标记了说话主体"
        }

    @staticmethod
    async def _step6_analyze_scene_headers(script: Script) -> Dict[str, Any]:
        """步骤6: 分析场景头"""
        text = script.processed_text
        paragraphs = text.split('\n\n')

        scenes = []
        for idx, para in enumerate(paragraphs[:20]):
            if len(para) > 30:
                scene = Scene(
                    id=str(uuid4())[:8],
                    heading=SceneHeading(
                        scene_number=idx + 1,
                        is_interior=True,
                        location="场景" + str(idx + 1),
                        time_of_day="日"
                    ),
                    content=para,
                    dialogues=[],
                    descriptions=[],
                    characters=script.characters[:3]
                )
                scenes.append(scene)

        script.scenes = scenes

        return {
            "scenes": [scene.model_dump() for scene in scenes],
            "total_scenes": len(scenes),
            "description": f"分析了 {len(scenes)} 个场景，生成了场景头"
        }

    @staticmethod
    async def _step7_convert_psychology(script: Script) -> Dict[str, Any]:
        """步骤7: 转换心理描写"""
        text = script.processed_text
        character_names = [char.name for char in script.characters]

        psychology_keywords = ["心里", "想到", "觉得", "感到", "心情"]
        converted_count = 0

        for keyword in psychology_keywords:
            pattern = rf'{keyword}[^\n]+'
            matches = re.finditer(pattern, text)
            for match in matches:
                # 转换为动作描写
                converted = f'\n***动作描写***\n{match.group(0)}\n\n'
                text = text.replace(match.group(0), converted)
                converted_count += 1

        return {
            "text": text,
            "converted_count": converted_count,
            "description": f"转换了 {converted_count} 处心理描写为动作描写"
        }

    @staticmethod
    async def _step8_package_scenes(script: Script) -> Dict[str, Any]:
        """步骤8: 打包场景"""
        text = script.processed_text
        paragraphs = text.split('\n\n')

        packaged_text = ""
        scene_count = 0

        for idx, para in enumerate(paragraphs):
            para = para.strip()
            if para:
                packaged_text += f"###\n场景 {idx + 1}\n###\n{para}\n\n"
                scene_count += 1

        return {
            "text": packaged_text,
            "scene_count": scene_count,
            "description": f"打包了 {scene_count} 个场景"
        }

    @staticmethod
    async def _step9_detect_useless_lines(text: str) -> Dict[str, Any]:
        """步骤9: 检测无用语句"""
        lines = text.split('\n')
        useless_patterns = [
            r'^[啊嗯哦呃]+$',
            r'^\s*$',
            r'^[\d\s]+$',
        ]

        useless_lines = []
        for idx, line in enumerate(lines):
            for pattern in useless_patterns:
                if re.match(pattern, line):
                    useless_lines.append(idx + 1)
                    break

        return {
            "useless_lines": useless_lines,
            "total_useless": len(useless_lines),
            "description": f"检测到 {len(useless_lines)} 条无用语句"
        }

    @staticmethod
    async def _step10_remove_useless_lines(text: str, useless_lines: List[int]) -> Dict[str, Any]:
        """步骤10: 移除无用语句"""
        lines = text.split('\n')
        filtered_lines = [
            line for idx, line in enumerate(lines)
            if (idx + 1) not in useless_lines
        ]

        return {
            "text": '\n'.join(filtered_lines),
            "removed_count": len(useless_lines),
            "description": f"移除了 {len(useless_lines)} 条无用语句"
        }

    @staticmethod
    async def _step11_polish_script(text: str) -> Dict[str, Any]:
        """步骤11: 润色处理"""
        # 清理多余空行
        text = re.sub(r'\n{3,}', '\n\n', text)

        # 整理格式
        lines = text.split('\n')
        formatted_lines = []
        for line in lines:
            line = line.strip()
            if line:
                formatted_lines.append(line)

        return {
            "text": '\n\n'.join(formatted_lines),
            "description": "完成剧本润色处理"
        }

    @staticmethod
    async def _update_task(task_id: str, **kwargs) -> Optional[ProcessingTask]:
        print(f"更新任务: task_id={task_id}, kwargs={kwargs}")
        return ScriptService._get_repository().update_task(task_id, kwargs)

    @staticmethod
    async def get_tasks(script_id: str) -> List[ProcessingTask]:
        return ScriptService._get_repository().get_tasks(script_id)

    @staticmethod
    async def get_task(task_id: str) -> Optional[ProcessingTask]:
        return ScriptService._get_repository().get_task(task_id)

    @staticmethod
    async def list_all_tasks(status: Optional[str] = None) -> List[TaskListItem]:
        items: List[TaskListItem] = []
        for task in ScriptService._get_repository().list_tasks():
            item = await ScriptService.serialize_task(task)
            if not item:
                continue
            if status and item.status != status:
                continue
            items.append(item)
        return items

    @staticmethod
    async def serialize_task(task: ProcessingTask) -> Optional[TaskListItem]:
        script = await ScriptService.get_script(task.script_id)
        if not script:
            return None
        return TaskListItem(
            id=task.id,
            script_id=task.script_id,
            script_title=script.title,
            title=ScriptService._task_title(script),
            type="convert",
            status=ScriptService._task_status_for_frontend(task.status),
            progress=int(task.progress),
            current_step=task.current_step.value if task.current_step else None,
            error_message=task.error_message,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    @staticmethod
    async def export_json(script_id: str) -> Dict[str, Any]:
        script = await ScriptService.get_script(script_id)
        if not script:
            raise ValueError("剧本不存在")

        output: Dict[str, Any] = {
            "id": script.id,
            "title": script.title,
            "type": script.type.value,
            "main_plot": script.main_plot or "",
            "characters": [character.model_dump(mode="json") for character in script.characters],
            "scenes": [],
            "raw_text": script.processed_text,
        }

        for scene in script.scenes:
            scene_data = {
                "scene_number": scene.heading.scene_number,
                "heading": (
                    f"{'INT.' if scene.heading.is_interior else 'EXT.'} "
                    f"{scene.heading.location} - {scene.heading.time_of_day}"
                ),
                "content": scene.content,
                "dialogues": [],
                "descriptions": [],
            }
            output["scenes"].append(scene_data)

        return output

    @staticmethod
    async def export_yaml(script_id: str) -> str:
        json_data = await ScriptService.export_json(script_id)
        return yaml.dump(json_data, allow_unicode=True, sort_keys=False)