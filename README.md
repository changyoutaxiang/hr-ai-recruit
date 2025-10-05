# 🤖 HR AI 招聘管理系统

> AI 驱动的动态候选人画像系统 - 让每一轮面试都让我们更懂候选人

[![GitHub](https://img.shields.io/badge/GitHub-changyoutaxiang/hr--ai--recruit-blue?logo=github)](https://github.com/changyoutaxiang/hr-ai-recruit)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

---

## 📖 目录

- [项目简介](#-项目简介)
- [核心功能](#-核心功能)
- [技术栈](#-技术栈)
- [快速开始](#-快速开始)
- [环境配置](#-环境配置)
- [API 文档](#-api-文档)
- [项目结构](#-项目结构)
- [开发指南](#-开发指南)
- [部署指南](#-部署指南)
- [常见问题](#-常见问题)

---

## 🎯 项目简介

这是一个全栈的 **HR AI 招聘管理系统**，通过 AI 技术优化招聘流程：

- **智能简历解析**：自动提取候选人技能、经验、教育背景
- **动态候选人画像**：随面试流程演进的 AI 画像系统
- **职位智能匹配**：AI 驱动的候选人-职位兼容性评分
- **面试智能助手**：准备建议、追问建议、AI 洞察分析
- **招聘决策支持**：组织适配性分析、证据驱动决策

### 核心价值主张

> "让每一轮面试都让我们更懂候选人，让每一个决策都有 AI 洞察支持"

---

## ✨ 核心功能

### 🧠 AI 能力

| 功能 | 说明 | 服务模块 |
|------|------|----------|
| **智能简历解析** | PDF 视觉解析 + 文本提取，支持多模态分析 | `resumeParser.ts`<br>`resumeParserEnhanced.ts` |
| **动态候选人画像** | 版本化画像管理，随面试流程演进 | `candidateProfileService.ts` |
| **职位智能匹配** | 多维度匹配分析，AI 评分 | `matchingService.ts` |
| **面试智能助手** | 准备建议、追问建议、关键发现提取 | `interviewAssistantService.ts` |
| **招聘决策支持** | 组织适配性、证据收集、综合分析 | `hiringDecisionService.ts` |
| **AI 聊天助手** | 招聘最佳实践指导，可定制提示词模板 | `aiService.ts` |

### 💼 业务功能

- **候选人管理**：完整的候选人生命周期管理
- **职位管理**：职位发布、编辑、状态管理
- **面试管理**：面试安排、反馈收集、录音转写
- **实时协作**：WebSocket 实时通知、活动日志
- **权限管理**：基于角色的访问控制（Recruiter, Hiring Manager, Lead）

---

## 🛠 技术栈

### 前端

- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: Wouter
- **状态管理**: TanStack Query
- **UI 组件**: Radix UI + shadcn/ui
- **样式**: Tailwind CSS
- **动画**: Framer Motion

### 后端

- **运行时**: Node.js 18+
- **框架**: Express.js + TypeScript (ES Modules)
- **ORM**: Drizzle ORM
- **数据库**: PostgreSQL (Supabase)
- **认证**: Supabase Auth (JWT + PKCE)
- **实时通信**: WebSocket (ws)
- **文件存储**: Supabase Storage

### AI 集成

- **AI 平台**: OpenRouter API
- **支持模型**:
  - GPT-5 (简历分析、画像生成)
  - Claude Sonnet 4 (备用旗舰)
  - Gemini 2.5 Pro (职位匹配)
  - Gemini 2.5 Flash (聊天助手)
- **多模态**: 支持 PDF 视觉解析

---

## 🚀 快速开始

### 前置要求

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **PostgreSQL** 数据库（推荐使用 Supabase）
- **OpenRouter API Key** (获取地址: https://openrouter.ai/)

### 安装步骤

#### 1. 克隆项目

```bash
git clone https://github.com/changyoutaxiang/hr-ai-recruit.git
cd hr-ai-recruit
```

#### 2. 安装依赖

```bash
npm install
```

#### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入真实的配置信息：

```bash
cp .env.example .env
```

**必需的环境变量**：

```bash
# Supabase 配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 前端 Supabase 配置（需要 VITE_ 前缀）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 数据库连接（用于 Drizzle ORM）
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# OpenRouter AI 配置
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxx

# AI 模型配置（可选，使用默认值）
RESUME_AI_MODEL=openai/gpt-5
CHAT_AI_MODEL=google/gemini-2.5-flash
AI_MODEL=google/gemini-2.5-pro
PROFILE_AI_MODEL=openai/gpt-5
MATCHING_AI_MODEL=google/gemini-2.5-pro
VISION_AI_MODEL=openai/gpt-5

# 功能开关（可选）
ENABLE_VISION_PARSING=true

# 服务器配置（可选）
NODE_ENV=development
PORT=5000
```

> 📚 **详细配置指南**: 参考下方 [环境配置](#%EF%B8%8F-环境配置) 章节

#### 4. 初始化数据库

运行数据库迁移：

```bash
npm run db:push
```

或手动执行 SQL 脚本（推荐）：

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard)
2. 进入 SQL Editor
3. 复制 `migrations/001_initial_schema.sql` 内容并执行

#### 5. 启动开发服务器

```bash
npm run dev
```

开发服务器将同时启动前端和后端：
- **前端开发服务器**: http://localhost:5173 (Vite Hot Reload)
- **后端 API 服务器**: http://localhost:5000
- **生产环境**: http://localhost:5000 (前端打包后由 Express 提供)

#### 6. 创建测试用户（可选）

在 Supabase Dashboard > Authentication > Users 中创建测试账号：

- `recruiter@test.com` / `Test123456!` (招聘专员)
- `hiring@test.com` / `Test123456!` (Hiring Manager)

---

## ⚙️ 环境配置

### Supabase 配置步骤

1. **创建 Supabase 项目**
   - 访问 https://supabase.com/dashboard
   - 创建新项目并记录 Project URL 和 API Keys

2. **配置数据库**
   - 在 SQL Editor 中执行 `migrations/001_initial_schema.sql`
   - 验证 13 张表创建成功

3. **配置 Storage**
   - 创建 `resumes` bucket (10MB 限制)
   - 创建 `interview-recordings` bucket (50MB 限制)
   - 设置访问策略（参考 `docs/Supabase配置指南.md`）

4. **获取连接字符串**
   - Settings > Database > Connection String
   - 使用 **Pooler** 模式的连接字符串
   - 更新 `.env` 中的 `DATABASE_URL`

### AI 模型配置

项目支持多模型配置，根据任务类型使用不同模型：

| 场景 | 环境变量 | 推荐模型 | 说明 |
|------|----------|----------|------|
| 简历分析 | `RESUME_AI_MODEL` | `openai/gpt-5` | 需要最高准确度 |
| 候选人画像 | `PROFILE_AI_MODEL` | `openai/gpt-5` | 需要深度理解 |
| 职位匹配 | `MATCHING_AI_MODEL` | `google/gemini-2.5-pro` | 平衡效果和成本 |
| 聊天助手 | `CHAT_AI_MODEL` | `google/gemini-2.5-flash` | 高频调用,经济型 |
| 视觉解析 | `VISION_AI_MODEL` | `openai/gpt-5` | 多模态支持 |

### 安全配置

⚠️ **重要**：生产环境部署前必须修改以下配置：

- `SESSION_SECRET` - 更换为随机字符串（建议 32+ 字符）
- 定期轮换 `SUPABASE_SERVICE_ROLE_KEY`
- 启用 Supabase RLS (Row Level Security) 策略
- 限制 CORS 允许的域名

---

## 📡 API 文档

### 基础信息

- **Base URL**: `http://localhost:5000/api`
- **认证方式**: Session Cookie (Passport.js)
- **响应格式**: JSON

### 核心端点

#### 用户管理

```http
GET    /api/users/:id              # 获取用户信息
POST   /api/users                  # 创建用户
```

#### 候选人管理

```http
GET    /api/candidates             # 获取候选人列表
POST   /api/candidates             # 创建候选人
GET    /api/candidates/:id         # 获取候选人详情
PUT    /api/candidates/:id         # 更新候选人信息
DELETE /api/candidates/:id         # 删除候选人

POST   /api/candidates/:id/analyze # AI 分析候选人简历
POST   /api/resume/parse           # 解析简历文件

# 候选人画像管理
GET    /api/candidates/:id/profiles        # 获取画像版本列表
POST   /api/candidates/:id/profiles        # 创建新画像版本
GET    /api/candidates/:id/profiles/:version # 获取特定版本画像
```

#### 职位管理

```http
GET    /api/jobs                   # 获取职位列表
POST   /api/jobs                   # 创建职位
GET    /api/jobs/:id               # 获取职位详情
PUT    /api/jobs/:id               # 更新职位
DELETE /api/jobs/:id               # 删除职位
```

#### 面试管理

```http
GET    /api/interviews             # 获取面试列表
POST   /api/interviews             # 创建面试
GET    /api/interviews/:id         # 获取面试详情
PUT    /api/interviews/:id         # 更新面试
DELETE /api/interviews/:id         # 删除面试

POST   /api/interviews/:id/prepare  # AI 生成面试准备建议
POST   /api/interviews/:id/feedback # 提交面试反馈
POST   /api/interviews/:id/assistant # 获取面试助手建议（追问建议等）
POST   /api/interviews/:id/transcribe # 转写面试录音

# 招聘决策支持
POST   /api/hiring-decision/analyze # 获取招聘决策分析
GET    /api/hiring-decision/:candidateId # 获取候选人决策报告
```

#### AI 功能

```http
POST   /api/ai/chat                # AI 聊天助手
GET    /api/ai/conversations       # 获取对话历史
POST   /api/matching/analyze       # AI 职位匹配分析
```

#### 提示词模板

```http
GET    /api/prompt-templates       # 获取模板列表
POST   /api/prompt-templates       # 创建模板
GET    /api/prompt-templates/:id   # 获取模板详情
PUT    /api/prompt-templates/:id   # 更新模板
DELETE /api/prompt-templates/:id   # 删除模板
```

#### Dashboard

```http
GET    /api/dashboard/metrics      # 获取统计数据
```

### 请求示例

#### 创建候选人

```bash
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "position": "前端工程师",
    "experience": 3,
    "education": "本科",
    "skills": ["React", "TypeScript", "Node.js"]
  }'
```

#### AI 简历分析

```bash
curl -X POST http://localhost:5000/api/candidates/123/analyze \
  -H "Content-Type: application/json"
```

---

## 📁 项目结构

```
hr-ai-recruit/
├── client/                 # 前端代码
│   └── src/
│       ├── components/     # React 组件 (31 个)
│       ├── pages/          # 页面组件 (13 个)
│       ├── hooks/          # 自定义 Hooks
│       ├── contexts/       # React Contexts (Auth, WebSocket, Language)
│       ├── lib/            # 工具函数
│       └── types/          # TypeScript 类型定义
│
├── server/                 # 后端代码
│   ├── routes.ts           # API 路由定义 (77 个端点)
│   ├── storage.ts          # 数据库操作层
│   ├── services/           # 业务逻辑层 (14 个服务)
│   │   ├── aiService.ts                    # AI 核心服务
│   │   ├── resumeParser.ts                 # 简历解析
│   │   ├── candidateProfileService.ts      # 动态画像
│   │   ├── matchingService.ts              # 职位匹配
│   │   ├── interviewAssistantService.ts    # 面试助手
│   │   ├── hiringDecisionService.ts        # 决策支持
│   │   └── ...
│   ├── middleware/         # 中间件
│   └── websocket.ts        # WebSocket 服务
│
├── shared/
│   └── schema.ts           # Drizzle ORM Schema (13 张表)
│
├── migrations/             # 数据库迁移文件
├── docs/                   # 项目文档
│   ├── PRD_v2.0.md         # 产品需求文档
│   ├── 开发规划.md          # 开发计划
│   ├── Supabase配置指南.md  # Supabase 配置
│   └── 快速开始.md          # 快速开始指南
│
├── .env.example            # 环境变量模板
├── .gitignore              # Git 忽略配置
├── package.json            # 项目依赖
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
├── tailwind.config.ts      # Tailwind CSS 配置
└── vercel.json             # Vercel 部署配置
```

### 核心数据库表

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 用户表 | id, email, role |
| `candidates` | 候选人表 | id, name, resumeUrl, skills, matchScore |
| `jobs` | 职位表 | id, title, requirements, status |
| `interviews` | 面试表 | id, candidateId, jobId, feedback, rating |
| `candidate_profiles` | **动态画像表** | candidateId, version, stage, profileData |
| `job_matches` | 职位匹配表 | candidateId, jobId, matchScore, matchReasons |
| `ai_conversations` | AI 对话历史 | userId, message, response, modelUsed |
| `prompt_templates` | 提示词模板 | name, category, template, variables |
| `activity_log` | 活动日志 | userId, action, entityType |
| `notifications` | 通知表 | userId, type, title, isRead |
| `comments` | 评论表 | entityType, entityId, content |

---

## 🔧 开发指南

### 可用脚本

```bash
# 开发
npm run dev          # 启动开发服务器 (前端 + 后端)
npm run check        # TypeScript 类型检查

# 构建
npm run build        # 构建生产版本 (Vite + esbuild)

# 生产
npm run start        # 运行生产环境服务器

# 数据库
npm run db:push      # 推送 Schema 到数据库 (Drizzle Kit)
```

### 开发工作流

1. **数据库变更**
   ```bash
   # 修改 shared/schema.ts
   # 推送到数据库
   npm run db:push
   ```

2. **添加新 API**
   - 在 `server/routes.ts` 添加路由
   - 在 `server/storage.ts` 添加数据库操作
   - 在 `server/services/` 添加业务逻辑

3. **添加新页面**
   - 在 `client/src/pages/` 创建页面组件
   - 在 `client/src/App.tsx` 添加路由
   - 使用 TanStack Query 管理服务器状态

4. **AI 功能开发**
   - 在 `server/services/` 创建新服务
   - 使用 `aiService.ts` 调用 OpenRouter API
   - 在 `server/routes.ts` 暴露 API 端点

### 代码规范

- **TypeScript**: 严格模式，所有文件必须类型安全
- **代码风格**: 建议使用 ESLint + Prettier 规范代码
- **命名约定**:
  - 组件: PascalCase (`CandidateList.tsx`)
  - 函数/变量: camelCase (`getCandidates`)
  - 类型: PascalCase (`CandidateType`)
  - 常量: UPPER_SNAKE_CASE (`API_BASE_URL`)

### 调试技巧

**后端调试**:
```bash
# 查看服务器日志
NODE_ENV=development tsx server/index.ts

# 数据库查询日志
# 在 drizzle.config.ts 中启用 verbose: true
```

**前端调试**:
- 使用 React DevTools
- 使用 TanStack Query DevTools (已集成)
- 浏览器控制台查看网络请求

---

## 🚀 部署指南

### Vercel 部署（推荐）

1. **连接 GitHub**
   - 在 [Vercel Dashboard](https://vercel.com/dashboard) 导入项目
   - 选择 GitHub 仓库 `changyoutaxiang/hr-ai-recruit`

2. **配置环境变量**
   - 在 Vercel Project Settings > Environment Variables 添加所有 `.env` 中的变量
   - 确保添加生产环境的 `SUPABASE_URL` 和 `DATABASE_URL`

3. **构建设置**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **部署**
   - 推送到 `main` 分支自动触发部署
   - 或在 Vercel Dashboard 手动部署

### 手动部署

```bash
# 构建生产版本
npm run build

# 上传到服务器
scp -r dist package.json package-lock.json user@server:/path/to/app

# 在服务器上
cd /path/to/app
npm install --production
NODE_ENV=production node dist/index.js
```

### Docker 部署

```dockerfile
# Dockerfile (示例)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

---

## ❓ 常见问题

### Q: 数据库连接失败？

**A**: 检查以下配置：
1. `.env` 中的 `DATABASE_URL` 密码是否正确
2. 使用 **Pooler** 连接字符串（端口 6543），而非 Direct 连接
3. Supabase 项目是否处于暂停状态（免费计划会自动暂停）

```bash
# 正确的格式
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Q: AI 功能报错 401 Unauthorized？

**A**: 检查 `OPENROUTER_API_KEY` 是否有效：
1. 访问 https://openrouter.ai/keys 验证 API Key
2. 检查账户余额是否充足
3. 确认 API Key 有正确的权限

### Q: 文件上传失败？

**A**: 检查 Supabase Storage 配置：
1. 确认 Storage bucket 已创建（`resumes`, `interview-recordings`）
2. 检查 bucket 的访问策略和权限设置
3. 验证文件大小是否超过限制（resumes: 10MB, recordings: 50MB）
4. 在 Supabase Dashboard > Storage 中查看上传日志

### Q: 前端路由刷新后 404？

**A**: 这是 SPA 路由问题：
- **Vercel**: 已在 `vercel.json` 中配置重定向规则
- **其他服务器**: 需要配置所有路径返回 `index.html`

### Q: WebSocket 连接失败？

**A**: 检查：
1. 防火墙是否阻止 WebSocket 连接
2. 代理服务器（如 Nginx）是否支持 WebSocket 升级
3. 浏览器控制台是否有 CORS 错误

### Q: 如何切换 AI 模型？

**A**: 修改 `.env` 文件中的模型配置：

```bash
# 使用更经济的模型
RESUME_AI_MODEL=google/gemini-2.5-pro
CHAT_AI_MODEL=google/gemini-2.5-flash

# 或使用最强模型
RESUME_AI_MODEL=openai/gpt-5
CHAT_AI_MODEL=openai/gpt-5-chat
```

查看所有可用模型：https://openrouter.ai/models

---

## 📚 相关资源

> 📝 **注意**: 详细文档即将推出，当前请参考 README.md 和 CLAUDE.md 文件

### 外部链接

- [Supabase 文档](https://supabase.com/docs)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [OpenRouter API 文档](https://openrouter.ai/docs)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 📧 联系方式

- **项目链接**: https://github.com/changyoutaxiang/hr-ai-recruit
- **问题反馈**: [GitHub Issues](https://github.com/changyoutaxiang/hr-ai-recruit/issues)

---

<p align="center">
  Made with ❤️ by the HR AI Team
</p>
