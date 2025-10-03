# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目信息

**GitHub 仓库**: https://github.com/changyoutaxiang/hr-ai-recruit.git

## 项目概述

这是一个全栈的 HR 招聘管理系统，支持候选人管理、职位发布、面试安排、AI 简历分析和智能匹配功能。系统内置了 AI 助手用于招聘指导，并提供可定制的提示词模板系统。

## 关键命令

### 开发和构建
- `npm run dev` - 启动开发服务器（前端 Vite + 后端 Express）
- `npm run build` - 构建生产版本（前端打包 + 后端 bundle）
- `npm run start` - 运行生产环境服务器
- `npm run check` - TypeScript 类型检查

### 数据库
- `npm run db:push` - 推送 schema 变更到数据库（使用 Drizzle Kit）

## 架构概览

### 技术栈
- **前端**: React 18 + TypeScript + Vite + Wouter(路由) + TanStack Query(状态管理)
- **后端**: Express.js + TypeScript(ES modules) + Drizzle ORM
- **数据库**: PostgreSQL (Neon serverless)
- **UI**: Radix UI + shadcn/ui + Tailwind CSS
- **AI**: OpenAI GPT-5
- **存储**: Google Cloud Storage

### 项目结构
```
├── client/src/          # 前端代码
│   ├── pages/           # 页面组件 (dashboard, candidates, jobs, interviews, ai-assistant, templates)
│   ├── components/      # 可复用组件 (包括 ai-chat, resume-uploader, prompt-template-manager 等)
│   ├── hooks/           # 自定义 React hooks
│   ├── contexts/        # React contexts
│   └── lib/             # 工具函数
├── server/              # 后端代码
│   ├── routes.ts        # API 路由定义
│   ├── storage.ts       # 数据库操作层
│   ├── services/        # 业务逻辑层
│   │   ├── aiService.ts         # AI 集成服务
│   │   ├── resumeParser.ts      # 简历解析服务
│   │   ├── matchingService.ts   # 候选人匹配服务
│   │   └── promptTemplates.ts   # 提示词模板服务
│   ├── objectStorage.ts # GCS 文件存储
│   ├── objectAcl.ts     # 文件访问控制
│   └── websocket.ts     # WebSocket 实时通信
└── shared/
    └── schema.ts        # Drizzle ORM schema (数据库表定义)
```

### 数据库 Schema
核心表: `users`, `jobs`, `candidates`, `interviews`, `aiConversations`, `jobMatches`, `promptTemplates`, `candidateStatusHistory`

### 路径别名
- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@assets/` → `attached_assets/`

## 开发指南

### 数据库变更
1. 在 `shared/schema.ts` 中修改 schema
2. 运行 `npm run db:push` 推送到数据库
3. 不需要手动创建 migration 文件

### API 开发
- 所有 API 路由在 `server/routes.ts` 中定义
- 数据库操作函数在 `server/storage.ts` 中实现
- AI 相关服务在 `server/services/` 目录下

### 前端开发
- 使用 TanStack Query 管理服务器状态和缓存
- 使用 Wouter 进行客户端路由
- UI 组件基于 shadcn/ui 规范，位于 `client/src/components/ui/`
- 自定义业务组件直接放在 `client/src/components/`

### AI 功能
- 简历分析: 自动提取技能、计算工作经验、生成候选人总结
- 职位匹配: AI 驱动的候选人-职位兼容性评分
- AI 助手: 招聘指导和最佳实践的对话界面
- 提示词模板: 可定制的模板系统，确保 AI 交互的一致性

### 文件上传
- 使用 Google Cloud Storage 存储文件
- Multer 处理文件上传
- pdf-parse 提取 PDF 简历文本
- Uppy.js 提供客户端上传界面

## 环境要求

### 必需的环境变量

**Supabase 配置**:
- `SUPABASE_URL` - Supabase 项目 URL
- `SUPABASE_ANON_KEY` - Supabase 匿名密钥（用于客户端）
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 服务角色密钥（用于服务端，完全访问权限）
- `VITE_SUPABASE_URL` - 前端 Supabase URL（需要 VITE_ 前缀）
- `VITE_SUPABASE_ANON_KEY` - 前端 Supabase 匿名密钥
- `DATABASE_URL` - PostgreSQL 连接字符串（用于 Drizzle ORM）

**AI 配置**:
- `OPENROUTER_API_KEY` - OpenRouter API 密钥（支持多个 AI 模型）
- `AI_MODEL` - 默认 AI 模型（如 `google/gemini-2.5-flash`）

**可选配置**:
- `RESUME_AI_MODEL` - 简历分析专用模型（推荐 `openai/gpt-5`）
- `PROFILE_AI_MODEL` - 候选人画像生成模型
- `MATCHING_AI_MODEL` - 职位匹配模型
- `CHAT_AI_MODEL` - 聊天助手模型
- `VISION_AI_MODEL` - 视觉分析模型（PDF 多模态解析）
- `ENABLE_VISION_PARSING` - 启用视觉解析（默认 true）
- `NODE_ENV` - 运行环境（development/production）
- `SESSION_SECRET` - Session 密钥（生产环境必须修改）

### 安全注意事项

⚠️ **绝不要提交 `.env` 文件到 Git！**
- `.env` 文件已添加到 `.gitignore`
- 仅提交 `.env.example` 模板文件
- 所有敏感信息（API 密钥、数据库密码）仅存储在本地 `.env` 中
- 定期轮换 API 密钥和数据库凭据