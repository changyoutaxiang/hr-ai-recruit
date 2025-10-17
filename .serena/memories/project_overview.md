# HR AI 招聘管理系统 - 项目概览

## 项目目的
这是一个全栈的 HR 招聘管理系统，通过 AI 技术优化招聘流程：

- **智能简历解析**：自动提取候选人技能、经验、教育背景（支持 PDF 视觉解析）
- **动态候选人画像**：版本化画像管理，随面试流程演进
- **职位智能匹配**：AI 驱动的候选人-职位兼容性评分
- **面试智能助手**：准备建议、追问建议、AI 洞察分析
- **招聘决策支持**：组织适配性分析、证据驱动决策
- **AI 聊天助手**：招聘最佳实践指导，可定制提示词模板

## GitHub 仓库
https://github.com/changyoutaxiang/hr-ai-recruit.git

## 核心价值
让每一轮面试都让我们更懂候选人，让每一个决策都有 AI 洞察支持

## 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **路由**: Wouter (轻量级客户端路由)
- **状态管理**: TanStack Query (服务器状态和缓存)
- **UI 组件**: Radix UI + shadcn/ui
- **样式**: Tailwind CSS
- **动画**: Framer Motion

### 后端
- **运行时**: Node.js 18+
- **框架**: Express.js + TypeScript (ES Modules)
- **ORM**: Drizzle ORM
- **数据库**: PostgreSQL (Supabase/Neon serverless)
- **认证**: Supabase Auth (JWT + PKCE)
- **实时通信**: WebSocket (ws 库)
- **文件存储**: Supabase Storage

### AI 集成
- **AI 平台**: OpenRouter API (统一接口访问多个模型)
- **支持模型**:
  - GPT-5 (简历分析、画像生成)
  - Claude Sonnet 4 (备用旗舰)
  - Gemini 2.5 Pro (职位匹配)
  - Gemini 2.5 Flash (聊天助手)
- **多模态**: 支持 PDF 视觉解析

## 项目规模
- **前端页面**: 16 个页面组件
- **前端组件**: 32 个业务组件 + UI 组件库
- **后端服务**: 16 个业务服务
- **API 端点**: 约 77 个端点
- **数据库表**: 13 张核心表
