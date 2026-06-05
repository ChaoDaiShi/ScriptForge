# ScriptForge · AI 小说转剧本工具

> 让每一部有潜力的网文，都能低成本地走向银幕。

ScriptForge 是一款面向中国网络文学作者及内容制作公司的 AI 剧本创作平台，能将 **3 个章节以上的小说文本** 自动转换为结构化 **YAML 格式剧本初稿**，大幅降低 IP 改编门槛，提升微短剧剧本量产效率。

---

## 技术栈

| 层级            | 选型                            |
| --------------- | ------------------------------- |
| **前端框架**    | React 19 + TypeScript 6         |
| **构建工具**    | Vite 8                          |
| **UI 组件**     | shadcn/ui + Tailwind CSS        |
| **后端框架**    | FastAPI (Python 3.12+)          |
| **数据库**      | PostgreSQL 16（Supabase 托管）  |
| **ORM**         | SQLAlchemy (async)              |
| **AI 模型**     | Claude Sonnet 4.6 / DeepSeek-R1 |
| **缓存 / 队列** | Redis                           |

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
│   │   └── assets/        # 静态资源
│   ├── public/            # 公共静态文件
│   ├── index.html
│   ├── vite.config.ts     # Vite 配置（含 API 代理）
│   ├── tsconfig.json
│   └── package.json
├── backend/               # FastAPI 后端
│   ├── database.py        # SQLAlchemy 异步数据库连接
│   ├── requirements.txt   # Python 依赖
│   └── .env               # 环境变量（数据库配置等）
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
- **Supabase** 项目（数据库已配置，参考 `.env`）

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

# 确保 .env 文件中的数据库配置正确
# 确认 DATABASE_URL 指向你的 Supabase PostgreSQL 实例

# 启动 FastAPI 开发服务器（默认 http://127.0.0.1:5000）
# 方式一：使用 uvicorn
uvicorn main:app --reload --port 5000

# 方式二：使用 FastAPI CLI（需先创建 main.py）
# fastapi dev main.py --port 5000
```

> **注意**：目前后端仅包含 `database.py` 数据库模块，尚未创建 `main.py` 应用入口文件。在启动后端前，需要先创建 FastAPI 应用实例和路由。

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

前端开发服务器已配置 **API 代理**（`vite.config.ts`），默认将 `/api/*` 请求代理到 `http://127.0.0.1:5000`。如需修改后端地址，可通过环境变量设置：

```bash
# 在 frontend/ 目录下创建 .env 文件
echo "VITE_BACKEND_URL=http://127.0.0.1:5000" > .env
```

---

### 3. 验证启动

1. 后端启动后，访问 `http://127.0.0.1:5000/docs` 查看 Swagger API 文档
2. 前端启动后，访问 `http://localhost:5173` 查看应用界面
3. 前端会自动检测后端 `/api/health` 端点，在页面上显示连接状态

---

## 环境变量

### 后端 (`backend/.env`)

| 变量名            | 说明                      | 默认值                     |
| ----------------- | ------------------------- | -------------------------- |
| `DATABASE_URL`    | PostgreSQL 异步连接字符串 | `postgresql+asyncpg://...` |
| `SUPABASE_URL`    | Supabase 项目 URL         | —                          |
| `SUPABASE_KEY`    | Supabase 匿名公钥         | —                          |
| `DB_ECHO`         | 是否打印 SQL 日志         | `false`                    |
| `DB_POOL_SIZE`    | 连接池大小                | `10`                       |
| `DB_MAX_OVERFLOW` | 连接池最大溢出            | `20`                       |

### 前端 (`frontend/.env`)

| 变量名              | 说明          | 默认值                  |
| ------------------- | ------------- | ----------------------- |
| `VITE_BACKEND_URL`  | 后端 API 地址 | `http://127.0.0.1:5000` |
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

## 相关文档

- [PRD — 产品需求文档](./docs/PRD.md)
- [技术栈选型文档](./docs/技术栈选型文档.md)
- [接口设计文档](./docs/接口设计文档.md)
- [UI设计文档](./docs/UI设计文档.md)

---

## License

本项目基于 MIT 许可证开源 — 详见 [LICENSE](./LICENSE) 文件。
