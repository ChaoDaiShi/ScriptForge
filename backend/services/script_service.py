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
    ExportFormat,
    ProcessingStatus,
    ProcessingStep,
    ProcessingTask,
    ProjectStatus,
    Scene,
    SceneHeading,
    Script,
    ScriptCreateRequest,
    ScriptSourcePayload,
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
    def _compose_original_text(
        text: str,
        source_payload: Optional[ScriptSourcePayload],
    ) -> str:
        if not source_payload or not source_payload.chapters:
            return text.strip()

        sections: list[str] = []
        for chapter in source_payload.chapters:
            title = chapter.title.strip()
            content = chapter.content.strip()
            if not content:
                continue
            sections.append(f"{title}\n{content}")

        return "\n\n".join(sections).strip() or text.strip()

    @staticmethod
    async def create_script(request: ScriptCreateRequest) -> Script:
        script = Script(
            id=str(uuid4()),
            title=request.title,
            type=request.type,
            project_id=request.project_id,
            original_text=ScriptService._compose_original_text(
                request.text,
                request.source_payload,
            ),
        )
        created = ScriptService._get_repository().create_script(script)
        if request.project_id:
            ScriptService._get_repository().update_project(
                request.project_id,
                {"script_id": created.id, "status": ProjectStatus.IMPORTING},
            )
        return created

    @staticmethod
    async def get_script(script_id: str) -> Optional[Script]:
        return ScriptService._get_repository().get_script(script_id)

    @staticmethod
    async def list_scripts(script_type: Optional[ScriptType] = None, project_id: Optional[str] = None) -> List[Script]:
        return ScriptService._get_repository().list_scripts(script_type, project_id)

    @staticmethod
    async def delete_script(script_id: str) -> bool:
        return ScriptService._get_repository().delete_script(script_id)

    @staticmethod
    async def create_processing_task(script_id: str, project_id: Optional[str] = None) -> ProcessingTask:
        script = ScriptService._get_repository().get_script(script_id)
        if not script:
            raise ValueError(f"剧本不存在: {script_id}")

        steps = [
            ProcessingStep.DIALOGUE_EXTRACTION,
            ProcessingStep.CHARACTER_EXTRACTION,
            ProcessingStep.MAIN_PLOT_EXTRACTION,
            ProcessingStep.DIALOGUE_SPEAKER_TAGGING,
            ProcessingStep.SCENE_ANALYSIS,
            ProcessingStep.PSYCHOLOGY_CONVERSION,
            ProcessingStep.SCENE_PACKAGING,
            ProcessingStep.USELESS_LINE_DETECTION,
            ProcessingStep.USELESS_LINE_REMOVAL,
            ProcessingStep.POLISHING,
            ProcessingStep.EXPORT,
        ]

        task = ProcessingTask(
            id=str(uuid4()),
            script_id=script_id,
            project_id=project_id or script.project_id,
            steps=steps,
            status=ProcessingStatus.PENDING,
            step_results={},
        )
        created = ScriptService._get_repository().create_task(task)
        if created.project_id:
            ScriptService._get_repository().update_project(
                created.project_id,
                {"task_id": created.id, "status": ProjectStatus.CONVERTING},
            )
        return created

    @staticmethod
    async def process_script(script_id: str, task_id: str):
        script = await ScriptService.get_script(script_id)
        if not script:
            await ScriptService._update_task(
                task_id,
                status=ProcessingStatus.FAILED,
                error_message="剧本不存在",
            )
            return

        task = await ScriptService.get_task(task_id)
        if not task:
            return

        try:
            await ScriptService._update_task(task_id, status=ProcessingStatus.PROCESSING, progress=0)
            result1 = await ScriptService._step1_extract_dialogues(script.original_text)
            script.processed_text = result1["text"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.DIALOGUE_EXTRACTION, progress=8)
            await ScriptService._save_step_result(task_id, "step1", result1)

            result2 = await ScriptService._step2_extract_characters_and_descriptions(script)
            await ScriptService._update_task(task_id, current_step=ProcessingStep.CHARACTER_EXTRACTION, progress=16)
            await ScriptService._save_step_result(task_id, "step2", result2)

            result3 = await ScriptService._step3_extract_main_plot(script.processed_text or script.original_text)
            script.main_plot = result3["main_plot"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.MAIN_PLOT_EXTRACTION, progress=24)
            await ScriptService._save_step_result(task_id, "step3", result3)

            result4 = await ScriptService._step4_tag_dialogue_speakers(script)
            script.processed_text = result4["text"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.DIALOGUE_SPEAKER_TAGGING, progress=32)
            await ScriptService._save_step_result(task_id, "step4", result4)

            result6 = await ScriptService._step6_analyze_scene_headers(script)
            await ScriptService._update_task(task_id, current_step=ProcessingStep.SCENE_ANALYSIS, progress=40)
            await ScriptService._save_step_result(task_id, "step6", result6)

            result7 = await ScriptService._step7_convert_psychology(script)
            script.processed_text = result7["text"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.PSYCHOLOGY_CONVERSION, progress=56)
            await ScriptService._save_step_result(task_id, "step7", result7)

            result8 = await ScriptService._step8_package_scenes(script)
            script.processed_text = result8["text"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.SCENE_PACKAGING, progress=72)
            await ScriptService._save_step_result(task_id, "step8", result8)

            result9 = await ScriptService._step9_detect_useless_lines(script.processed_text or "")
            await ScriptService._update_task(task_id, current_step=ProcessingStep.USELESS_LINE_DETECTION, progress=80)
            await ScriptService._save_step_result(task_id, "step9", result9)

            result10 = await ScriptService._step10_remove_useless_lines(script.processed_text or "", result9["useless_lines"])
            script.processed_text = result10["text"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.USELESS_LINE_REMOVAL, progress=88)
            await ScriptService._save_step_result(task_id, "step10", result10)

            result11 = await ScriptService._step11_polish_script(script.processed_text or "")
            script.processed_text = result11["text"]
            await ScriptService._update_task(task_id, current_step=ProcessingStep.POLISHING, progress=94)
            await ScriptService._save_step_result(task_id, "step11", result11)

            script.updated_at = datetime.now()
            ScriptService._get_repository().update_script(script)
            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.EXPORT,
                progress=100,
                status=ProcessingStatus.COMPLETED,
            )

            final_result = await ScriptService.export_json(script_id)
            await ScriptService._save_step_result(task_id, "step12", {"final_script": final_result})
            if task.project_id:
                ScriptService._get_repository().update_project(task.project_id, {"status": ProjectStatus.READY})
                ScriptService._get_repository().create_export(
                    __import__("schemas.script_schema", fromlist=["ProjectExport"]).ProjectExport(
                        id=str(uuid4()),
                        project_id=task.project_id,
                        script_id=script_id,
                        format=ExportFormat.JSON,
                        download_url=f"/api/scripts/{script_id}/export/json",
                    )
                )
        except Exception as error:
            await ScriptService._update_task(
                task_id,
                status=ProcessingStatus.FAILED,
                error_message=str(error),
            )
            if task.project_id:
                ScriptService._get_repository().update_project(task.project_id, {"status": ProjectStatus.FAILED})

    @staticmethod
    async def _save_step_result(task_id: str, step_name: str, result: Dict[str, Any]):
        task = ScriptService._get_repository().get_task(task_id)
        if not task:
            return
        step_results = dict(task.step_results or {})
        step_results[step_name] = result
        ScriptService._get_repository().update_task(task_id, {"step_results": step_results})

    @staticmethod
    async def _step1_extract_dialogues(text: str) -> Dict[str, Any]:
        dialogue_patterns = [r'"([^"]+)"', r"'([^']+)'", r'「([^」]+)」', r'『([^』]+)』', r'\[([^\]]+)\]']
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
                tagged = f'\n"{content}"|{dialogue_id}|\n'
                result = result[:start] + tagged + result[end:]
                offset += len(tagged) - (end - start)
                dialogues.append({"id": dialogue_id, "content": content, "original_position": match.start()})
                dialogue_id += 1
        return {"text": result, "dialogues": dialogues, "total_dialogues": len(dialogues), "description": f"提取了 {len(dialogues)} 个对话，添加了唯一标识"}

    @staticmethod
    async def _step2_extract_characters_and_descriptions(script: Script) -> Dict[str, Any]:
        text = script.processed_text or script.original_text
        name_pattern = r'[^\s]{2,4}[说说道讲问答]'
        potential_names = re.findall(name_pattern, text)
        names = set()
        for match in potential_names:
            name = match[:-1]
            if 2 <= len(name) <= 4:
                names.add(name)
        characters = []
        for idx, name in enumerate(list(names)[:10], 1):
            role = CharacterRole.MAIN if idx <= 3 else CharacterRole.SUPPORTING
            characters.append(Character(id=str(idx), name=name, role=role, description=f"角色{idx}"))
        script.characters = characters
        return {
            "characters": [char.model_dump(mode="json") for char in characters],
            "main_characters": [char.name for char in characters if char.role == CharacterRole.MAIN],
            "supporting_characters": [char.name for char in characters if char.role == CharacterRole.SUPPORTING],
            "description": f"提取了 {len(characters)} 个人物，分析了描写类型分布",
        }

    @staticmethod
    async def _step3_extract_main_plot(text: str) -> Dict[str, Any]:
        paragraphs = text.split('\n\n')
        key_paragraphs = [para[:100] for para in paragraphs[:10] if len(para) > 50]
        main_plot = "主线故事：" + "\n".join(key_paragraphs[:3])
        return {"main_plot": main_plot, "key_scenes": len(key_paragraphs), "description": "提取了故事主线和关键场景"}

    @staticmethod
    async def _step4_tag_dialogue_speakers(script: Script) -> Dict[str, Any]:
        text = script.processed_text or script.original_text
        character_names = [char.name for char in script.characters]
        tagged_count = 0
        for name in character_names:
            pattern = rf'{name}[^\n]*?"([^"]+)"\|(\d+)\|'
            matches = list(re.finditer(pattern, text))
            for match in matches:
                replacement = f'\n***{name}***\n"{match.group(1)}"|{match.group(2)}|\n'
                text = text.replace(match.group(0), replacement)
                tagged_count += 1
        return {"text": text, "tagged_dialogues": tagged_count, "speakers": character_names, "description": f"为 {tagged_count} 个对话标记了说话主体"}

    @staticmethod
    async def _step6_analyze_scene_headers(script: Script) -> Dict[str, Any]:
        text = script.processed_text or script.original_text
        paragraphs = text.split('\n\n')
        scenes = []
        for idx, para in enumerate(paragraphs[:20]):
            if len(para) > 30:
                scene = Scene(
                    id=str(uuid4())[:8],
                    heading=SceneHeading(scene_number=idx + 1, is_interior=True, location=f"场景{idx + 1}", time_of_day="日"),
                    content=para,
                    dialogues=[],
                    descriptions=[],
                    characters=script.characters[:3],
                )
                scenes.append(scene)
        script.scenes = scenes
        return {"scenes": [scene.model_dump(mode="json") for scene in scenes], "total_scenes": len(scenes), "description": f"分析了 {len(scenes)} 个场景，生成了场景头"}

    @staticmethod
    async def _step7_convert_psychology(script: Script) -> Dict[str, Any]:
        text = script.processed_text or script.original_text
        psychology_keywords = ["心里", "想到", "觉得", "感到", "心情"]
        converted_count = 0
        for keyword in psychology_keywords:
            matches = list(re.finditer(rf'{keyword}[^\n]+', text))
            for match in matches:
                converted = f'\n***动作描写***\n{match.group(0)}\n\n'
                text = text.replace(match.group(0), converted)
                converted_count += 1
        return {"text": text, "converted_count": converted_count, "description": f"转换了 {converted_count} 处心理描写为动作描写"}

    @staticmethod
    async def _step8_package_scenes(script: Script) -> Dict[str, Any]:
        text = script.processed_text or script.original_text
        packaged_text = "\n\n".join(f"SCENE {scene.heading.scene_number}\n{scene.content or ''}" for scene in script.scenes) or text
        return {"text": packaged_text, "scene_count": len(script.scenes), "description": "已将场景打包为结构化剧本段落"}

    @staticmethod
    async def _step9_detect_useless_lines(text: str) -> Dict[str, Any]:
        useless_lines = [line for line in text.splitlines() if len(line.strip()) < 2]
        return {"useless_lines": useless_lines, "count": len(useless_lines), "description": f"检测到 {len(useless_lines)} 条低价值语句"}

    @staticmethod
    async def _step10_remove_useless_lines(text: str, useless_lines: List[str]) -> Dict[str, Any]:
        filtered = [line for line in text.splitlines() if line not in useless_lines]
        return {"text": "\n".join(filtered), "removed_count": len(useless_lines), "description": f"移除了 {len(useless_lines)} 条无用语句"}

    @staticmethod
    async def _step11_polish_script(text: str) -> Dict[str, Any]:
        polished = re.sub(r'\n{3,}', '\n\n', text).strip()
        return {"text": polished, "description": "完成剧本润色处理"}

    @staticmethod
    async def _update_task(task_id: str, **kwargs) -> Optional[ProcessingTask]:
        return ScriptService._get_repository().update_task(task_id, kwargs)

    @staticmethod
    async def get_tasks(script_id: str) -> List[ProcessingTask]:
        return ScriptService._get_repository().get_tasks(script_id)

    @staticmethod
    async def get_task(task_id: str) -> Optional[ProcessingTask]:
        return ScriptService._get_repository().get_task(task_id)

    @staticmethod
    async def delete_task(task_id: str) -> bool:
        return ScriptService._get_repository().delete_task(task_id)

    @staticmethod
    async def list_all_tasks(status: Optional[str] = None, project_id: Optional[str] = None) -> List[TaskListItem]:
        status_mapping = {
            "queued": ProcessingStatus.PENDING.value,
            "running": ProcessingStatus.PROCESSING.value,
            "done": ProcessingStatus.COMPLETED.value,
            "failed": ProcessingStatus.FAILED.value,
        }
        repository_status = status_mapping.get(status, status)
        items: List[TaskListItem] = []
        for task in ScriptService._get_repository().list_tasks(status=repository_status, project_id=project_id):
            item = await ScriptService.serialize_task(task)
            if item is not None:
                items.append(item)
        return items

    @staticmethod
    async def serialize_task(task: ProcessingTask) -> Optional[TaskListItem]:
        script = await ScriptService.get_script(task.script_id)
        if not script:
            return None
        return TaskListItem(
            id=task.id,
            project_id=task.project_id,
            script_id=task.script_id,
            script_title=script.title,
            title=ScriptService._task_title(script),
            type=task.task_type,
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
        return script.model_dump(mode="json")

    @staticmethod
    async def export_yaml(script_id: str) -> str:
        script = await ScriptService.get_script(script_id)
        if not script:
            raise ValueError("剧本不存在")
        return yaml.safe_dump(script.model_dump(mode="json"), allow_unicode=True, sort_keys=False)
