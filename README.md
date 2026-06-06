# ScriptForge · AI 小说转剧本工具

> 让每一部有潜力的网文，都能低成本地走向银幕。

ScriptForge 是一款面向中国网络文学作者及内容制作公司的 AI 剧本创作平台，能将 **3 个章节以上的小说文本** 自动转换为结构化 **YAML 格式剧本初稿**，大幅降低 IP 改编门槛，提升微短剧剧本量产效率。

---

## 技术栈

| 层级         | 选型                            |
| ------------ | ------------------------------- |
| **前端框架** | React 19 + TypeScript 6         |
| **构建工具** | Vite 8                          |
| **UI 组件**  | shadcn/ui + Tailwind CSS        |
| **后端框架** | FastAPI (Python 3.12+)          |
| **数据库**   | PostgreSQL 16（Supabase 托管）  |
| **AI 模型**  | Claude Sonnet 4.6 / DeepSeek-R1 |

---

## 项目结构

```
ScriptForge/
├── frontend/              # React + Vite 前端
│   ├── src/
│   │   ├── App.tsx        # 主应用组件
│   │   ├── main.tsx       # 应用入口
│   │   ├── lib/
│   │   │   └── api.ts     # API 请求封装
│   │   ├── features/      # 功能模块
│   │   ├── store/         # 状态管理
│   │   └── assets/        # 静态资源
│   ├── public/            # 公共静态文件
│   ├── index.html
│   ├── vite.config.ts     # Vite 配置（含 API 代理）
│   ├── tsconfig.json
│   └── package.json
├── backend/               # FastAPI 后端
│   ├── api/
│   │   ├── routes/        # API 路由定义
│   │   │   ├── workbench.py    # 工作台路由
│   │   │   ├── assets.py       # 资产库路由
│   │   │   ├── tasks.py        # 任务中心路由
│   │   │   ├── insights.py     # 洞察分析路由
│   │   │   ├── dashboard.py    # 数据底座路由
│   │   │   ├── settings.py     # 设置路由
│   │   │   ├── script.py       # 剧本处理路由
│   │   │   └── text_deal.py    # 文本处理路由
│   │   └── __init__.py
│   ├── core/              # 核心模块
│   │   ├── config.py      # 配置管理
│   │   ├── database.py    # 数据库连接
│   │   └── utils.py       # 工具函数
│   ├── schemas/           # Pydantic 数据模型
│   │   ├── text_schema.py     # 文本处理模型
│   │   ├── script_schema.py   # 剧本模型
│   │   └── file_schema.py     # 文件上传模型
│   ├── services/          # 业务服务
│   │   ├── ai_service.py      # AI 服务集成
│   │   └── script_service.py  # 剧本处理服务
│   ├── main.py            # FastAPI 应用入口
│   ├── requirements.txt   # Python 依赖
│   ├── .env               # 环境变量
│   └── .env.example       # 环境变量模板
├── docs/                  # 项目文档
│   ├── PRD.md
│   ├── 技术栈选型文档.md
│   ├── 接口设计文档.md
│   └── UI设计文档.md
├── LICENSE
└── README.md
```

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **pnpm** >= 8（推荐）或 npm / yarn
- **Python** >= 3.12

---

### 1. 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv .venv
source .venv/bin/activate  # macOS / Linux
# 或
.venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 启动 FastAPI 开发服务器（默认 http://127.0.0.1:8000）
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

> **💡 快捷启动**：如果你已经在 `backend` 目录下，可以直接使用虚拟环境中的 `uvicorn`：
>
> ```bash
> cd /Users/allure/Desktop/ScriptForge/backend
> source .venv/bin/activate
> uvicorn main:app --reload
> ```

启动后，访问 `http://127.0.0.1:8000/docs` 查看 Swagger API 文档。

---

### 2. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
pnpm install
# 或
npm install

# 启动开发服务器（默认 http://localhost:5173）
pnpm dev
# 或
npm run dev
```

前端开发服务器已配置 **API 代理**（`vite.config.ts`），默认将 `/api/*` 请求代理到 `http://127.0.0.1:8000`。如需修改后端地址，可通过环境变量设置：

```bash
# 在 frontend/ 目录下创建 .env 文件
echo "VITE_BACKEND_URL=http://127.0.0.1:8000" > .env
```

---

### 3. 验证启动

1. 后端启动后，访问 `http://127.0.0.1:8000/docs` 查看 Swagger API 文档
2. 前端启动后，访问 `http://localhost:5173` 查看应用界面
3. 前端会自动检测后端 `/api/health` 端点，在页面上显示连接状态

---

## API 接口

### 主要端点

| 模块     | 前缀               | 说明                 |
| -------- | ------------------ | -------------------- |
| 文本处理 | `/api/text/*`      | 文本上传、分析、处理 |
| 工作台   | `/api/workbench/*` | 剧集、场景、角色管理 |
| 资产库   | `/api/assets/*`    | 剧本资产管理与导出   |
| 任务中心 | `/api/tasks/*`     | 任务管理与队列监控   |
| 洞察分析 | `/api/insights/*`  | IP 改编评估分析      |
| 数据底座 | `/api/dashboard/*` | API 指标与密钥管理   |
| 设置     | `/api/settings/*`  | 用户设置与账单管理   |
| 剧本处理 | `/api/scripts/*`   | 剧本创建与处理流程   |

---

## 环境变量

### 后端 (`backend/.env`)

| 变量名            | 说明            | 默认值                  |
| ----------------- | --------------- | ----------------------- |
| `FRONTEND_ORIGIN` | 前端来源地址    | `http://localhost:5173` |
| `AI_API_KEY`      | AI 服务 API Key | —                       |
| `AI_API_BASE`     | AI 服务基础 URL | —                       |

### 前端 (`frontend/.env`)

| 变量名              | 说明          | 默认值                  |
| ------------------- | ------------- | ----------------------- |
| `VITE_BACKEND_URL`  | 后端 API 地址 | `http://127.0.0.1:8000` |
| `VITE_API_BASE_URL` | API 基础路径  | `/api`                  |

---

## 可用脚本

### 前端

| 命令           | 说明           |
| -------------- | -------------- |
| `pnpm dev`     | 启动开发服务器 |
| `pnpm build`   | 构建生产版本   |
| `pnpm preview` | 预览生产构建   |
| `pnpm lint`    | 代码检查       |

---

## 核心功能

1. **文本上传** - 支持文本内容和文件上传
2. **AI 人物提取** - 自动识别主要/次要人物
3. **对话提取** - 识别并标记对话内容
4. **场景分析** - 生成场景头（内外景、地点、时间）
5. **心理描写转化** - 将心理描写转为动作/神态描写
6. **场景区分** - 按景物描写相似度划分场景
7. **剧本导出** - 支持 JSON 和 YAML 格式

---

## 相关文档

- [PRD — 产品需求文档](./docs/PRD.md)
- [技术栈选型文档](./docs/技术栈选型文档.md)
- [接口设计文档](./docs/接口设计文档.md)
- [UI设计文档](./docs/UI设计文档.md)

---

## License

本项目基于 MIT 许可证开源 — 详见 [LICENSE](./LICENSE) 文件。
