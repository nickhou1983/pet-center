# 🐾 Pet Center · 宠物信息平台

综合宠物信息平台：**备案登记 + 走失找回 + 领养**。核心能力是「上传照片 + 文字描述 → 属性筛选 + AI 相似度排序 → 自动匹配备案宠物」。

## ✨ 功能概览

- **发布信息**：登记备案、发布走失/捡到、发布领养
- **智能搜索**：上传一张照片并填写描述，系统结合结构化属性筛选与 AI 图像/文本相似度排序，自动查询最匹配的备案宠物
- **浏览展示**：按分类与属性浏览、查看详情

## 🧱 技术栈

| 层 | 技术 |
|----|------|
| 前端 / 全栈 | Next.js（App Router）· TypeScript · Tailwind CSS |
| AI 向量 | transformers.js · CLIP（`Xenova/clip-vit-base-patch32`，512 维图文向量） |
| 数据库 | PostgreSQL + pgvector（Docker） |
| ORM | Prisma |

### 关于 CLIP 跨模态检索

CLIP 将**图片**与**文字**投影到同一 512 维向量空间，因此：

- 备案宠物入库时对照片生成图像向量存入 pgvector
- 查询时：上传照片 → 图像向量（图搜图）；填写描述 → 文本向量（文搜图）
- 检索时对两路相似度加权融合，再叠加属性筛选（品种/颜色/体型/地区）做召回

## 🗺 实施路线（模块 Issue）

| 模块 | 说明 | 优先级 |
|------|------|--------|
| M1 | 基础设施与项目脚手架 | P0 |
| M2 | 数据层与数据模型（Prisma + pgvector） | P0 |
| M3 | AI 向量服务（CLIP） | P0 |
| M4 | 图片存储服务 | P1 |
| M5 | 发布模块 | P0 |
| M6 | 混合搜索模块 | P0 |
| M7 | 浏览与展示模块 | P1 |
| M8 | 数据初始化与文档收尾 | P2 |

**关键路径**：M1 → M2/M3 → M6 → M7 → M8

详见仓库 [Issues](../../issues)（含依赖关系图与实施批次）。

## 🚀 本地开发

### 环境要求
- Node.js 18+（推荐 20 / 22）
- Docker + Docker Compose

### 快速开始
```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制模板）
cp .env.example .env

# 3. 启动 PostgreSQL + pgvector 容器
docker compose up -d

# 4. 应用数据库迁移（创建 pets 表、vector(512) 列与 ivfflat 索引）
npm run db:deploy

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看首页；`GET /api/health` 可用于健康检查。

数据库默认连接（见 `.env.example` 与 `docker-compose.yml`）：

```
postgresql://petcenter:petcenter@localhost:5432/petcenter
```

pgvector 官方镜像已内置 `vector` 扩展；Prisma 迁移会自动执行 `CREATE EXTENSION IF NOT EXISTS "vector"`（见 `prisma/migrations/`），因此无需手动启用。

## 📁 目录结构

```
app/                 # Next.js App Router 页面与 API 路由（Node runtime）
components/           # 共享 React 组件
lib/                 # 共享工具与客户端封装
prisma/              # Prisma schema、枚举与迁移（Pet 模型 + pgvector）
public/              # 静态资源（uploads/ 为运行时用户上传目录）
docker-compose.yml   # 本地 PostgreSQL + pgvector
```

## 🚧 项目状态

**M1 · 基础设施与项目脚手架已完成**：Next.js 14 + TypeScript + Tailwind CSS + ESLint 脚手架、pgvector 数据库环境、环境变量与全局布局均已就绪。

**M2 · 数据层与数据模型已完成**：Prisma `Pet` 模型与枚举（category / species / size / gender / status）、`pets` 表迁移、`imageEmbedding vector(512)` 列与 `ivfflat` 余弦索引均已就绪；`lib/prisma.ts` 提供连接单例，`lib/vector.ts` 封装向量序列化与 `$queryRaw` 相似度检索（`imageEmbedding` 为 `Unsupported("vector(512)")`，读写走 `$queryRaw` / `$executeRaw`）。

后续按模块 Issue（M3+）推进。

## 📄 License

MIT
