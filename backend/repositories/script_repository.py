from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from core.database import SupabaseConfigError, get_supabase_client
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


def _local_collection_path(name: str) -> Path:
    return Path(__file__).resolve().parent.parent / ".local_data" / f"{name}.json"


class SupabaseScriptRepository:
    """基于 Supabase 的用户、项目、剧本、任务与分发仓储。"""

    def __init__(self) -> None:
        try:
            self.client = get_supabase_client()
        except Exception:
            self.client = None

    def create_user(self, user: User) -> User:
        payload = user.model_dump(mode="json")
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("users").insert(payload).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error, entity="users"):
                raise
            self._create_local_user(user)
        return user

    def get_user_by_email(self, email: str) -> Optional[User]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("users").select("*").eq("email", email).limit(1).execute()
            rows = response.data or []
            return User.model_validate(rows[0]) if rows else None
        except Exception as error:
            if not self._should_use_local_fallback(error, entity="users"):
                raise
            return self._get_local_user_by_email(email)

    def get_user(self, user_id: str) -> Optional[User]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("users").select("*").eq("id", user_id).limit(1).execute()
            rows = response.data or []
            return User.model_validate(rows[0]) if rows else None
        except Exception as error:
            if not self._should_use_local_fallback(error, entity="users"):
                raise
            return self._get_local_user(user_id)

    def update_user(self, user_id: str, updates: dict[str, Any]) -> Optional[User]:
        payload = {k: v for k, v in updates.items() if v is not None}
        payload["updated_at"] = _iso_now()
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("users").update(payload).eq("id", user_id).execute()
            return self.get_user(user_id)
        except Exception as error:
            if not self._should_use_local_fallback(error, entity="users"):
                raise
            return self._update_local_user(user_id, payload)

    def create_project(self, project: Project) -> Project:
        payload = project.model_dump(mode="json")
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("projects").insert(payload).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._append_local_row("projects", payload)
        return project

    def list_projects(self, user_id: Optional[str] = None) -> list[Project]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            query = self.client.table("projects").select("*").order("updated_at", desc=True)
            if user_id:
                query = query.eq("user_id", user_id)
            response = query.execute()
            rows = response.data or []
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            rows = self._read_local_rows("projects")
            if user_id:
                rows = [row for row in rows if row.get("user_id") == user_id]
            rows = self._sort_rows(rows, "updated_at")
        return [Project.model_validate(row) for row in rows]

    def get_project(self, project_id: str) -> Optional[Project]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("projects").select("*").eq("id", project_id).limit(1).execute()
            rows = response.data or []
            return Project.model_validate(rows[0]) if rows else None
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._get_local_row("projects", project_id)
            return Project.model_validate(row) if row else None

    def update_project(self, project_id: str, updates: dict[str, Any]) -> Optional[Project]:
        payload = {k: v.value if hasattr(v, "value") else v for k, v in updates.items() if v is not None}
        payload["updated_at"] = _iso_now()
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("projects").update(payload).eq("id", project_id).execute()
            return self.get_project(project_id)
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._update_local_row("projects", project_id, payload)
            return Project.model_validate(row) if row else None

    def delete_project(self, project_id: str) -> bool:
        project = self.get_project(project_id)
        if not project:
            return False
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("distribution_jobs").delete().eq("project_id", project_id).execute()
            self.client.table("project_exports").delete().eq("project_id", project_id).execute()
            self.client.table("tasks").delete().eq("project_id", project_id).execute()
            self.client.table("scripts").delete().eq("project_id", project_id).execute()
            self.client.table("projects").delete().eq("id", project_id).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._delete_local_rows_by_field("distribution_jobs", "project_id", project_id)
            self._delete_local_rows_by_field("project_exports", "project_id", project_id)
            self._delete_local_rows_by_field("tasks", "project_id", project_id)
            self._delete_local_rows_by_field("scripts", "project_id", project_id)
            self._delete_local_row("projects", project_id)
        return True

    def create_script(self, script: Script) -> Script:
        payload = {
            **script.model_dump(mode="json"),
            "type": script.type.value,
            "characters": [character.model_dump(mode="json") for character in script.characters],
            "scenes": [scene.model_dump(mode="json") for scene in script.scenes],
        }
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("scripts").insert(payload).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._append_local_row("scripts", payload)
        return script

    def get_script(self, script_id: str) -> Optional[Script]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("scripts").select("*").eq("id", script_id).limit(1).execute()
            rows = response.data or []
            return self._row_to_script(rows[0]) if rows else None
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._get_local_row("scripts", script_id)
            return self._row_to_script(row) if row else None

    def list_scripts(self, script_type: Optional[ScriptType] = None, project_id: Optional[str] = None) -> list[Script]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            query = self.client.table("scripts").select("*").order("created_at", desc=True)
            if script_type:
                query = query.eq("type", script_type.value)
            if project_id:
                query = query.eq("project_id", project_id)
            response = query.execute()
            rows = response.data or []
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            rows = self._read_local_rows("scripts")
            if script_type:
                rows = [row for row in rows if row.get("type") == script_type.value]
            if project_id:
                rows = [row for row in rows if row.get("project_id") == project_id]
            rows = self._sort_rows(rows, "created_at")
        return [self._row_to_script(row) for row in rows]

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
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("scripts").update(payload).eq("id", script.id).execute()
            refreshed = self.get_script(script.id)
            return refreshed if refreshed else script
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._update_local_row("scripts", script.id, payload)
            return self._row_to_script(row) if row else script

    def delete_script(self, script_id: str) -> bool:
        existing = self.get_script(script_id)
        if not existing:
            return False
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("tasks").delete().eq("script_id", script_id).execute()
            self.client.table("project_exports").delete().eq("script_id", script_id).execute()
            self.client.table("distribution_jobs").delete().eq("script_id", script_id).execute()
            self.client.table("scripts").delete().eq("id", script_id).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._delete_local_rows_by_field("tasks", "script_id", script_id)
            self._delete_local_rows_by_field("project_exports", "script_id", script_id)
            self._delete_local_rows_by_field("distribution_jobs", "script_id", script_id)
            self._delete_local_row("scripts", script_id)
        return True

    def create_task(self, task: ProcessingTask) -> ProcessingTask:
        payload = {
            **task.model_dump(mode="json"),
            "steps": [step.value for step in task.steps],
            "current_step": task.current_step.value if task.current_step else None,
            "status": task.status.value,
        }
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("tasks").insert(payload).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._append_local_row("tasks", payload)
        return task

    def update_task(self, task_id: str, updates: dict[str, Any]) -> Optional[ProcessingTask]:
        payload: dict[str, Any] = {}
        for key, value in updates.items():
            if value is None:
                continue
            payload[key] = value.value if hasattr(value, "value") else value
        payload["updated_at"] = _iso_now()
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("tasks").update(payload).eq("id", task_id).execute()
            return self.get_task(task_id)
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._update_local_row("tasks", task_id, payload)
            return self._row_to_task(row) if row else None

    def get_task(self, task_id: str) -> Optional[ProcessingTask]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("tasks").select("*").eq("id", task_id).limit(1).execute()
            rows = response.data or []
            return self._row_to_task(rows[0]) if rows else None
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._get_local_row("tasks", task_id)
            return self._row_to_task(row) if row else None

    def delete_task(self, task_id: str) -> bool:
        task = self.get_task(task_id)
        if not task:
            return False
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("tasks").delete().eq("id", task_id).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._delete_local_row("tasks", task_id)
        return True

    def get_tasks(self, script_id: str) -> list[ProcessingTask]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("tasks").select("*").eq("script_id", script_id).order("created_at", desc=True).execute()
            rows = response.data or []
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            rows = [row for row in self._read_local_rows("tasks") if row.get("script_id") == script_id]
            rows = self._sort_rows(rows, "created_at")
        return [self._row_to_task(row) for row in rows]

    def list_tasks(self, status: Optional[str] = None, project_id: Optional[str] = None) -> list[ProcessingTask]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            query = self.client.table("tasks").select("*").order("updated_at", desc=True)
            if status:
                query = query.eq("status", status)
            if project_id:
                query = query.eq("project_id", project_id)
            response = query.execute()
            rows = response.data or []
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            rows = self._read_local_rows("tasks")
            if status:
                rows = [row for row in rows if row.get("status") == status]
            if project_id:
                rows = [row for row in rows if row.get("project_id") == project_id]
            rows = self._sort_rows(rows, "updated_at")
        return [self._row_to_task(row) for row in rows]

    def create_export(self, export_item: ProjectExport) -> ProjectExport:
        payload = {
            **export_item.model_dump(mode="json"),
            "format": export_item.format.value,
        }
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("project_exports").insert(payload).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._append_local_row("project_exports", payload)
        return export_item

    def list_exports(self, project_id: Optional[str] = None) -> list[ProjectExport]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            query = self.client.table("project_exports").select("*").order("created_at", desc=True)
            if project_id:
                query = query.eq("project_id", project_id)
            response = query.execute()
            rows = response.data or []
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            rows = self._read_local_rows("project_exports")
            if project_id:
                rows = [row for row in rows if row.get("project_id") == project_id]
            rows = self._sort_rows(rows, "created_at")
        return [self._row_to_export(row) for row in rows]

    def create_distribution_job(self, job: DistributionJob) -> DistributionJob:
        payload = {
            **job.model_dump(mode="json"),
            "platforms": [platform.value for platform in job.platforms],
            "status": job.status.value,
        }
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("distribution_jobs").insert(payload).execute()
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            self._append_local_row("distribution_jobs", payload)
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
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            self.client.table("distribution_jobs").update(payload).eq("id", job_id).execute()
            return self.get_distribution_job(job_id)
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._update_local_row("distribution_jobs", job_id, payload)
            return self._row_to_distribution(row) if row else None

    def get_distribution_job(self, job_id: str) -> Optional[DistributionJob]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            response = self.client.table("distribution_jobs").select("*").eq("id", job_id).limit(1).execute()
            rows = response.data or []
            return self._row_to_distribution(rows[0]) if rows else None
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            row = self._get_local_row("distribution_jobs", job_id)
            return self._row_to_distribution(row) if row else None

    def list_distribution_jobs(self, project_id: Optional[str] = None) -> list[DistributionJob]:
        try:
            if self.client is None:
                raise SupabaseConfigError("Supabase client unavailable")
            query = self.client.table("distribution_jobs").select("*").order("updated_at", desc=True)
            if project_id:
                query = query.eq("project_id", project_id)
            response = query.execute()
            rows = response.data or []
        except Exception as error:
            if not self._should_use_local_fallback(error):
                raise
            rows = self._read_local_rows("distribution_jobs")
            if project_id:
                rows = [row for row in rows if row.get("project_id") == project_id]
            rows = self._sort_rows(rows, "updated_at")
        return [self._row_to_distribution(row) for row in rows]

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

    @classmethod
    def _should_use_local_fallback(cls, error: Exception, entity: Optional[str] = None) -> bool:
        message = str(error)
        if isinstance(error, SupabaseConfigError):
            return True
        if entity == "users" and cls._is_missing_users_table(error):
            return True
        fallback_markers = (
            "ConnectError",
            "Server disconnected",
            "Temporary failure in name resolution",
            "nodename nor servname provided",
            "Name or service not known",
        )
        return any(marker in message for marker in fallback_markers)

    @staticmethod
    def _read_local_rows(name: str) -> list[dict[str, Any]]:
        path = _local_collection_path(name)
        if not path.exists():
            return []
        return json.loads(path.read_text() or "[]")

    @staticmethod
    def _write_local_rows(name: str, rows: list[dict[str, Any]]) -> None:
        path = _local_collection_path(name)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(rows, ensure_ascii=False, indent=2))

    @classmethod
    def _append_local_row(cls, name: str, row: dict[str, Any]) -> None:
        rows = cls._read_local_rows(name)
        rows.append(row)
        cls._write_local_rows(name, rows)

    @classmethod
    def _get_local_row(cls, name: str, item_id: str) -> Optional[dict[str, Any]]:
        for row in cls._read_local_rows(name):
            if row.get("id") == item_id:
                return row
        return None

    @classmethod
    def _update_local_row(cls, name: str, item_id: str, updates: dict[str, Any]) -> Optional[dict[str, Any]]:
        rows = cls._read_local_rows(name)
        updated_row: Optional[dict[str, Any]] = None
        for index, row in enumerate(rows):
            if row.get("id") != item_id:
                continue
            updated_row = {**row, **updates}
            rows[index] = updated_row
            break
        if updated_row is None:
            return None
        cls._write_local_rows(name, rows)
        return updated_row

    @classmethod
    def _delete_local_row(cls, name: str, item_id: str) -> None:
        rows = [row for row in cls._read_local_rows(name) if row.get("id") != item_id]
        cls._write_local_rows(name, rows)

    @classmethod
    def _delete_local_rows_by_field(cls, name: str, field: str, value: str) -> None:
        rows = [row for row in cls._read_local_rows(name) if row.get(field) != value]
        cls._write_local_rows(name, rows)

    @staticmethod
    def _sort_rows(rows: list[dict[str, Any]], field: str) -> list[dict[str, Any]]:
        return sorted(rows, key=lambda row: row.get(field) or "", reverse=True)

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

    @classmethod
    def _update_local_user(cls, user_id: str, updates: dict[str, Any]) -> Optional[User]:
        rows = cls._read_local_users()
        updated_user: Optional[User] = None
        for index, row in enumerate(rows):
            if row.get("id") != user_id:
                continue
            next_row = {**row, **updates}
            rows[index] = next_row
            updated_user = User.model_validate(next_row)
            break
        if updated_user is None:
            return None
        cls._write_local_users(rows)
        return updated_user
