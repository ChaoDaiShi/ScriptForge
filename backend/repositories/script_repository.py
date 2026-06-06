from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from core.database import get_supabase_client
from schemas.script_schema import ProcessingTask, Script, ScriptType


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseScriptRepository:
    """基于 Supabase 的剧本与任务仓储。"""

    def __init__(self) -> None:
        self.client = get_supabase_client()

    def create_script(self, script: Script) -> Script:
        payload = {
          "id": script.id,
          "title": script.title,
          "type": script.type.value,
          "original_text": script.original_text,
          "processed_text": script.processed_text,
          "main_plot": script.main_plot,
          "characters": [character.model_dump(mode="json") for character in script.characters],
          "scenes": [scene.model_dump(mode="json") for scene in script.scenes],
          "created_at": script.created_at.isoformat(),
          "updated_at": script.updated_at.isoformat(),
        }
        self.client.table("scripts").insert(payload).execute()
        return script

    def get_script(self, script_id: str) -> Optional[Script]:
        response = (
          self.client.table("scripts")
          .select("*")
          .eq("id", script_id)
          .limit(1)
          .execute()
        )
        rows = response.data or []
        if not rows:
            return None
        return self._row_to_script(rows[0])

    def list_scripts(self, script_type: Optional[ScriptType] = None) -> list[Script]:
        query = self.client.table("scripts").select("*").order("created_at", desc=True)
        if script_type:
            query = query.eq("type", script_type.value)
        response = query.execute()
        return [self._row_to_script(row) for row in (response.data or [])]

    def update_script(self, script: Script) -> Script:
        payload = {
          "title": script.title,
          "type": script.type.value,
          "original_text": script.original_text,
          "processed_text": script.processed_text,
          "main_plot": script.main_plot,
          "characters": [character.model_dump(mode="json") for character in script.characters],
          "scenes": [scene.model_dump(mode="json") for scene in script.scenes],
          "updated_at": _iso_now(),
        }
        self.client.table("scripts").update(payload).eq("id", script.id).execute()
        refreshed = self.get_script(script.id)
        return refreshed if refreshed else script

    def delete_script(self, script_id: str) -> bool:
        existing = self.get_script(script_id)
        if not existing:
            return False
        self.client.table("tasks").delete().eq("script_id", script_id).execute()
        self.client.table("scripts").delete().eq("id", script_id).execute()
        return True

    def create_task(self, task: ProcessingTask) -> ProcessingTask:
        payload = {
          "id": task.id,
          "script_id": task.script_id,
          "steps": [step.value for step in task.steps],
          "current_step": task.current_step.value if task.current_step else None,
          "status": task.status.value,
          "progress": task.progress,
          "error_message": task.error_message,
          "created_at": task.created_at.isoformat(),
          "updated_at": task.updated_at.isoformat(),
        }
        self.client.table("tasks").insert(payload).execute()
        return task

    def update_task(self, task_id: str, updates: dict[str, Any]) -> Optional[ProcessingTask]:
        payload = dict(updates)
        if "status" in payload and payload["status"] is not None:
            payload["status"] = payload["status"].value
        if "current_step" in payload and payload["current_step"] is not None:
            payload["current_step"] = payload["current_step"].value
        payload["updated_at"] = _iso_now()
        self.client.table("tasks").update(payload).eq("id", task_id).execute()
        return self.get_task(task_id)

    def get_task(self, task_id: str) -> Optional[ProcessingTask]:
        response = (
          self.client.table("tasks")
          .select("*")
          .eq("id", task_id)
          .limit(1)
          .execute()
        )
        rows = response.data or []
        if not rows:
            return None
        return self._row_to_task(rows[0])

    def get_tasks(self, script_id: str) -> list[ProcessingTask]:
        response = (
          self.client.table("tasks")
          .select("*")
          .eq("script_id", script_id)
          .order("created_at", desc=True)
          .execute()
        )
        return [self._row_to_task(row) for row in (response.data or [])]

    def list_tasks(self) -> list[ProcessingTask]:
        response = self.client.table("tasks").select("*").order("updated_at", desc=True).execute()
        return [self._row_to_task(row) for row in (response.data or [])]

    @staticmethod
    def _row_to_script(row: dict[str, Any]) -> Script:
        payload = dict(row)
        payload["type"] = ScriptType(payload["type"])
        return Script.model_validate(payload)

    @staticmethod
    def _row_to_task(row: dict[str, Any]) -> ProcessingTask:
        return ProcessingTask.model_validate(row)
