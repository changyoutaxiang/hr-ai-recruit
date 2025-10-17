# 项目结构说明

## 顶层目录结构

```
hr-ai-recruit-cc-new/
├── client/              # 前端代码（React + TypeScript）
├── server/              # 后端代码（Express + TypeScript）
├── shared/              # 共享代码（Schema、类型定义）
├── migrations/          # 数据库迁移文件
├── docs/                # 项目文档
├── supabase/            # Supabase 配置
├── dist/                # 构建输出目录
├── node_modules/        # 依赖包
├── .env                 # 环境变量（不提交到 Git）
├── .env.example         # 环境变量模板
├── package.json         # 项目依赖和脚本
├── tsconfig.json        # TypeScript 配置
├── vite.config.ts       # Vite 配置
├── tailwind.config.ts   # Tailwind CSS 配置
├── drizzle.config.ts    # Drizzle ORM 配置
├── CLAUDE.md            # Claude Code 项目指南
└── README.md            # 项目说明文档
```

## 前端结构 (client/)

```
client/
├── src/
│   ├── pages/           # 页面组件（16 个）
│   │   ├── dashboard.tsx
│   │   ├── candidates.tsx
│   │   ├── candidate-detail.tsx
│   │   ├── jobs.tsx
│   │   ├── interviews.tsx
│   │   ├── interview-detail.tsx
│   │   ├── interview-prepare.tsx
│   │   ├── interview-assistant.tsx
│   │   ├── ai-assistant.tsx
│   │   ├── templates.tsx
│   │   ├── reports.tsx
│   │   ├── funnel.tsx
│   │   ├── preferences.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── not-found.tsx
│   │
│   ├── components/      # 业务组件（32 个）
│   │   ├── ui/          # shadcn/ui 基础组件
│   │   ├── ai-chat.tsx
│   │   ├── resume-uploader.tsx
│   │   ├── bulk-resume-uploader.tsx
│   │   ├── candidate-card.tsx
│   │   ├── job-card.tsx
│   │   ├── interview-card.tsx
│   │   ├── profile-card.tsx
│   │   ├── profile-card-enhanced.tsx
│   │   ├── profile-comparison.tsx
│   │   ├── profile-evolution-timeline.tsx
│   │   ├── interview-assistant.tsx
│   │   ├── interview-feedback-form.tsx
│   │   ├── interview-feedback-enhanced.tsx
│   │   ├── interviewer-brief.tsx
│   │   ├── prompt-template-manager.tsx
│   │   ├── candidate-job-matches.tsx
│   │   ├── job-candidate-matches.tsx
│   │   ├── hiring-decision-comparison.tsx
│   │   ├── evidence-viewer.tsx
│   │   ├── organization-fit-trend.tsx
│   │   ├── notification-panel.tsx
│   │   ├── online-users.tsx
│   │   ├── team-activity.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── error-boundary.tsx
│   │
│   ├── hooks/           # 自定义 React Hooks
│   │   ├── use-candidates.ts
│   │   ├── use-jobs.ts
│   │   ├── use-interviews.ts
│   │   ├── use-dashboard.ts
│   │   └── use-reports.ts
│   │
│   ├── contexts/        # React Contexts
│   │   ├── AuthContext.tsx
│   │   ├── websocket-context.tsx
│   │   └── language-context.tsx
│   │
│   ├── lib/             # 工具函数
│   │   ├── api.ts       # API 请求封装
│   │   ├── queryClient.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   │
│   ├── types/           # TypeScript 类型定义
│   ├── constants/       # 常量定义
│   ├── App.tsx          # 应用根组件和路由
│   ├── main.tsx         # 应用入口
│   └── index.css        # 全局样式
│
├── public/              # 静态资源
└── index.html           # HTML 模板
```

## 后端结构 (server/)

```
server/
├── services/            # 业务逻辑层（16 个服务）
│   ├── aiService.ts                    # AI 核心服务
│   ├── openaiService.ts                # OpenAI 客户端封装
│   ├── resumeParser.ts                 # 简历解析（基础版）
│   ├── resumeParserEnhanced.ts         # 简历解析（增强版，多模态）
│   ├── targetedResumeAnalyzer.ts       # 针对性简历分析
│   ├── candidateProfileService.ts      # 动态候选人画像
│   ├── matchingService.ts              # 职位匹配服务
│   ├── interviewAssistantService.ts    # 面试助手
│   ├── interviewFeedbackService.ts     # 面试反馈处理
│   ├── hiringDecisionService.ts        # 招聘决策支持
│   ├── organizationalFitService.ts     # 组织适配性分析
│   ├── evidenceService.ts              # 证据收集服务
│   ├── promptTemplates.ts              # 提示词模板管理
│   ├── companyConfigService.ts         # 公司配置服务
│   ├── aiTokenTrackerService.ts        # AI Token 使用跟踪
│   └── supabaseStorage.ts              # Supabase Storage 集成
│
├── middleware/          # 中间件
│   └── auth.ts          # 认证中间件
│
├── config/              # 配置
│   └── env.ts           # 环境变量验证
│
├── utils/               # 工具函数
│
├── routes.ts            # API 路由定义（77 个端点）
├── storage.ts           # 数据库操作层
├── websocket.ts         # WebSocket 实时通信
├── vite.ts              # Vite 集成（开发模式）
└── index.ts             # 服务器入口
```

## 共享代码 (shared/)

```
shared/
├── schema.ts            # Drizzle ORM Schema（13 张表）
│   ├── users            # 用户表
│   ├── candidates       # 候选人表
│   ├── candidate_profiles  # 候选人画像表（版本化）
│   ├── jobs             # 职位表
│   ├── interviews       # 面试表
│   ├── interview_preparations  # 面试准备表
│   ├── job_matches      # 职位匹配表
│   ├── hiring_decisions # 招聘决策表
│   ├── ai_conversations # AI 对话历史
│   ├── ai_token_usage   # AI Token 使用记录
│   ├── prompt_templates # 提示词模板
│   ├── activity_log     # 活动日志
│   ├── notifications    # 通知表
│   ├── comments         # 评论表
│   ├── candidate_status_history  # 候选人状态历史
│   └── user_sessions    # 用户会话
│
└── types/               # 共享类型定义
```

## 路径别名

在 TypeScript 和 Vite 中配置的路径别名：

```typescript
{
  "@/*": ["./client/src/*"],      // 前端代码
  "@shared/*": ["./shared/*"],    // 共享代码
  "@assets/*": ["./attached_assets/*"]  // 资产文件
}
```

**使用示例**：
```typescript
import { Button } from "@/components/ui/button";
import { users, candidates } from "@shared/schema";
```

## 数据流架构

```
前端页面 (pages/)
    ↓ 使用
自定义 Hooks (hooks/)
    ↓ 调用
API 客户端 (lib/api.ts)
    ↓ HTTP 请求
后端路由 (routes.ts)
    ↓ 调用
业务服务层 (services/)
    ↓ 调用
数据库操作层 (storage.ts)
    ↓ 使用
Drizzle ORM + Schema (shared/schema.ts)
    ↓ 操作
PostgreSQL 数据库
```

## 构建输出 (dist/)

```
dist/
├── public/              # 前端构建产物（Vite）
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── ...
│
└── index.js             # 后端打包产物（esbuild）
```

**说明**：
- Vite 将前端构建到 `dist/public/`
- esbuild 将后端打包到 `dist/index.js`
- 生产环境下，Express 同时服务前端静态文件和 API
