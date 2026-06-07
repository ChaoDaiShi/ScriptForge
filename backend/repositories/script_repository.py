from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from core.database import get_supabase_client
from schemas.script_schema import (
    DistributionJob,
    DistributionPlatform,
    ExportFormat,
    ProcessingTask,
    Project,
    ProjectExport,
    Script,
    ScriptType,
    User,
)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _local_users_path() -> Path:
    return Path(__file__).resolve().parent.parent / ".local_data" / "users.json"


class SupabaseScriptRepository:
    """基于 Supabase 的用户、项目、剧本、任务与分发仓储。"""

    def __init__(self) -> None:
        self.client = get_supabase_client()

    def create_user(self, user: User) -> User:
        payload = user.model_dump(mode="json")
        try:
            self.client.table("users").insert(payload).execute()
        except Exception as error:
            if not self._is_missing_users_table(error):
                raise
            self._create_local_user(user)
        return user

    def get_user_by_email(self, email: str) -> Optional[User]:
        try:
            response = self.client.table("users").select("*").eq("email", email).limit(1).execute()
            rows = response.data or []
            return User.model_validate(rows[0]) if rows else None
        except Exception as error:
            if not self._is_missing_users_table(error):
                raise
            return self._get_local_user_by_email(email)

    def get_user(self, user_id: str) -> Optional[User]:
        try:
            response = self.client.table("users").select("*").eq("id", user_id).limit(1).execute()
            rows = response.data or []
            return User.model_validate(rows[0]) if rows else None
        except Exception as error:
            if not self._is_missing_users_table(error):
                raise
            return self._get_local_user(user_id)

    def create_project(self, project: Project) -> Project:
        self.client.table("projects").insert(project.model_dump(mode="json")).execute()
        return project

    def list_projects(self, user_id: Optional[str] = None) -> list[Project]:
        query = self.client.table("projects").select("*").order("updated_at", desc=True)
        if user_id:
            query = query.eq("user_id", user_id)
        response = query.execute()
        return [Project.model_validate(row) for row in (response.data or [])]

    def get_project(self, project_id: str) -> Optional[Project]:
        response = self.client.table("projects").select("*").eq("id", project_id).limit(1).execute()
        rows = response.data or []
        return Project.model_validate(rows[0]) if rows else None

    def update_project(self, project_id: str, updates: dict[str, Any]) -> Optional[Project]:
        payload = {k: v.value if hasattr(v, "value") else v for k, v in updates.items() if v is not None}
        payload["updated_at"] = _iso_now()
        self.client.table("projects").update(payload).eq("id", project_id).execute()
        return self.get_project(project_id)

    def delete_project(self, project_id: str) -> bool:
        project = self.get_project(project_id)
        if not project:
            return False
        self.client.table("distribution_jobs").delete().eq("project_id", project_id).execute()
        self.client.table("project_exports").delete().eq("project_id", project_id).execute()
        self.client.table("tasks").delete().eq("project_id", project_id).execute()
        self.client.table("scripts").delete().eq("project_id", project_id).execute()
        self.client.table("projects").delete().eq("id", project_id).execute()
        return True

    def create_script(self, script: Script) -> Script:
        payload = {
            **script.model_dump(mode="json"),
            "type": script.type.value,
            "characters": [character.model_dump(mode="json") for character in script.characters],
            "scenes": [scene.model_dump(mode="json") for scene in script.scenes],
        }
        self.client.table("scripts").insert(payload).execute()
        return script

    def get_script(self, script_id: str) -> Optional[Script]:
        response = self.client.table("scripts").select("*").eq("id", script_id).limit(1).execute()
        rows = response.data or []
        return self._row_to_script(rows[0]) if rows else None

    def list_scripts(self, script_type: Optional[ScriptType] = None, project_id: Optional[str] = None) -> list[Script]:
        query = self.client.table("scripts").select("*").order("created_at", desc=True)
        if script_type:
            query = query.eq("type", script_type.value)
        if project_id:
            query = query.eq("project_id", project_id)
        response = query.execute()
        return [self._row_to_script(row) for row in (response.data or [])]

    def update_script(self, script: Script) -> Script:
        payload = {
            "title": script.title,
            "type": script.type.value,
            "original_text": script.original_text,
            "processed_text": script.processed_text,
            "main_plot": script.main_plot,
            "project_id": script.project_id,
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
        self.client.table("project_exports").delete().eq("script_id", script_id).execute()
        self.client.table("distribution_jobs").delete().eq("script_id", script_id).execute()
        self.client.table("scripts").delete().eq("id", script_id).execute()
        return True

    def create_task(self, task: ProcessingTask) -> ProcessingTask:
        payload = {
            **task.model_dump(mode="json"),
            "steps": [step.value for step in task.steps],
            "current_step": task.current_step.value if task.current_step else None,
            "status": task.status.value,
        }
        self.client.table("tasks").insert(payload).execute()
        return task

    def update_task(self, task_id: str, updates: dict[str, Any]) -> Optional[ProcessingTask]:
        payload: dict[str, Any] = {}
        for key, value in updates.items():
            if value is None:
                continue
            payload[key] = value.value if hasattr(value, "value") else value
        payload["updated_at"] = _iso_now()
        self.client.table("tasks").update(payload).eq("id", task_id).execute()
        return self.get_task(task_id)

    def get_task(self, task_id: str) -> Optional[ProcessingTask]:
        response = self.client.table("tasks").select("*").eq("id", task_id).limit(1).execute()
        rows = response.data or []
        return self._row_to_task(rows[0]) if rows else None

    def get_tasks(self, script_id: str) -> list[ProcessingTask]:
        response = self.client.table("tasks").select("*").eq("script_id", script_id).order("created_at", desc=True).execute()
        return [self._row_to_task(row) for row in (response.data or [])]

    def list_tasks(self, status: Optional[str] = None, project_id: Optional[str] = None) -> list[ProcessingTask]:
        query = self.client.table("tasks").select("*").order("updated_at", desc=True)
        if status:
            query = query.eq("status", status)
        if project_id:
            query = query.eq("project_id", project_id)
        response = query.execute()
        return [self._row_to_task(row) for row in (response.data or [])]

    def create_export(self, export_item: ProjectExport) -> ProjectExport:
        payload = {
            **export_item.model_dump(mode="json"),
            "format": export_item.format.value,
        }
        self.client.table("project_exports").insert(payload).execute()
        return export_item

    def list_exports(self, project_id: Optional[str] = None) -> list[ProjectExport]:
        query = self.client.table("project_exports").select("*").order("created_at", desc=True)
        if project_id:
            query = query.eq("project_id", project_id)
        response = query.execute()
        return [self._row_to_export(row) for row in (response.data or [])]

    def create_distribution_job(self, job: DistributionJob) -> DistributionJob:
        payload = {
            **job.model_dump(mode="json"),
            "platforms": [platform.value for platform in job.platforms],
            "status": job.status.value,
        }
        self.client.table("distribution_jobs").insert(payload).execute()
        return job

    def update_distribution_job(self, job_id: str, updates: dict[str, Any]) -> Optional[DistributionJob]:
        payload: dict[str, Any] = {}
        for key, value in updates.items():
            if value is None:
                continue
            if key == "platforms":
                payload[key] = [platform.value if isinstance(platform, DistributionPlatform) else platform for platform in value]
            else:
                payload[key] = value.value if hasattr(value, "value") else value
        payload["updated_at"] = _iso_now()
        self.client.table("distribution_jobs").update(payload).eq("id", job_id).execute()
        return self.get_distribution_job(job_id)

    def get_distribution_job(self, job_id: str) -> Optional[DistributionJob]:
        response = self.client.table("distribution_jobs").select("*").eq("id", job_id).limit(1).execute()
        rows = response.data or []
        return self._row_to_distribution(rows[0]) if rows else None

    def list_distribution_jobs(self, project_id: Optional[str] = None) -> list[DistributionJob]:
        query = self.client.table("distribution_jobs").select("*").order("updated_at", desc=True)
        if project_id:
            query = query.eq("project_id", project_id)
        response = query.execute()
        return [self._row_to_distribution(row) for row in (response.data or [])]

    @staticmethod
    def _row_to_script(row: dict[str, Any]) -> Script:
        payload = dict(row)
        payload["type"] = ScriptType(payload["type"])
        return Script.model_validate(payload)

    @staticmethod
    def _row_to_task(row: dict[str, Any]) -> ProcessingTask:
        return ProcessingTask.model_validate(row)

    @staticmethod
    def _row_to_export(row: dict[str, Any]) -> ProjectExport:
        payload = dict(row)
        payload["format"] = ExportFormat(payload["format"])
        return ProjectExport.model_validate(payload)

    @staticmethod
    def _row_to_distribution(row: dict[str, Any]) -> DistributionJob:
        return DistributionJob.model_validate(row)

    @staticmethod
    def _is_missing_users_table(error: Exception) -> bool:
        message = str(error)
        return "PGRST205" in message and "public.users" in message

    @staticmethod
    def _read_local_users() -> list[dict[str, Any]]:
        path = _local_users_path()
        if not path.exists():
            return []
        return json.loads(path.read_text() or "[]")

    @staticmethod
    def _write_local_users(rows: list[dict[str, Any]]) -> None:
        path = _local_users_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(rows, ensure_ascii=False, indent=2))

    @classmethod
    def _create_local_user(cls, user: User) -> None:
        rows = cls._read_local_users()
        rows.append(user.model_dump(mode="json"))
        cls._write_local_users(rows)

    @classmethod
    def _get_local_user_by_email(cls, email: str) -> Optional[User]:
        for row in cls._read_local_users():
            if row.get("email") == email:
                return User.model_validate(row)
        return None

    @classmethod
    def _get_local_user(cls, user_id: str) -> Optional[User]:
        for row in cls._read_local_users():
            if row.get("id") == user_id:
                return User.model_validate(row)
        return None
