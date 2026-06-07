from __future__ import annotations

from typing import Optional, List
from uuid import uuid4

from repositories import SupabaseScriptRepository
from schemas.script_schema import (
    DistributionCreateRequest,
    DistributionJob,
    DistributionResponse,
    DistributionStatus,
    ExportFormat,
    ExportResponse,
    Project,
    ProjectCreateRequest,
    ProjectExport,
    ProjectStatus,
    ProjectUpdateRequest,
)


PLATFORM_DOCS = {
    "douyin": "https://developer.open-douyin.com/docs/resource/zh-CN/developer/tools/cloud/guide/industry-solutions/meizi",
    "wechat": "https://developers.weixin.qq.com/miniprogram/dev/platform-capabilities/industry/mini-drama/mini_drama.html",
    "seedance": "https://seedanceapi.org/zh/docs/v2",
}


class ProjectService:
    _repository: Optional[SupabaseScriptRepository] = None

    @classmethod
    def _get_repository(cls) -> SupabaseScriptRepository:
        if cls._repository is None:
            cls._repository = SupabaseScriptRepository()
        return cls._repository

    @classmethod
    async def create_project(cls, request: ProjectCreateRequest) -> Project:
        project = Project(
            id=str(uuid4()),
            user_id=request.user_id,
            title=request.title,
            source_novel=request.source_novel,
            source_author=request.source_author,
            chapter_count=request.chapter_count,
        )
        return cls._get_repository().create_project(project)

    @classmethod
    async def list_projects(cls, user_id: Optional[str] = None) -> List[Project]:
        return cls._get_repository().list_projects(user_id=user_id)

    @classmethod
    async def get_project(cls, project_id: str) -> Optional[Project]:
        return cls._get_repository().get_project(project_id)

    @classmethod
    async def update_project(cls, project_id: str, request: ProjectUpdateRequest) -> Optional[Project]:
        return cls._get_repository().update_project(project_id, request.model_dump(exclude_none=True))

    @classmethod
    async def delete_project(cls, project_id: str) -> bool:
        return cls._get_repository().delete_project(project_id)

    @classmethod
    async def create_export(cls, project_id: str, script_id: Optional[str], export_format: ExportFormat) -> ExportResponse:
        export_item = ProjectExport(
            id=str(uuid4()),
            project_id=project_id,
            script_id=script_id,
            format=export_format,
            download_url=f"/api/projects/{project_id}/exports/{export_format.value}/download",
        )
        cls._get_repository().create_export(export_item)
        return ExportResponse(export=export_item)

    @classmethod
    async def list_exports(cls, project_id: Optional[str] = None) -> List[ProjectExport]:
        return cls._get_repository().list_exports(project_id)

    @classmethod
    async def create_distribution_job(cls, request: DistributionCreateRequest) -> DistributionResponse:
        docs = [PLATFORM_DOCS["seedance"]]
        docs.extend(PLATFORM_DOCS[p.value] for p in request.platforms)
        job = DistributionJob(
            id=str(uuid4()),
            project_id=request.project_id,
            script_id=request.script_id,
            title=request.title,
            description=request.description,
            resolution=request.resolution,
            ratio=request.ratio,
            duration=request.duration,
            platforms=request.platforms,
            watermark=request.watermark,
            generate_audio=request.generate_audio,
            status=DistributionStatus.GENERATED,
            video_url=f"https://example.com/generated/{request.project_id}/{request.script_id}.mp4",
            external_docs=docs,
        )
        cls._get_repository().create_distribution_job(job)
        cls._get_repository().update_project(request.project_id, {"status": ProjectStatus.DISTRIBUTING})
        return DistributionResponse(job=job)

    @classmethod
    async def distribute_job(cls, job_id: str) -> Optional[DistributionResponse]:
        job = cls._get_repository().update_distribution_job(job_id, {"status": DistributionStatus.COMPLETED})
        if not job:
            return None
        cls._get_repository().update_project(job.project_id, {"status": ProjectStatus.READY})
        return DistributionResponse(job=job)

    @classmethod
    async def list_distribution_jobs(cls, project_id: Optional[str] = None) -> List[DistributionJob]:
        return cls._get_repository().list_distribution_jobs(project_id)
