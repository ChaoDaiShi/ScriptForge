from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class ScriptType(str, Enum):
    """剧本类型"""
    FEATURE_FILM = "feature_film"
    SHORT_FILM = "short_film"


class CharacterRole(str, Enum):
    """人物角色类型"""
    MAIN = "main"
    SUPPORTING = "supporting"
    BACKGROUND = "background"


class Character(BaseModel):
    """人物模型"""
    id: str = Field(..., description="人物唯一标识")
    name: str = Field(..., description="人物名称")
    role: CharacterRole = Field(default=CharacterRole.SUPPORTING, description="角色类型")
    description: Optional[str] = Field(None, description="人物描述")
    traits: List[str] = Field(default=[], description="人物特征")


class DescriptionType(str, Enum):
    """描写类型"""
    SCENERY = "scenery"
    PSYCHOLOGY = "psychology"
    PORTRAIT = "portrait"
    ACTION = "action"
    EXPRESSION = "expression"


class Dialogue(BaseModel):
    """对话模型"""
    id: str = Field(..., description="对话唯一标识")
    speaker_id: Optional[str] = Field(None, description="说话者ID")
    speaker_name: Optional[str] = Field(None, description="说话者名称")
    content: str = Field(..., description="对话内容")
    emotion: Optional[str] = Field(None, description="情绪标记")


class SceneHeading(BaseModel):
    """场景头模型"""
    scene_number: int = Field(..., description="场号")
    is_interior: bool = Field(..., description="内景/外景")
    location: str = Field(..., description="地点")
    time_of_day: str = Field(..., description="昼夜")


class Scene(BaseModel):
    """场景模型"""
    id: str = Field(..., description="场景唯一标识")
    heading: SceneHeading = Field(..., description="场景头")
    content: Optional[str] = Field(None, description="场景内容")
    dialogues: List[Dialogue] = Field(default=[], description="对话列表")
    descriptions: List[Dict[str, Any]] = Field(default=[], description="描写列表")
    characters: List[Character] = Field(default=[], description="出场人物列表")


class Script(BaseModel):
    """剧本模型"""
    id: str = Field(..., description="剧本唯一标识")
    title: str = Field(..., description="剧本标题")
    type: ScriptType = Field(..., description="剧本类型")
    original_text: str = Field(..., description="原始文本")
    processed_text: Optional[str] = Field(None, description="处理后的文本")
    characters: List[Character] = Field(default=[], description="人物列表")
    scenes: List[Scene] = Field(default=[], description="场景列表")
    main_plot: Optional[str] = Field(None, description="主线摘要")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")


class ProcessingStep(str, Enum):
    """处理步骤"""
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
    """处理状态"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ProcessingTask(BaseModel):
    """处理任务模型"""
    id: str = Field(..., description="任务唯一标识")
    script_id: str = Field(..., description="关联剧本ID")
    steps: List[ProcessingStep] = Field(default=[], description="待处理步骤")
    current_step: Optional[ProcessingStep] = Field(None, description="当前步骤")
    status: ProcessingStatus = Field(default=ProcessingStatus.PENDING, description="任务状态")
    progress: float = Field(default=0.0, description="处理进度 0-100")
    error_message: Optional[str] = Field(None, description="错误信息")
    # 新增：中间结果存储
    step_results: Dict[str, Any] = Field(default={}, description="各步骤的处理结果")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")


class ScriptCreateRequest(BaseModel):
    """创建剧本请求"""
    title: str = Field(..., min_length=1, max_length=255, description="剧本标题")
    type: ScriptType = Field(..., description="剧本类型")
    text: str = Field(..., min_length=1, description="原始文本")


class TaskListItem(BaseModel):
    """任务列表项"""
    id: str = Field(..., description="任务唯一标识")
    script_id: str = Field(..., description="关联剧本ID")
    script_title: str = Field(..., description="关联剧本标题")
    title: str = Field(..., description="任务标题")
    type: str = Field(default="convert", description="任务类型")
    status: str = Field(..., description="前端展示状态")
    progress: int = Field(..., ge=0, le=100, description="任务进度")
    current_step: Optional[str] = Field(None, description="当前执行步骤")
    error_message: Optional[str] = Field(None, description="错误信息")
    created_at: datetime = Field(default_factory=datetime.now, description="创建时间")
    updated_at: datetime = Field(default_factory=datetime.now, description="更新时间")


class TaskPagination(BaseModel):
    """分页信息"""
    page: int = Field(..., ge=1)
    size: int = Field(..., ge=1)
    total: int = Field(..., ge=0)
    pages: int = Field(..., ge=0)


class TaskListResponse(BaseModel):
    """任务列表响应数据"""
    tasks: List[TaskListItem] = Field(default_factory=list)
    pagination: TaskPagination


class TaskDetailResponse(BaseModel):
    """任务详情响应数据"""
    task: TaskListItem


class TaskCreateRequest(BaseModel):
    """创建任务请求"""
    script_id: str = Field(..., min_length=1, description="关联剧本ID")


class TaskUpdateRequest(BaseModel):
    """更新任务请求"""
    status: Optional[str] = Field(None, description="任务状态")
    priority: Optional[int] = Field(None, ge=0, description="预留优先级字段")
