# 环境要求和依赖管理

## 运行环境要求

### Node.js 和 npm
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

**验证命令**：
```bash
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 9.x.x 或更高
```

### 操作系统
- **开发系统**: macOS (Darwin)
- **生产环境**: Linux 或 macOS
- **Windows**: 可以使用 WSL2

### 外部服务
1. **PostgreSQL 数据库**
   - 推荐使用 Supabase (托管 PostgreSQL)
   - 或 Neon Serverless PostgreSQL

2. **Supabase 服务**
   - 数据库托管
   - Storage (文件存储)
   - Auth (用户认证)

3. **OpenRouter API**
   - 统一 AI 模型访问接口
   - 支持 GPT-5, Claude, Gemini 等模型
   - 需要 API Key: https://openrouter.ai/

## 必需的环境变量

### Supabase 配置
```bash
# Supabase 项目 URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase 公开匿名密钥（前端使用）
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase 服务角色密钥（后端使用，完全权限）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 前端环境变量（需要 VITE_ 前缀）
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 数据库连接
```bash
# PostgreSQL 连接字符串（用于 Drizzle ORM）
# 格式：postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_URL=postgresql://postgres:password@db.supabase.co:6543/postgres

# 注意：使用 Pooler 连接（端口 6543），而非 Direct 连接（端口 5432）
```

### AI 配置
```bash
# OpenRouter API 密钥
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 默认 AI 模型
AI_MODEL=google/gemini-2.5-flash
```

### 可选 AI 模型配置
```bash
# 简历分析专用模型（推荐最强模型）
RESUME_AI_MODEL=openai/gpt-5

# 候选人画像生成模型
PROFILE_AI_MODEL=openai/gpt-5

# 职位匹配模型（平衡效果和成本）
MATCHING_AI_MODEL=google/gemini-2.5-pro

# 聊天助手模型（经济型，高频调用）
CHAT_AI_MODEL=google/gemini-2.5-flash

# 视觉分析模型（PDF 多模态解析）
VISION_AI_MODEL=openai/gpt-5

# 启用视觉解析功能
ENABLE_VISION_PARSING=true
```

### 服务器配置
```bash
# 运行环境
NODE_ENV=development  # 或 production

# 服务器端口
PORT=5000

# Session 密钥（生产环境必须修改为随机字符串）
SESSION_SECRET=your-random-secret-at-least-32-characters

# CORS 允许的源（生产环境必须设置）
CORS_ORIGIN=http://localhost:5000,http://localhost:5173
```

## 核心依赖包

### 前端依赖

#### React 生态
- `react@18.3.1` - React 核心库
- `react-dom@18.3.1` - React DOM 渲染
- `react-hook-form@7.55.0` - 表单管理
- `@tanstack/react-query@5.60.5` - 服务器状态管理

#### 路由和状态
- `wouter@3.3.5` - 轻量级路由库
- `@tanstack/react-query` - 数据获取和缓存

#### UI 组件
- `@radix-ui/react-*` - 无障碍 UI 组件基础库
- `lucide-react@0.453.0` - 图标库
- `framer-motion@11.13.1` - 动画库

#### 样式
- `tailwindcss@3.4.17` - CSS 框架
- `tailwindcss-animate@1.0.7` - Tailwind 动画插件
- `class-variance-authority@0.7.1` - 条件样式工具
- `tailwind-merge@2.6.0` - Tailwind 类名合并

#### 工具库
- `zod@3.24.2` - TypeScript 优先的 schema 验证
- `date-fns@3.6.0` - 日期处理
- `clsx@2.1.1` - 类名组合工具

### 后端依赖

#### 服务器框架
- `express@4.21.2` - Web 框架
- `cors@2.8.5` - 跨域支持
- `helmet@8.1.0` - 安全头中间件
- `express-rate-limit@8.1.0` - 限流中间件

#### 数据库
- `drizzle-orm@0.39.1` - TypeScript ORM
- `@neondatabase/serverless@0.10.4` - Neon PostgreSQL 客户端

#### 认证和 Storage
- `@supabase/supabase-js@2.58.0` - Supabase 客户端

#### 文件处理
- `multer@2.0.2` - 文件上传中间件
- `pdf-parse@2.2.2` - PDF 文本提取
- `sharp@0.34.4` - 图像处理

#### AI 集成
- `openai@5.23.1` - OpenAI SDK（用于 OpenRouter）

#### 实时通信
- `ws@8.18.3` - WebSocket 库

#### 工具库
- `uuid@13.0.0` - UUID 生成
- `zod@3.24.2` - Schema 验证
- `zod-validation-error@3.4.0` - Zod 错误格式化

### 开发依赖

#### TypeScript
- `typescript@5.6.3` - TypeScript 编译器
- `@types/node@20.16.11` - Node.js 类型定义
- `@types/react@18.3.11` - React 类型定义
- `@types/express@4.17.21` - Express 类型定义
- `tsx@4.20.5` - TypeScript 执行器

#### 构建工具
- `vite@5.4.20` - 前端构建工具
- `@vitejs/plugin-react@4.7.0` - Vite React 插件
- `esbuild@0.25.0` - JavaScript/TypeScript 打包器

#### 数据库工具
- `drizzle-kit@0.31.4` - Drizzle ORM CLI

#### 样式工具
- `postcss@8.4.47` - CSS 后处理器
- `autoprefixer@10.4.20` - CSS 前缀自动添加
- `@tailwindcss/typography@0.5.15` - Tailwind 排版插件

#### 开发辅助
- `concurrently@9.2.1` - 并发运行多个命令

## 依赖管理最佳实践

### 安装依赖
```bash
# 安装所有依赖
npm install

# 安装特定依赖
npm install package-name

# 安装开发依赖
npm install --save-dev package-name

# 安装精确版本
npm install package-name@1.2.3
```

### 更新依赖
```bash
# 查看过期依赖
npm outdated

# 更新所有依赖到兼容版本
npm update

# 更新特定依赖
npm update package-name
```

### 清理和重装
```bash
# 清理 node_modules 和 lock 文件
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 清理 npm 缓存（如果遇到问题）
npm cache clean --force
```

## 安全考虑

### 敏感信息管理
- ❌ **绝不提交** `.env` 文件到 Git
- ✅ 仅提交 `.env.example` 模板
- ✅ 在 `.gitignore` 中忽略 `.env`

### API 密钥轮换
定期轮换以下密钥：
- `SUPABASE_SERVICE_ROLE_KEY` (每季度)
- `OPENROUTER_API_KEY` (每半年)
- `SESSION_SECRET` (每年或泄露时立即)

### 权限最小化
- 前端使用 `SUPABASE_ANON_KEY`（受 RLS 限制）
- 后端使用 `SUPABASE_SERVICE_ROLE_KEY`（完全权限）
- 不要在前端暴露 Service Role Key

## 故障排查

### 依赖冲突
```bash
# 删除 lock 文件和 node_modules
rm -rf node_modules package-lock.json

# 清理 npm 缓存
npm cache clean --force

# 重新安装
npm install
```

### 版本不兼容
```bash
# 检查 Node.js 版本
node --version

# 使用 nvm 切换版本（如果安装了 nvm）
nvm use 18

# 或安装特定版本
nvm install 18
nvm use 18
```

### 构建错误
```bash
# 清理构建产物
rm -rf dist/

# 重新构建
npm run build
```
