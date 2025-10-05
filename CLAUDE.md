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
- **存储**: Supabase Storage

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
- 使用 Supabase Storage 存储文件
- Multer 处理文件上传
- pdf-parse 提取 PDF 简历文本
- 前端直接上传到 Supabase Storage

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
- `CORS_ORIGIN` - 跨域配置（生产环境必须设置为前端域名）

### 文件存储配置

本项目使用 Supabase Storage 进行文件存储。**首次部署时，代码会自动创建 bucket**，但您也可以手动配置：

#### 选项 1：自动创建（推荐）

代码会在首次启动时自动创建 `resumes` bucket，配置如下：
- 访问权限：私有（private）
- 文件大小限制：10MB
- 允许的文件类型：PDF、DOC、DOCX

#### 选项 2：手动创建

如果需要自定义配置，可手动创建：

1. **登录 Supabase Dashboard**：
   - 访问 [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - 选择您的项目

2. **创建 Storage Bucket**：
   - 导航到 Storage → Create a new bucket
   - Bucket 名称：`resumes`（必须使用此名称）
   - Public bucket：**取消勾选**（保持私有）
   - 点击 "Create bucket"

3. **配置存储策略**（可选）：
   ```sql
   -- 允许认证用户上传文件
   CREATE POLICY "Authenticated users can upload resumes"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'resumes');

   -- 允许认证用户读取文件
   CREATE POLICY "Authenticated users can read resumes"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'resumes');
   ```

4. **验证配置**：
   - 在 Storage 页面，您应该看到 `resumes` bucket
   - 上传一个测试文件验证权限

#### 文件存储说明

- **上传路径格式**：`{candidateId}/{timestamp}-{filename}`
- **访问方式**：通过签名 URL（有效期 1 小时）
- **安全性**：所有文件需要认证才能访问
- **API 端点**：
  - 上传：`POST /api/candidates/:id/resume`
  - 下载：`GET /api/candidates/:id/resume/download`

### 安全注意事项

⚠️ **绝不要提交 `.env` 文件到 Git！**
- `.env` 文件已添加到 `.gitignore`
- 仅提交 `.env.example` 模板文件
- 所有敏感信息（API 密钥、数据库密码）仅存储在本地 `.env` 中
- 定期轮换 API 密钥和数据库凭据

## MCP 配置（Claude Code 专用）

本项目为 Claude Code 配置了 MCP (Model Context Protocol) 服务器，用于增强 AI 助手的能力。

### 可用的 MCP 服务器

1. **Supabase MCP** - 直接操作数据库
   - 提供数据库 CRUD 操作能力
   - 使用 PostgREST API 接口
   - 需要 Service Role Key（完全访问权限）

2. **Context7 MCP** - 代码上下文管理
   - 智能代码索引和搜索
   - 跨文件引用分析
   - 项目结构理解

### 配置步骤

1. **复制模板文件**：
   ```bash
   cp .mcp.json.example .mcp.json
   ```

2. **编辑 `.mcp.json` 并填入真实的 API 密钥**：
   - `SUPABASE_SERVICE_ROLE_KEY`: 从 [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API → Service Role Key 获取
   - `CONTEXT7_API_KEY`: 从 [Upstash Console](https://console.upstash.com/) → Context7 获取

3. **重启 Claude Code** 使 MCP 配置生效

### ⚠️ MCP 安全警告

**`.mcp.json` 包含极其敏感的 API 密钥，泄露后果严重！**

- 🔒 **Supabase Service Role Key** 具有**完全数据库访问权限**，可绕过所有 RLS 策略
- 🚫 **绝不要提交** `.mcp.json` 文件到 Git（已在 `.gitignore` 中配置）
- 🔄 定期轮换 Service Role Key（建议每季度一次）
- 📸 不要在截图、日志、文档中暴露此文件内容
- ✅ 使用前确认：`git log --all -- .mcp.json` 应返回空结果

### 使用示例

配置完成后，MCP 服务器将自动为 Claude Code 提供增强能力：

#### Supabase MCP 使用场景
- **快速查询数据**：「帮我查询最近 7 天新增的候选人」
- **批量操作**：「将所有状态为 'pending' 的面试更新为 'scheduled'」
- **数据分析**：「统计每个职位的候选人数量」
- **Schema 查询**：「显示 candidates 表的所有字段和类型」

#### Context7 MCP 使用场景
- **代码导航**：「找到所有调用 resumeParser 服务的文件」
- **依赖分析**：「这个组件依赖了哪些其他模块？」
- **重构支持**：「如果修改 aiService.ts 的接口，会影响哪些文件？」
- **架构理解**：「解释前端如何与 WebSocket 服务交互」

> 💡 **提示**：启用 MCP 后，Claude Code 将自动选择合适的工具，无需手动指定。

### 验证配置

检查 MCP 服务器是否正确配置：
```bash
# 确认文件未被 Git 跟踪
git status | grep mcp.json
# 应该只显示 .mcp.json.example，不应显示 .mcp.json

# 确认文件从未被提交
git log --all --full-history -- .mcp.json
# 应该返回空结果
```

### 故障排除

#### 常见错误及解决方案

**问题 1: MCP 服务器连接超时**
```
Error: Connection timeout to Supabase MCP server
```
解决方案：
- 检查网络连接
- 确认 `YOUR_SUPABASE_URL` 格式正确（应为 `https://xxx.supabase.co`）
- 验证 Supabase 项目是否处于暂停状态

**问题 2: Supabase 认证失败**
```
Error: 401 Unauthorized
```
解决方案：
- 确认使用的是 **Service Role Key**（非 Anon Key）
- 在 Supabase Dashboard → Settings → API 中重新生成密钥
- 确保密钥完整复制，未包含多余空格

**问题 3: npx 命令执行失败**
```
Error: Command not found: npx
```
解决方案：
- 确认已安装 Node.js（版本 >= 18）
- 运行 `npm install -g npm@latest` 更新 npm

**问题 4: JSON 格式错误**
```
Error: Unexpected token in JSON
```
解决方案：
- 使用 `npx jsonlint .mcp.json` 验证 JSON 格式
- 确保删除了 `_instructions` 字段（仅用于模板文件）
- 检查所有字符串是否用双引号包裹

**问题 5: Context7 配置问题**
```
Error: Invalid API key for Context7
```
解决方案：
- 访问 [Upstash Console](https://console.upstash.com/) 验证密钥
- 确认 Context7 服务已启用

#### 调试步骤
1. 检查 `.mcp.json` 文件格式：
   ```bash
   npx jsonlint /Users/wangdong/Desktop/hr-ai-recruit-cc-new/.mcp.json
   ```

2. 验证环境变量：
   ```bash
   # 确认 Node.js 版本
   node --version  # 应 >= 18

   # 测试 npx 可用性
   npx --version
   ```

3. 查看 Claude Code 日志：
   ```bash
   tail -f ~/.claude/logs/$(ls -t ~/.claude/logs/ | head -1)
   ```

4. 重启 Claude Code 并观察启动日志
- 每完成一个todo，都要用code review子代理进行代码审查