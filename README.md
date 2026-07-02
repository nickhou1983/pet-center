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
- Node.js 20+（推荐 20 / 22；`npm run test` 使用的 Vitest 4 需要 Node `^20.19` 或 `>=22.12`）
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

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/upload` | 图片上传（`multipart/form-data`） |

### `POST /api/upload`

上传一张或多张图片，保存到 `public/uploads/` 并返回可访问 URL，供发布模块（M5）保存宠物照片。

- **请求**：`multipart/form-data`，字段名 `files`（可重复以支持多图上传）
- **支持格式**：JPEG / PNG / WebP（以文件 magic bytes 签名为准校验，不信任客户端声明的 MIME）
- **限制**：单文件默认 5 MB、单次请求默认 10 个文件（可用 `UPLOAD_MAX_FILE_SIZE_BYTES` / `UPLOAD_MAX_FILES` 覆盖）
- **成功响应** `201`：
  ```json
  {
    "files": [
      { "url": "/uploads/<uuid>.jpg", "filename": "<uuid>.jpg", "size": 12345, "type": "image/jpeg" }
    ]
  }
  ```
- **错误响应**（JSON `{ "error", "code", "filename?" }`）：
  - `400` — 未提供文件 / 超过数量上限 / 空文件 / 非 `multipart/form-data` 请求
  - `413` — 单文件超过大小上限
  - `415` — 不支持的类型（文件字节不是受支持的图片格式）

校验为原子操作：任一文件不合法则整批拒绝，不写入任何文件。文件名使用 UUID 生成以避免冲突；存储通过 `lib/storage.ts` 的 `StorageProvider` 抽象，后续可平滑替换为对象存储（S3/OSS）。

> 返回的 `/uploads/*` URL 经 `next.config.mjs` 的 `beforeFiles` 重写交由 `app/api/media/[...path]/route.ts` 提供，因此运行时上传的文件在 `next dev` 与 `next start` 下均可访问（`next start` 会在启动时快照 `public/` 清单，静态方式无法读取启动后新增的文件）。该路由也是后续切换到对象存储的接入点。

```bash
curl -F "files=@cat.jpg" -F "files=@dog.png" http://localhost:3000/api/upload
```

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

**M3 · AI 向量服务（CLIP）已完成**：`lib/clip.ts` 封装 CLIP（`Xenova/clip-vit-base-patch32`）图文向量服务——`getTextEmbedding(text)` 与 `getImageEmbedding(input)` 均返回 512 维、L2 归一化的 `number[]`；图文共享同一向量空间，可直接做余弦相似度（`lib/vector.ts` 新增 `cosineSimilarity`）。模型经 transformers.js 加载并以进程内单例缓存，仅加载一次（首次运行从 Hugging Face Hub 下载 ~300MB 至 `TRANSFORMERS_CACHE`，默认 `./.cache`）；`next.config.mjs` 将 `onnxruntime-node` / `sharp` 等原生依赖标记为 server external，服务运行于 Node runtime。诊断自检路由 `GET /api/vector` 可验证向量维度、归一化与跨模态语义对齐，并演示单例缓存命中；也支持 `?text=` / `?image=` 探针自查。

**M4 · 图片存储服务已完成**：`POST /api/upload` 支持 `multipart/form-data` 多图上传，按 JPEG / PNG / WebP 白名单（以 magic bytes 文件签名为准校验，不信任客户端声明的 MIME）及大小/数量上限校验，使用 UUID 文件名保存至 `public/uploads/` 并返回可访问 URL；`lib/storage.ts` 提供可平滑替换为对象存储（S3/OSS）的 `StorageProvider` 抽象，`lib/image-upload.ts` 封装校验逻辑，均有 Vitest 单元测试覆盖（`npm run test`）。

后续按模块 Issue（M5+）推进。

## 📄 License

MIT
