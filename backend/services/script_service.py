"""
Script Processing Service.
Handles the complete script processing workflow.
"""
from typing import List, Dict, Any, Optional
from uuid import uuid4
from datetime import datetime
import json
import yaml
import re
from schemas.script_schema import (
    Script, ScriptType, Character, CharacterRole,
    Dialogue, Scene, SceneHeading, DescriptionType,
    ProcessingTask, ProcessingStep, ProcessingStatus, ScriptCreateRequest,
    TaskListItem
)
from services.ai_service import AIService
from core.utils import success_response, text_deal


class ScriptService:
    """剧本处理服务"""
    
    # 内存存储（临时，后续替换为数据库）
    _scripts: Dict[str, Script] = {}
    _tasks: Dict[str, ProcessingTask] = {}

    @staticmethod
    def _task_status_for_frontend(status: ProcessingStatus) -> str:
        """将后端处理状态映射到前端展示状态"""
        mapping = {
            ProcessingStatus.PENDING: "queued",
            ProcessingStatus.PROCESSING: "running",
            ProcessingStatus.COMPLETED: "done",
            ProcessingStatus.FAILED: "failed",
        }
        return mapping.get(status, "queued")

    @staticmethod
    def _task_title(script: Script) -> str:
        """生成任务标题"""
        return f"{script.title} · AI 转换"

    @staticmethod
    def serialize_task(task: ProcessingTask) -> Optional[TaskListItem]:
        """将处理任务序列化为前端消费结构"""
        script = ScriptService._scripts.get(task.script_id)
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
    async def create_script(request: ScriptCreateRequest) -> Script:
        """创建新剧本"""
        script_id = str(uuid4())
        script = Script(
            id=script_id,
            title=request.title,
            type=request.type,
            original_text=request.text
        )
        ScriptService._scripts[script_id] = script
        return script

    @staticmethod
    async def get_script(script_id: str) -> Optional[Script]:
        """获取剧本详情"""
        return ScriptService._scripts.get(script_id)

    @staticmethod
    async def list_scripts(type: Optional[ScriptType] = None) -> List[Script]:
        """获取剧本列表"""
        scripts = list(ScriptService._scripts.values())
        if type:
            scripts = [s for s in scripts if s.type == type]
        return scripts

    @staticmethod
    async def delete_script(script_id: str) -> bool:
        """删除剧本"""
        if script_id in ScriptService._scripts:
            del ScriptService._scripts[script_id]
            # 删除关联任务
            task_ids_to_delete = [tid for tid, task in ScriptService._tasks.items() if task.script_id == script_id]
            for tid in task_ids_to_delete:
                del ScriptService._tasks[tid]
            return True
        return False

    @staticmethod
    async def create_processing_task(script_id: str) -> ProcessingTask:
        """创建处理任务"""
        if script_id not in ScriptService._scripts:
            raise ValueError(f"剧本不存在: {script_id}")
        
        task_id = str(uuid4())
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
            ProcessingStep.EXPORT
        ]
        
        task = ProcessingTask(
            id=task_id,
            script_id=script_id,
            steps=steps,
            status=ProcessingStatus.PENDING
        )
        ScriptService._tasks[task_id] = task
        return task

    @staticmethod
    async def process_script(script_id: str, task_id: str):
        """处理剧本（完整流程）"""
        script = await ScriptService.get_script(script_id)
        if not script:
            await ScriptService._update_task(
                task_id, 
                status=ProcessingStatus.FAILED, 
                error_message="剧本不存在"
            )
            return

        task = ScriptService._tasks.get(task_id)
        if not task:
            return

        try:
            # 更新任务状态为处理中
            await ScriptService._update_task(task_id, status=ProcessingStatus.PROCESSING)

            # 步骤1: 对话提取
            await ScriptService._update_task(task_id, current_step=ProcessingStep.DIALOGUE_EXTRACTION, progress=10)
            await ScriptService._extract_dialogues(script)

            # 步骤2: 人物提取
            await ScriptService._update_task(task_id, current_step=ProcessingStep.CHARACTER_EXTRACTION, progress=20)
            await ScriptService._extract_characters(script)

            # 步骤3: 主线提取
            await ScriptService._update_task(task_id, current_step=ProcessingStep.MAIN_PLOT_EXTRACTION, progress=30)
            await ScriptService._extract_main_plot(script)

            # 步骤4: 对话主体标记
            await ScriptService._update_task(task_id, current_step=ProcessingStep.DIALOGUE_SPEAKER_TAGGING, progress=40)
            await ScriptService._tag_dialogue_speakers(script)

            # 步骤5/6: 场景分析
            await ScriptService._update_task(task_id, current_step=ProcessingStep.SCENE_ANALYSIS, progress=50)
            await ScriptService._analyze_scenes(script)

            # 步骤7: 心理描写转化
            await ScriptService._update_task(task_id, current_step=ProcessingStep.PSYCHOLOGY_CONVERSION, progress=60)
            await ScriptService._convert_psychology(script)

            # 步骤8: 场景区分打包
            await ScriptService._update_task(task_id, current_step=ProcessingStep.SCENE_PACKAGING, progress=70)
            await ScriptService._package_scenes(script)

            # 步骤9: 无用语句检测
            await ScriptService._update_task(task_id, current_step=ProcessingStep.USELESS_LINE_DETECTION, progress=80)
            useless_lines = await ScriptService._detect_useless_lines(script)

            # 步骤10: 无用语句去除
            await ScriptService._update_task(task_id, current_step=ProcessingStep.USELESS_LINE_REMOVAL, progress=90)
            await ScriptService._remove_useless_lines(script, useless_lines)

            # 步骤11: 润色处理
            await ScriptService._update_task(task_id, current_step=ProcessingStep.POLISHING, progress=95)
            await ScriptService._polish_script(script)

            # 步骤12: 导出
            await ScriptService._update_task(task_id, current_step=ProcessingStep.EXPORT, progress=100)

            # 更新任务状态为完成
            await ScriptService._update_task(task_id, status=ProcessingStatus.COMPLETED)

        except Exception as e:
            await ScriptService._update_task(
                task_id, 
                status=ProcessingStatus.FAILED, 
                error_message=str(e)
            )

    @staticmethod
    async def _extract_dialogues(script: Script):
        """提取对话（步骤1）"""
        dialogues = AIService.extract_dialogues(script.original_text)
        # 暂时不保存，等后续处理

    @staticmethod
    async def _extract_characters(script: Script):
        """提取人物（步骤2）"""
        result = AIService.extract_characters(script.original_text)
        
        script.characters = []
        for char_data in result["main_characters"]:
            script.characters.append(Character(**char_data))
        for char_data in result["supporting_characters"]:
            script.characters.append(Character(**char_data))

    @staticmethod
    async def _extract_main_plot(script: Script):
        """提取主线（步骤3）"""
        script.main_plot = AIService.extract_main_plot(script.original_text)

    @staticmethod
    async def _tag_dialogue_speakers(script: Script):
        """标记对话主体（步骤4）"""
        tagged_dialogues = AIService.tag_dialogue_speakers(script.original_text, [c.dict() for c in script.characters])
        # 暂时不保存，等后续处理

    @staticmethod
    async def _analyze_scenes(script: Script):
        """分析场景（步骤6）"""
        # 简单规则：根据段落分割场景
        paragraphs = [p.strip() for p in script.original_text.split('\n\n') if p.strip()]
        script.scenes = []
        
        for i, paragraph in enumerate(paragraphs[:5]):  # 限制最多5个场景
            scene_heading = AIService.analyze_scene(paragraph, i + 1)
            scene = Scene(
                id=str(uuid4())[:8],
                heading=SceneHeading(**scene_heading),
                dialogues=[],
                descriptions=[],
                characters=[]
            )
            script.scenes.append(scene)

    @staticmethod
    async def _convert_psychology(script: Script):
        """转化心理描写（步骤7）"""
        for scene in script.scenes:
            for i, desc in enumerate(scene.descriptions):
                if desc.get("type") == "psychology":
                    character_name = desc.get("subject_name", "某人")
                    converted = AIService.convert_psychology(desc["content"], character_name)
                    scene.descriptions[i] = {
                        "type": "action",
                        "subject_name": character_name,
                        "content": converted
                    }

    @staticmethod
    async def _package_scenes(script: Script):
        """打包场景（步骤8）"""
        # 简单规则：用###分隔场景
        packaged_text = ""
        for scene in script.scenes:
            packaged_text += "###\n"
            packaged_text += f"{scene.heading.scene_number}. "
            packaged_text += f"{'INT.' if scene.heading.is_interior else 'EXT.'} "
            packaged_text += f"{scene.heading.location} - {scene.heading.time_of_day}\n"
            packaged_text += "###\n\n"
        script.processed_text = packaged_text

    @staticmethod
    async def _detect_useless_lines(script: Script) -> List[int]:
        """检测无用语句（步骤9）"""
        return AIService.detect_useless_lines(script.original_text)

    @staticmethod
    async def _remove_useless_lines(script: Script, useless_lines: List[int]):
        """去除无用语句（步骤10）"""
        lines = script.original_text.split('\n')
        filtered_lines = [line for i, line in enumerate(lines) if (i + 1) not in useless_lines]
        script.processed_text = '\n'.join(filtered_lines)

    @staticmethod
    async def _polish_script(script: Script):
        """润色剧本（步骤11）"""
        if script.processed_text:
            script.processed_text = AIService.polish_script(script.processed_text)
        else:
            script.processed_text = AIService.polish_script(script.original_text)

    @staticmethod
    async def _update_task(task_id: str, **kwargs):
        """更新任务状态"""
        if task_id in ScriptService._tasks:
            task = ScriptService._tasks[task_id]
            for key, value in kwargs.items():
                if hasattr(task, key):
                    setattr(task, key, value)
            task.updated_at = datetime.now()

    @staticmethod
    async def get_tasks(script_id: str) -> List[ProcessingTask]:
        """获取剧本的处理任务列表"""
        return [task for task in ScriptService._tasks.values() if task.script_id == script_id]

    @staticmethod
    async def get_task(task_id: str) -> Optional[ProcessingTask]:
        """获取单个处理任务"""
        return ScriptService._tasks.get(task_id)

    @staticmethod
    async def list_all_tasks(status: Optional[str] = None) -> List[TaskListItem]:
        """获取所有任务，供任务中心使用"""
        items: List[TaskListItem] = []
        for task in ScriptService._tasks.values():
            item = ScriptService.serialize_task(task)
            if not item:
                continue
            if status and item.status != status:
                continue
            items.append(item)

        items.sort(key=lambda item: item.updated_at, reverse=True)
        return items

    @staticmethod
    async def export_json(script_id: str) -> Dict[str, Any]:
        """导出为JSON格式"""
        script = await ScriptService.get_script(script_id)
        if not script:
            raise ValueError("剧本不存在")

        output = {
            "id": script.id,
            "title": script.title,
            "type": script.type.value,
            "main_plot": script.main_plot,
            "characters": [c.dict() for c in script.characters],
            "scenes": []
        }

        for scene in script.scenes:
            scene_data = {
                "scene_number": scene.heading.scene_number,
                "heading": f"{'INT.' if scene.heading.is_interior else 'EXT.'} {scene.heading.location} - {scene.heading.time_of_day}",
                "dialogues": [],
                "descriptions": []
            }

            for dialogue in scene.dialogues:
                scene_data["dialogues"].append({
                    "speaker": dialogue.speaker_name,
                    "content": dialogue.content,
                    "emotion": dialogue.emotion
                })

            for desc in scene.descriptions:
                scene_data["descriptions"].append(desc)

            output["scenes"].append(scene_data)

        return output

    @staticmethod
    async def export_yaml(script_id: str) -> str:
        """导出为YAML格式"""
        json_data = await ScriptService.export_json(script_id)
        return yaml.dump(json_data, allow_unicode=True, sort_keys=False)
