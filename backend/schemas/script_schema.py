from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class ScriptType(str, Enum):
    FEATURE_FILM = "feature_film"
    SHORT_FILM = "short_film"


class CharacterRole(str, Enum):
    MAIN = "main"
    SUPPORTING = "supporting"
    BACKGROUND = "background"


class Character(BaseModel):
    id: str
    name: str
    role: CharacterRole = CharacterRole.SUPPORTING
    description: Optional[str] = None
    traits: List[str] = Field(default_factory=list)


class Dialogue(BaseModel):
    id: str
    speaker_id: Optional[str] = None
    speaker_name: Optional[str] = None
    content: str
    emotion: Optional[str] = None


class SceneHeading(BaseModel):
    scene_number: int
    is_interior: bool
    location: str
    time_of_day: str


class Scene(BaseModel):
    id: str
    heading: SceneHeading
    content: Optional[str] = None
    dialogues: List[Dialogue] = Field(default_factory=list)
    descriptions: List[Dict[str, Any]] = Field(default_factory=list)
    characters: List[Character] = Field(default_factory=list)


class ProjectStatus(str, Enum):
    IDLE = "idle"
    IMPORTING = "importing"
    CONVERTING = "converting"
    READY = "ready"
    DISTRIBUTING = "distributing"
    FAILED = "failed"


class ExportFormat(str, Enum):
    YAML = "yaml"
    PDF = "pdf"
    JSON = "json"
    SHARE = "share"


class DistributionPlatform(str, Enum):
    DOUYIN = "douyin"
    WECHAT = "wechat"


class DistributionStatus(str, Enum):
    PENDING = "pending"
    GENERATED = "generated"
    DISTRIBUTING = "distributing"
    COMPLETED = "completed"
    FAILED = "failed"


class User(BaseModel):
    id: str
    email: EmailStr
    password_hash: str
    password_salt: str
    credits: int = 0
    credits_used: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    credits: int = 0
    credits_used: int = 0
    created_at: datetime


class Script(BaseModel):
    id: str
    title: str
    type: ScriptType
    original_text: str
    processed_text: Optional[str] = None
    characters: List[Character] = Field(default_factory=list)
    scenes: List[Scene] = Field(default_factory=list)
    main_plot: Optional[str] = None
    project_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Project(BaseModel):
    id: str
    user_id: Optional[str] = None
    title: str
    source_novel: str
    source_author: str
    chapter_count: int = 0
    status: ProjectStatus = ProjectStatus.IDLE
    script_id: Optional[str] = None
    task_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectExport(BaseModel):
    id: str
    project_id: str
    script_id: Optional[str] = None
    format: ExportFormat
    status: str = "done"
    download_url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DistributionJob(BaseModel):
    id: str
    project_id: str
    script_id: str
    title: str
    description: str
    resolution: str
    ratio: str
    duration: int
    platforms: List[DistributionPlatform] = Field(default_factory=list)
    watermark: bool = True
    generate_audio: bool = True
    status: DistributionStatus = DistributionStatus.PENDING
    video_url: Optional[str] = None
    external_docs: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ScriptSourceChapter(BaseModel):
    index: int = Field(..., ge=1)
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    word_count: int = Field(default=0, ge=0)


class ScriptSourcePayload(BaseModel):
    mode: str = Field(default="chapter_json")
    total_word_count: int = Field(default=0, ge=0)
    chapter_count: int = Field(default=0, ge=0)
    chapters: List[ScriptSourceChapter] = Field(default_factory=list)


class ProcessingStep(str, Enum):
    DIALOGUE_EXTRACTION = "dialogue_extraction"
    CHARACTER_EXTRACTION = "character_extraction"
    MAIN_PLOT_EXTRACTION = "main_plot_extraction"
    DIALOGUE_SPEAKER_TAGGING = "dialogue_speaker_tagging"
    SCENE_ANALYSIS = "scene_analysis"
    PSYCHOLOGY_CONVERSION = "psychology_conversion"
    SCENE_PACKAGING = "scene_packaging"
    USELESS_LINE_DETECTION = "useless_line_detection"
    USELESS_LINE_REMOVAL = "useless_line_removal"
    POLISHING = "polishing"
    EXPORT = "export"


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingTask(BaseModel):
    id: str
    script_id: str
    project_id: Optional[str] = None
    steps: List[ProcessingStep] = Field(default_factory=list)
    current_step: Optional[ProcessingStep] = None
    status: ProcessingStatus = ProcessingStatus.PENDING
    progress: float = 0.0
    task_type: str = "convert"
    error_message: Optional[str] = None
    step_results: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ScriptCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    type: ScriptType
    text: str = Field(..., min_length=1)
    project_id: Optional[str] = None
    source_payload: Optional[ScriptSourcePayload] = None


class ProjectCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    source_novel: str = Field(default="未命名原著")
    source_author: str = Field(default="未知作者")
    chapter_count: int = Field(default=0, ge=0)
    user_id: Optional[str] = None


class ProjectUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    source_novel: Optional[str] = None
    source_author: Optional[str] = None
    chapter_count: Optional[int] = Field(default=None, ge=0)
    status: Optional[ProjectStatus] = None
    script_id: Optional[str] = None
    task_id: Optional[str] = None


class TaskListItem(BaseModel):
    id: str
    project_id: Optional[str] = None
    script_id: str
    script_title: str
    title: str
    type: str = "convert"
    status: str
    progress: int = Field(..., ge=0, le=100)
    current_step: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class TaskPagination(BaseModel):
    page: int
    size: int
    total: int
    pages: int


class TaskListResponse(BaseModel):
    tasks: List[TaskListItem] = Field(default_factory=list)
    pagination: TaskPagination


class TaskDetailResponse(BaseModel):
    task: TaskListItem


class TaskCreateRequest(BaseModel):
    script_id: str = Field(..., min_length=1)
    project_id: Optional[str] = None


class TaskUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=0)


class AuthRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


class ExportResponse(BaseModel):
    export: ProjectExport


class DistributionCreateRequest(BaseModel):
    project_id: str
    script_id: str
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(default="")
    resolution: str = Field(default="1080p")
    ratio: str = Field(default="9:16")
    duration: int = Field(default=60, ge=5, le=600)
    watermark: bool = True
    generate_audio: bool = True
    platforms: List[DistributionPlatform] = Field(default_factory=list)


class DistributionActionRequest(BaseModel):
    platforms: List[DistributionPlatform] = Field(default_factory=list)


class DistributionResponse(BaseModel):
    job: DistributionJob
