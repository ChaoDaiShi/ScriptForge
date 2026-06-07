"""
Workbench API Routes.
Handles episode and scene management for script writing.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Body
from typing import List, Optional, Dict, Any
from core.utils import success_response, error_response
from services.ai_service import AIService
from services.script_converter import script_converter

router = APIRouter(prefix="/api/workbench", tags=["workbench"])

ai_service = AIService()


@router.get("/episodes", summary="获取剧集列表")
async def get_episodes(
    page: int = Query(1, ge=1, description="页码"),
    size: int = Query(20, ge=1, le=100, description="每页数量")
):
    """
    获取剧集列表（支持分页）
    前端调用场景：显示所有剧集项目
    """
    return success_response(data={
        "episodes": [],
        "pagination": {
            "page": page,
            "size": size,
            "total": 0,
            "pages": 0
        }
    })


@router.get("/episodes/{episode_id}", summary="获取剧集详情")
async def get_episode(episode_id: str):
    """
    获取单集详情
    前端调用场景：进入某个剧集的工作台
    """
    return success_response(data={"episode": {}})


@router.post("/episodes", summary="创建剧集")
async def create_episode(
    title: str = Body(..., embed=True, description="剧集标题"),
    description: Optional[str] = Body(None, embed=True, description="剧集简介")
):
    """
    创建新剧集
    前端调用场景：用户点击"新建剧集"按钮
    """
    return success_response(data={"episode_id": ""}, message="剧集创建成功")


@router.put("/episodes/{episode_id}", summary="更新剧集")
async def update_episode(
    episode_id: str,
    title: Optional[str] = Body(None, embed=True),
    description: Optional[str] = Body(None, embed=True)
):
    """
    更新剧集信息
    前端调用场景：修改剧集标题、简介等基本信息
    """
    return success_response(data={"episode_id": episode_id}, message="剧集更新成功")


@router.delete("/episodes/{episode_id}", summary="删除剧集")
async def delete_episode(episode_id: str):
    """
    删除剧集
    前端调用场景：删除不再需要的剧集
    """
    return success_response(data={"episode_id": episode_id}, message="剧集删除成功")


@router.get("/episodes/{episode_id}/scenes", summary="获取场景列表")
async def get_scenes(episode_id: str):
    """
    获取某集的所有场景
    前端调用场景：显示中间栏的场景列表
    """
    return success_response(data={"scenes": []})


@router.post("/episodes/{episode_id}/scenes", summary="创建场景")
async def create_scene(
    episode_id: str,
    heading: str = Body(..., embed=True, description="场景头"),
    content: Optional[str] = Body(None, embed=True, description="场景内容")
):
    """
    创建新场景
    前端调用场景：用户添加新的场景
    """
    return success_response(data={"scene_id": ""}, message="场景创建成功")


@router.put("/episodes/{episode_id}/scenes/{scene_id}", summary="更新场景")
async def update_scene(
    episode_id: str,
    scene_id: str,
    heading: Optional[str] = Body(None, embed=True),
    content: Optional[str] = Body(None, embed=True)
):
    """
    更新场景内容
    前端调用场景：用户编辑场景的节拍、对话等
    """
    return success_response(data={"scene_id": scene_id}, message="场景更新成功")


@router.delete("/episodes/{episode_id}/scenes/{scene_id}", summary="删除场景")
async def delete_scene(episode_id: str, scene_id: str):
    """
    删除场景
    前端调用场景：删除不需要的场景
    """
    return success_response(data={"scene_id": scene_id}, message="场景删除成功")


@router.get("/episodes/{episode_id}/characters", summary="获取角色列表")
async def get_characters(episode_id: str):
    """
    获取某集的角色列表
    前端调用场景：显示左侧栏的人物档案
    """
    return success_response(data={"characters": []})


@router.post("/episodes/{episode_id}/characters", summary="创建角色")
async def create_character(
    episode_id: str,
    name: str = Body(..., embed=True, description="角色名称"),
    description: Optional[str] = Body(None, embed=True, description="角色描述")
):
    """
    创建新角色
    前端调用场景：用户添加新的人物卡片
    """
    return success_response(data={"character_id": ""}, message="角色创建成功")


@router.get("/episodes/{episode_id}/history", summary="获取编辑历史")
async def get_history(episode_id: str):
    """
    获取编辑历史
    前端调用场景：显示右侧栏的版本历史
    """
    return success_response(data={"revisions": []})


@router.get("/episodes/{episode_id}/yaml", summary="获取YAML结构")
async def get_yaml(episode_id: str):
    """
    获取 YAML 结构
    前端调用场景：显示右侧栏的 YAML 视图
    """
    return success_response(data={"yaml": ""})


@router.post("/episodes/{episode_id}/generate", summary="启动AI生成")
async def generate_content(episode_id: str):
    """
    启动 AI 生成
    前端调用场景：用户点击"继续流式生成"按钮
    """
    return success_response(data={"status": "generating"}, message="生成任务已启动")


@router.post("/episodes/{episode_id}/upload-source", summary="上传原著素材")
async def upload_source(episode_id: str, file: UploadFile = File(...)):
    """
    上传原著素材
    前端调用场景：用户上传小说或原著文本
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="文件名不能为空")
    
    return success_response(data={"file_id": ""}, message="文件上传成功")


@router.post("/process/dialog", summary="提取对话")
async def process_dialog(text: str = Body(..., embed=True, description="待处理文本")):
    """
    提取文本中的对话内容
    前端调用场景：步骤1 - 对话标记
    """
    dialogues = await ai_service.extract_dialogues(text)
    result_text = text
    for dialogue in dialogues:
        result_text = result_text[:dialogue["end_pos"]] + f"|{dialogue['id']}|" + result_text[dialogue["end_pos"]:]
    
    return success_response(data={"text": result_text, "dialogues": dialogues})


@router.post("/process/character", summary="提取人物")
async def process_character(text: str = Body(..., embed=True, description="待处理文本")):
    """
    提取人物和描写类型
    前端调用场景：步骤2 - 人物提取
    """
    result = await ai_service.extract_characters(text)
    
    marked_text = text
    for desc in result["descriptions"]:
        desc_type = {
            "scenery": "景物描写",
            "psychology": "心理描写",
            "portrait": "肖像描写",
            "action": "动作描写"
        }.get(desc["type"], "其他描写")
        marked_text = marked_text.replace(desc["content"], f"***{desc_type}***\n{desc['content']}\n")
    
    return success_response(data={"text": marked_text, "characters": result})


@router.post("/process/plot", summary="提取主线")
async def process_plot(text: str = Body(..., embed=True, description="待处理文本")):
    """
    提取故事主线
    前端调用场景：步骤3 - 主线提取
    """
    plot = await ai_service.extract_main_plot(text)
    return success_response(data={"text": text, "plot": plot})


@router.post("/process/speaker", summary="标记对话主体")
async def process_speaker(text: str = Body(..., embed=True, description="待处理文本")):
    """
    标记对话的说话主体
    前端调用场景：步骤4 - 对话主体标记
    """
    characters = await ai_service.extract_characters(text)
    all_characters = characters["main_characters"] + characters["supporting_characters"]
    tagged = await ai_service.tag_dialogue_speakers(text, all_characters)
    
    result_text = text
    for dialogue in tagged:
        if dialogue["speaker_name"]:
            result_text = result_text.replace(
                f'"{dialogue["content"]}"',
                f'***{dialogue["speaker_name"]}***："{dialogue["content"]}"'
            )
    
    return success_response(data={"text": result_text, "speakers": tagged})


@router.post("/process/scene-header", summary="生成场景头")
async def process_scene_header(text: str = Body(..., embed=True, description="待处理文本")):
    """
    分析景物描写生成场景头
    前端调用场景：步骤6 - 场景头生成
    """
    characters = await ai_service.extract_characters(text)
    scenery_descriptions = [d for d in characters["descriptions"] if d["type"] == "scenery"]
    
    result_text = text
    scene_number = 1
    for desc in scenery_descriptions[:3]:
        scene_info = await ai_service.analyze_scene(desc["content"], scene_number)
        location_type = "INT." if scene_info["is_interior"] else "EXT."
        scene_header = f"{location_type} {scene_info['location']} - {scene_info['time_of_day']}"
        result_text = result_text.replace(desc["content"], f"{scene_header}\n{desc['content']}")
        scene_number += 1
    
    return success_response(data={"text": result_text})


@router.post("/process/psychology", summary="转换心理描写")
async def process_psychology(text: str = Body(..., embed=True, description="待处理文本")):
    """
    将心理描写转换为动作或神态描写
    前端调用场景：步骤7 - 心理转换
    """
    characters = await ai_service.extract_characters(text)
    all_characters = characters["main_characters"] + characters["supporting_characters"]
    
    result_text = text
    for desc in characters["descriptions"]:
        if desc["type"] == "psychology":
            char_name = all_characters[0]["name"] if all_characters else "未知人物"
            converted = await ai_service.convert_psychology(desc["content"], char_name)
            result_text = result_text.replace(desc["content"], converted)
    
    return success_response(data={"text": result_text})


@router.post("/process/cleanup", summary="去除无用语句")
async def process_cleanup(text: str = Body(..., embed=True, description="待处理文本")):
    """
    去除无用语句
    前端调用场景：步骤10 - 无用语句去除
    """
    useless_lines = await ai_service.detect_useless_lines(text)
    lines = text.split('\n')
    cleaned_lines = [line for i, line in enumerate(lines) if (i + 1) not in useless_lines]
    result_text = '\n'.join(cleaned_lines)
    
    return success_response(data={"text": result_text, "removed_lines": useless_lines})


@router.post("/process/polish", summary="润色剧本")
async def process_polish(text: str = Body(..., embed=True, description="待处理文本")):
    """
    润色剧本文本
    前端调用场景：步骤11 - AI润色
    """
    polished = await ai_service.polish_script(text)
    return success_response(data={"text": polished})


@router.post("/process/all", summary="一键处理全部（新转换器）")
async def process_all(
    text: str = Body(..., embed=True, description="待处理文本"),
    script_type: str = Body("long", embed=True, description="剧本类型：long/short"),
    title: str = Body("未命名剧本", embed=True, description="剧本标题"),
):
    """
    一键将小说文本转换为结构化剧本。
    使用 ScriptConverter 进行真正的格式转换：
    - 段落分类（对话/动作/描述/叙述）
    - 场景聚合与场景头生成
    - 对话说话人识别
    - 剧本格式输出
    - YAML 结构化导出
    """
    try:
        result = script_converter.convert(text, title)
        return success_response(data={
            "text": result["script_text"],
            "yaml": result["yaml"],
            "scenes": result["scenes"],
            "script_type": script_type,
        })
    except Exception as e:
        return error_response(message=f"处理失败: {str(e)}")


@router.post("/process/convert", summary="直接转换（纯本地规则）")
async def process_convert(
    text: str = Body(..., embed=True, description="待处理小说文本"),
    title: str = Body("未命名剧本", embed=True, description="剧本标题"),
):
    """
    纯本地规则转换，不依赖 AI。
    快速将小说文本转换为剧本格式。
    返回: { script_text, scenes, yaml }
    """
    try:
        result = script_converter.convert(text, title)
        return success_response(data={
            "text": result["script_text"],
            "scenes": result["scenes"],
            "yaml": result["yaml"],
        })
    except Exception as e:
        return error_response(message=f"转换失败: {str(e)}")


@router.post("/process/chapters", summary="逐章处理")
async def process_chapters(
    chapters: List[Dict[str, Any]] = Body(..., embed=True, description="章节列表(含content)"),
    title: str = Body("未命名剧本", embed=True, description="剧本标题"),
):
    """
    逐章处理小说文本，每章独立调用AI分析
    返回每章的分析结果
    """
    try:
        results = await ai_service.process_chapters(chapters)
        
        # 汇总所有章节文本
        all_texts = [ch.get("content", "") for ch in chapters]
        combined_text = "\n\n###\n\n".join(all_texts)
        
        # 生成 YAML
        yaml_output = await ai_service.generate_yaml(combined_text, title)
        
        return success_response(data={
            "chapters": results,
            "combined_text": combined_text,
            "yaml": yaml_output,
        })
    except Exception as e:
        return error_response(message=f"逐章处理失败: {str(e)}")


@router.post("/process/generate-yaml", summary="生成YAML剧本")
async def generate_yaml(
    text: str = Body(..., embed=True, description="处理后的文本"),
    title: str = Body("未命名剧本", embed=True, description="剧本标题"),
):
    """
    将处理后的文本转换为YAML格式的结构化剧本
    """
    try:
        yaml_output = await ai_service.generate_yaml(text, title)
        return success_response(data={"yaml": yaml_output})
    except Exception as e:
        return error_response(message=f"YAML生成失败: {str(e)}")
