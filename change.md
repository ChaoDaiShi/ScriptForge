# 2026-06-07

## 前端分卷结果改为 JSON 传给后端

- 调整导入页分卷处理逻辑，前端在 `ImportPage` 中将识别出的章节整理为结构化 `source_payload` JSON，而不是只提交整段原文。
- 新增前端提交类型定义，`createScript` 现在支持携带 `source_payload`。
- 扩展后端 `ScriptCreateRequest`，支持接收前端传来的结构化章节数据。
- 后端创建剧本时优先根据 `source_payload.chapters` 重新拼接 `original_text`，继续复用现有 AI 剧本处理链路，未改动数据库表结构。

## 涉及文件

- `frontend/src/features/workbench/ImportPage.tsx`
- `frontend/src/lib/api.ts`
- `backend/schemas/script_schema.py`
- `backend/services/script_service.py`

## 验证

- `cd frontend && npm run build` 通过
- `python3 -m py_compile backend/schemas/script_schema.py backend/services/script_service.py` 通过

## 备注

- 当前后端已能接收前端分卷后的 JSON，但只是将其规范化回文本后继续处理。
- 如果后续需要真正按章节粒度入库或逐章调用 AI，还需要继续扩展持久化和处理流程。
