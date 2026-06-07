# ScriptForge · AI 小说转剧本工具

> 让每一部有潜力的网文，都能低成本地走向银幕。

ScriptForge 是一款面向网络文学作者及微短剧制作团队的 AI 剧本创作平台，能将 **3 个章节以上的小说文本** 自动转换为结构化剧本初稿，支持 YAML / JSON 格式导出，大幅降低 IP 改编门槛，提升微短剧剧本量产效率。

---

## Demo 演示

> 在线观看无需下载或注册

🔗 **演示视频：** [点击观看 ScriptForge Demo](https://your-demo-video-link)

> 如上方链接无法访问，请检查 README 仓库中的 demo 视频直链。

---

## 代码仓库

| 平台   | 地址                                                                               |
| ------ | ---------------------------------------------------------------------------------- |
| GitHub | [https://github.com/your-org/ScriptForge](https://github.com/AlkaidSTART/ScriptForge) |

---

## 核心功能

| 功能模块               | 说明                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| **文本导入**     | 支持 TXT、MD、DOC、DOCX 文件上传或粘贴，自动识别章节结构                                                |
| **AI 结构化**    | 12 步流水线处理：对话提取 → 人物识别 → 主线分析 → 场景拆分 → 心理描写转换 → 无用句检测 → 润色导出 |
| **流式输出**     | AI 转换过程实时流式推送，可视化处理进度与中间结果                                                       |
| **可视化编剧台** | 三栏布局：原始文本 / 剧本预览 / AI 助手，支持场景卡片切换、对话编辑                                     |
| **剧本导出**     | 支持 JSON 和 YAML 格式，一键下载结构化剧本                                                              |
| **多平台分发**   | 对接火山方舟、微信视频号、抖音等平台（规划中）                                                          |
| **用户系统**     | 邮箱注册 / 登录，积分消耗机制                                                                           |

---

## 技术栈

| 层级               | 选型                                     |
| ------------------ | ---------------------------------------- |
| **前端框架** | React 19 + TypeScript                    |
| **构建工具** | Vite 8                                   |
| **UI 方案**  | Tailwind CSS 4 + Radix UI + Lucide Icons |
| **状态管理** | Zustand 5                                |
| **后端框架** | FastAPI (Python 3.12+)                   |
| **数据库**   | PostgreSQL（Supabase 托管）              |
| **AI 模型**  | DeepSeek-R1 / Claude Sonnet 4            |

---

## 项目结构

```
ScriptForge/
├── frontend/                    # React + Vite 前端
│   ├── src/
│   │   ├── App.tsx              # 主应用与路由配置
│   │   ├── main.tsx             # 应用入口
│   │   ├── index.css            # 全局样式与 CSS 变量
│   │   ├── lib/
│   │   │   ├── api.ts           # API 请求封装（含认证拦截）
│   │   │   └── chapterUtils.ts  # 章节检测与内容提取
│   │   ├── features/
│   │   │   ├── auth/            # 认证模块
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RechargePage.tsx
│   │   │   └── workbench/       # 工作台模块
│   │   │       ├── Workbench.tsx            # 编剧台主页面
│   │   │       ├── ImportPage.tsx           # 小说导入页
│   │   │       ├── TasksPage.tsx            # 任务中心
│   │   │       ├── AssetsPage.tsx           # 资产库
│   │   │       ├── DistributePage.tsx       # 多平台分发
│   │   │       ├── InsightsPage.tsx         # 洞察分析
│   │   │       ├── DashboardPage.tsx        # 数据仪表盘
│   │   │       ├── SettingsPage.tsx         # 设置
│   │   │       └── WorkbenchDistributeSection.tsx
│   │   ├── store/               # Zustand 状态管理
│   │   │   ├── useAuthStore.ts   # 认证/用户状态
│   │   │   ├── useProjectStore.ts # 项目状态
│   │   │   ├── useScriptStore.ts  # 剧本状态
│   │   │   ├── useNovelStore.ts   # 小说内容状态
│   │   │   ├── useTaskStore.ts    # 任务状态
│   │   │   ├── useAIStore.ts     # AI 处理状态
│   │   │   ├── useLayoutStore.ts # 布局/UI 状态
│   │   │   └── useToastStore.ts   # Toast 通知状态
│   │   └── components/
│   │       ├── layout/
│   │       │   ├── Layout.tsx    # 全局布局（含游客模式提示）
│   │       │   └── Sidebar.tsx   # 侧边栏导航
│   │       └── ui/
│   │           ├── button.tsx     # 通用按钮组件
│   │           └── ToastContainer.tsx
│   ├── vite.config.ts           # Vite 配置（含 API 代理）
│   ├── tsconfig.json
│   └── package.json
├── backend/                     # FastAPI 后端
│   ├── main.py                  # 应用入口，注册 10 个路由模块
│   ├── api/
│   │   ├── __init__.py          # 路由统一导出
│   │   └── routes/
│   │       ├── auth.py          # 认证鉴权（登录/注册/用户信息）
│   │       ├── projects.py      # 项目管理
│   │       ├── script.py        # 剧本 CRUD 与处理
│   │       ├── text_deal.py     # 文本上传与预处理
│   │       ├── workbench.py     # 工作台（流式处理）
│   │       ├── tasks.py         # 任务中心
│   │       ├── assets.py        # 资产库
│   │       ├── insights.py      # 洞察分析
│   │       ├── dashboard.py     # 数据仪表盘
│   │       └── settings.py      # 设置
│   ├── core/
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库探针与连接
│   │   └── utils.py             # 工具函数
│   ├── schemas/                 # Pydantic 数据模型
│   │   ├── script_schema.py
│   │   ├── text_schema.py
│   │   └── file_schema.py
│   ├── services/                # 业务服务
│   │   ├── ai_service.py        # AI 模型调用（DeepSeek/Claude）
│   │   └── script_service.py    # 剧本处理流水线
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── docs/                        # 项目文档
│   ├── PRD.md
│   ├── 技术栈选型文档.md
│   ├── 接口设计文档.md
│   ├── UI设计文档.md
│   ├── 商业化分析报告.md
│   └── 接入平台文档.md
├── LICENSE
└── README.md
```

---

## 快速开始

### 环境要求

| 工具                 | 最低版本                   |
| -------------------- | -------------------------- |
| **Node.js**    | >= 18                      |
| **pnpm**       | >= 8（推荐，或 npm）       |
| **Python**     | >= 3.12                    |
| **PostgreSQL** | 16+（Supabase 托管或本地） |

---

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/ScriptForge.git
cd ScriptForge
```

---

### 2. 后端启动

```bash
# 进入后端目录
cd backend

# 创建虚拟环境（推荐）
python -m venv .venv

# 激活虚拟环境
# macOS / Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 配置环境变量（复制模板后填入真实值）
cp .env.example .env

# 启动 FastAPI 开发服务器
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

启动后访问 `http://127.0.0.1:8000/docs` 查看 Swagger API 文档。

---

### 3. 前端启动

```bash
# 新开终端，进入前端目录
cd frontend

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

启动后访问 `http://localhost:5173` 即可使用。

前端已配置 API 代理（`vite.config.ts`），`/api/*` 请求自动转发到后端 `http://127.0.0.1:8000`。

---

### 4. 验证启动

1. 后端运行后访问 `http://127.0.0.1:8000/health` 应返回 JSON 状态信息
2. 前端运行后访问 `http://localhost:5173` 显示登录页面
3. 可通过「先逛逛」进入游客模式，或注册账号登录使用完整功能

---

## 环境变量

### 后端 (`backend/.env`)

| 变量名              | 说明                | 示例值                                                              |
| ------------------- | ------------------- | ------------------------------------------------------------------- |
| `SUPABASE_URL`    | Supabase 项目 URL   | `https://your-project.supabase.co`                                |
| `SUPABASE_KEY`    | Supabase 匿名密钥   | `eyJ...`                                                          |
| `DATABASE_URL`    | PostgreSQL 连接串   | `postgresql://postgres:password@db.xxx.supabase.co:5432/postgres` |
| `FRONTEND_ORIGIN` | 前端地址（CORS 用） | `http://localhost:5173`                                           |

### 前端 (`frontend/.env`)

| 变量名                | 说明          | 默认值                    |
| --------------------- | ------------- | ------------------------- |
| `VITE_BACKEND_URL`  | 后端 API 地址 | `http://127.0.0.1:8000` |
| `VITE_API_BASE_URL` | API 基础路径  | `/api`                  |

---

## API 接口概览

| 模块   | 前缀                 | 说明                           |
| ------ | -------------------- | ------------------------------ |
| 认证   | `/api/auth/*`      | 注册、登录、用户信息、积分管理 |
| 项目   | `/api/projects/*`  | 项目创建与管理                 |
| 剧本   | `/api/scripts/*`   | 剧本 CRUD 与处理流程           |
| 文本   | `/api/text/*`      | 文本上传、预处理               |
| 工作台 | `/api/workbench/*` | 流式 AI 处理、场景/角色管理    |
| 任务   | `/api/tasks/*`     | 异步任务状态与队列             |
| 资产   | `/api/assets/*`    | 剧本资产管理与导出             |
| 洞察   | `/api/insights/*`  | IP 改编评估分析                |
| 仪表盘 | `/api/dashboard/*` | API 指标与用量统计             |
| 设置   | `/api/settings/*`  | 用户设置与账单                 |

---

## 前端页面

| 路由            | 页面           | 说明                   |
| --------------- | -------------- | ---------------------- |
| `/login`      | LoginPage      | 登录 / 注册            |
| `/workbench`  | Workbench      | 编剧台（核心三栏布局） |
| `/import`     | ImportPage     | 小说导入与 AI 转换     |
| `/tasks`      | TasksPage      | 任务中心               |
| `/assets`     | AssetsPage     | 资产库                 |
| `/distribute` | DistributePage | 多平台分发             |
| `/insights`   | InsightsPage   | IP 洞察分析            |
| `/dashboard`  | DashboardPage  | 数据仪表盘             |
| `/settings`   | SettingsPage   | 用户设置               |
| `/recharge`   | RechargePage   | 积分充值               |

---

## 可用脚本

### 前端

```bash
pnpm dev        # 启动开发服务器 (localhost:5173)
pnpm build      # 构建生产版本
pnpm preview    # 预览生产构建
pnpm lint       # ESLint 代码检查
pnpm typecheck  # TypeScript 类型检查
```

### 后端

```bash
# 开发模式（热重载）
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# 直接运行（无热重载）
python main.py
```

---

## AI 处理流水线

ScriptForge 将小说转剧本分为 **12 个阶段**，按序执行：

1. **对话提取** — 识别文本中的对话内容并添加唯一标识
2. **人物提取** — 提取主要/次要人物及描写
3. **主线提取** — 分析故事主线脉络
4. **对话主体标记** — 为对话分配说话人
5. **场景分析** — 生成场景头（内外景、地点、时间）
6. **心理描写转换** — 将心理描写转为动作/神态描写
7. **场景打包** — 按场景划分对话与动作
8. **无用句检测** — 识别与剧情推进无关的语句
9. **无用句移除** — 自动清理冗余内容
10. **润色处理** — 优化对白与动作表达
11. **导出** — 生成结构化 YAML/JSON 剧本

处理过程通过 **SSE 流式推送**，前端实时展示每个阶段的进度与中间结果。

---

## 相关文档

- [PRD — 产品需求文档](./docs/PRD.md)
- [技术栈选型文档](./docs/技术栈选型文档.md)
- [接口设计文档](./docs/接口设计文档.md)
- [UI设计文档](./docs/UI设计文档.md)
- [商业化分析报告](./docs/商业化分析报告.md)
- [接入平台文档](./docs/接入平台文档.md)

---

## License

本项目基于 MIT 许可证开源 — 详见 [LICENSE](./LICENSE) 文件。
