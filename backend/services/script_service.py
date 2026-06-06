"""
Script Processing Service.
Handles the complete script processing workflow with Supabase persistence.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

import yaml

from repositories import SupabaseScriptRepository
from schemas.script_schema import (
    Character,
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
    """剧本处理服务"""

    _repository: Optional[SupabaseScriptRepository] = None

    @classmethod
    def _get_repository(cls) -> SupabaseScriptRepository:
        if cls._repository is None:
            cls._repository = SupabaseScriptRepository()
        return cls._repository

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
        return f"{script.title} · AI 转换"

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
            steps=steps,
            status=ProcessingStatus.PENDING,
        )
        return ScriptService._get_repository().create_task(task)

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
            await ScriptService._update_task(task_id, status=ProcessingStatus.PROCESSING)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.DIALOGUE_EXTRACTION,
                progress=10,
            )
            await ScriptService._extract_dialogues(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.CHARACTER_EXTRACTION,
                progress=20,
            )
            await ScriptService._extract_characters(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.MAIN_PLOT_EXTRACTION,
                progress=30,
            )
            await ScriptService._extract_main_plot(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.DIALOGUE_SPEAKER_TAGGING,
                progress=40,
            )
            await ScriptService._tag_dialogue_speakers(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.SCENE_ANALYSIS,
                progress=50,
            )
            await ScriptService._analyze_scenes(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.PSYCHOLOGY_CONVERSION,
                progress=60,
            )
            await ScriptService._convert_psychology(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.SCENE_PACKAGING,
                progress=70,
            )
            await ScriptService._package_scenes(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.USELESS_LINE_DETECTION,
                progress=80,
            )
            useless_lines = await ScriptService._detect_useless_lines(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.USELESS_LINE_REMOVAL,
                progress=90,
            )
            await ScriptService._remove_useless_lines(script, useless_lines)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.POLISHING,
                progress=95,
            )
            await ScriptService._polish_script(script)

            script.updated_at = datetime.now()
            ScriptService._get_repository().update_script(script)

            await ScriptService._update_task(
                task_id,
                current_step=ProcessingStep.EXPORT,
                progress=100,
                status=ProcessingStatus.COMPLETED,
            )
        except Exception as error:
            await ScriptService._update_task(
                task_id,
                status=ProcessingStatus.FAILED,
                error_message=str(error),
            )

    @staticmethod
    async def _extract_dialogues(script: Script):
        ai_service = AIService()
        await ai_service.extract_dialogues(script.original_text)

    @staticmethod
    async def _extract_characters(script: Script):
        ai_service = AIService()
        result = await ai_service.extract_characters(script.original_text)
        script.characters = []
        for char_data in result["main_characters"]:
            script.characters.append(Character(**char_data))
        for char_data in result["supporting_characters"]:
            script.characters.append(Character(**char_data))

    @staticmethod
    async def _extract_main_plot(script: Script):
        ai_service = AIService()
        script.main_plot = await ai_service.extract_main_plot(script.original_text)

    @staticmethod
    async def _tag_dialogue_speakers(script: Script):
        ai_service = AIService()
        await ai_service.tag_dialogue_speakers(
            script.original_text,
            [character.model_dump() for character in script.characters],
        )

    @staticmethod
    async def _analyze_scenes(script: Script):
        paragraphs = [
            paragraph.strip()
            for paragraph in script.original_text.split("\n\n")
            if paragraph.strip()
        ]
        script.scenes = []
        ai_service = AIService()

        for index, paragraph in enumerate(paragraphs[:5]):
            scene_heading = await ai_service.analyze_scene(paragraph, index + 1)
            scene = Scene(
                id=str(uuid4())[:8],
                heading=SceneHeading(**scene_heading),
                dialogues=[],
                descriptions=[],
                characters=[],
            )
            script.scenes.append(scene)

    @staticmethod
    async def _convert_psychology(script: Script):
        ai_service = AIService()
        for scene in script.scenes:
            for index, description in enumerate(scene.descriptions):
                if description.get("type") == "psychology":
                    character_name = description.get("subject_name", "某人")
                    converted = await ai_service.convert_psychology(
                        description["content"],
                        character_name,
                    )
                    scene.descriptions[index] = {
                        "type": "action",
                        "subject_name": character_name,
                        "content": converted,
                    }

    @staticmethod
    async def _package_scenes(script: Script):
        packaged_text = ""
        for scene in script.scenes:
            packaged_text += "###\n"
            packaged_text += f"{scene.heading.scene_number}. "
            packaged_text += (
                f"{'INT.' if scene.heading.is_interior else 'EXT.'} "
                f"{scene.heading.location} - {scene.heading.time_of_day}\n"
            )
            packaged_text += "###\n\n"
        script.processed_text = packaged_text

    @staticmethod
    async def _detect_useless_lines(script: Script) -> List[int]:
        ai_service = AIService()
        return await ai_service.detect_useless_lines(script.original_text)

    @staticmethod
    async def _remove_useless_lines(script: Script, useless_lines: List[int]):
        lines = script.original_text.split("\n")
        filtered_lines = [
            line for index, line in enumerate(lines) if (index + 1) not in useless_lines
        ]
        script.processed_text = "\n".join(filtered_lines)

    @staticmethod
    async def _polish_script(script: Script):
        ai_service = AIService()
        if script.processed_text:
            script.processed_text = await ai_service.polish_script(script.processed_text)
        else:
            script.processed_text = await ai_service.polish_script(script.original_text)

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
            "main_plot": script.main_plot,
            "characters": [character.model_dump(mode="json") for character in script.characters],
            "scenes": [],
        }

        for scene in script.scenes:
            scene_data = {
                "scene_number": scene.heading.scene_number,
                "heading": (
                    f"{'INT.' if scene.heading.is_interior else 'EXT.'} "
                    f"{scene.heading.location} - {scene.heading.time_of_day}"
                ),
                "dialogues": [],
                "descriptions": [],
            }

            for dialogue in scene.dialogues:
                scene_data["dialogues"].append(
                    {
                        "speaker": dialogue.speaker_name,
                        "content": dialogue.content,
                        "emotion": dialogue.emotion,
                    }
                )

            for description in scene.descriptions:
                scene_data["descriptions"].append(description)

            output["scenes"].append(scene_data)

        return output

    @staticmethod
    async def export_yaml(script_id: str) -> str:
        json_data = await ScriptService.export_json(script_id)
        return yaml.dump(json_data, allow_unicode=True, sort_keys=False)
