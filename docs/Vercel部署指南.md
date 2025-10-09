# Vercel 部署指南

本文档提供详细的 Vercel 部署步骤和注意事项。

## 📋 前置准备

### 1. 账号准备
- ✅ [Vercel 账号](https://vercel.com/signup)（建议使用 GitHub 登录）
- ✅ [GitHub 账号](https://github.com) 并已授权 Vercel 访问仓库
- ✅ [Supabase 项目](https://supabase.com) 已创建并配置完成
- ✅ [OpenRouter API Key](https://openrouter.ai/keys) 已获取

### 2. 本地构建测试

在部署前，先在本地测试构建是否成功：

```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 测试生产服务器
npm run start
```

访问 `http://localhost:5000` 确认应用正常运行。

---

## 🚀 部署步骤

### 步骤 1：连接 GitHub 仓库

1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **"Add New Project"**
3. 选择 **"Import Git Repository"**
4. 找到并选择 `changyoutaxiang/hr-ai-recruit` 仓库
5. 点击 **"Import"**

### 步骤 2：配置项目设置

在导入页面配置以下选项：

#### 基础设置
- **Framework Preset**: 选择 `Other`
- **Root Directory**: 留空（使用仓库根目录）
- **Build Command**:
  ```bash
  npm run build
  ```
- **Output Directory**:
  ```
  dist
  ```
- **Install Command**:
  ```bash
  npm install
  ```

#### Node.js 版本
- **Node.js Version**: `20.x`（推荐使用最新 LTS 版本）

### 步骤 3：配置环境变量

点击 **"Environment Variables"** 展开，逐一添加以下变量：

#### 🔑 Supabase 配置（必需）

| 变量名 | 获取位置 | 示例值 |
|--------|----------|--------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → Project API keys → anon public | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Project API keys → service_role | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

#### 🔑 前端 Supabase 配置（必需）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `VITE_SUPABASE_URL` | 与 `SUPABASE_URL` 相同 | 前端构建时需要 VITE_ 前缀 |
| `VITE_SUPABASE_ANON_KEY` | 与 `SUPABASE_ANON_KEY` 相同 | 前端构建时需要 VITE_ 前缀 |

#### 🔑 数据库连接（必需）

| 变量名 | 获取位置 | 示例值 |
|--------|----------|--------|
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Connection String → **Transaction pooler** | `postgres://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres` |

⚠️ **重要**: 必须使用 **Transaction pooler** 连接字符串（端口 6543），不要使用 Direct connection（端口 5432）。

#### 🤖 AI 配置（必需）

| 变量名 | 获取位置 | 示例值 |
|--------|----------|--------|
| `OPENROUTER_API_KEY` | [OpenRouter Dashboard](https://openrouter.ai/keys) → Create Key | `sk-or-v1-xxxxxxxxxxxxxxxx` |
| `AI_MODEL` | 使用默认值或自定义 | `google/gemini-2.5-flash` |

#### 🤖 AI 模型配置（可选）

根据需要自定义不同场景的 AI 模型：

| 变量名 | 推荐模型 | 说明 |
|--------|----------|------|
| `RESUME_AI_MODEL` | `openai/gpt-5` | 简历分析（需要高准确度） |
| `PROFILE_AI_MODEL` | `openai/gpt-5` | 候选人画像生成 |
| `MATCHING_AI_MODEL` | `google/gemini-2.5-pro` | 职位匹配（平衡效果和成本） |
| `CHAT_AI_MODEL` | `google/gemini-2.5-flash` | 聊天助手（高频调用） |
| `VISION_AI_MODEL` | `openai/gpt-5` | PDF 视觉解析 |
| `ENABLE_VISION_PARSING` | `true` | 启用视觉解析功能 |

#### ⚙️ 服务器配置（必需）

| 变量名 | 值 | 说明 |
|--------|-----|------|
| `NODE_ENV` | `production` | 运行环境 |
| `SESSION_SECRET` | `生成随机字符串` | 至少 32 字符，用于 session 加密 |
| `CORS_ORIGIN` | `https://你的域名.vercel.app` | 部署后更新为实际域名 |

**生成 SESSION_SECRET**:
```bash
# 在本地终端运行
openssl rand -base64 32
```

### 步骤 4：部署

1. 确认所有环境变量已添加
2. 点击 **"Deploy"** 开始部署
3. 等待构建完成（通常 3-5 分钟）

---

## ⚠️ 重要配置说明

### WebSocket 功能限制

**⚠️ 关键警告**: Vercel **不支持持久 WebSocket 连接**（serverless 环境限制）

**影响功能**:
- ❌ 实时通知
- ❌ 在线用户状态
- ❌ 实时活动日志

**解决方案选项**:

#### 方案 A：使用 Supabase Realtime（推荐）

利用现有的 Supabase 依赖，零额外成本：

```typescript
// client/src/contexts/websocket-context.tsx
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// 订阅实时通知
const channel = supabase
  .channel('notifications')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'notifications' },
    (payload) => {
      console.log('New notification:', payload.new);
    }
  )
  .subscribe();
```

**优点**:
- ✅ 与 Supabase 无缝集成
- ✅ 零额外成本
- ✅ 自动处理重连
- ✅ 原生支持数据库变更监听

#### 方案 B：使用第三方实时服务

- [Pusher](https://pusher.com) - 免费额度 200 连接
- [Ably](https://ably.com) - 免费额度 6M 消息/月
- [Socket.io with Redis](https://socket.io/docs/v4/redis-adapter/)

#### 方案 C：迁移到支持 WebSocket 的平台

- [Railway](https://railway.app)
- [Fly.io](https://fly.io)
- [Render](https://render.com)

---

## 🔧 部署后配置

### 1. 更新 CORS 配置

部署成功后，记录 Vercel 分配的域名（如 `https://hr-ai-recruit.vercel.app`）

返回 Vercel Dashboard → Settings → Environment Variables，更新：
- `CORS_ORIGIN`: `https://你的域名.vercel.app`

然后触发重新部署（Deployments → 最新部署 → 右侧三点菜单 → Redeploy）

### 2. 配置自定义域名（可选）

1. 在 Vercel Dashboard → Settings → Domains
2. 点击 **"Add Domain"**
3. 输入域名（如 `hr.yourdomain.com`）
4. 按照提示在域名注册商添加 DNS 记录
5. 等待 DNS 传播（通常 5-30 分钟）

### 3. 验证部署

访问以下端点确认部署成功：

- **首页**: `https://你的域名.vercel.app`
- **健康检查**: `https://你的域名.vercel.app/api/health`
  ```json
  {
    "status": "ok",
    "timestamp": "2025-10-09T10:30:00.000Z"
  }
  ```
- **登录页面**: `https://你的域名.vercel.app/login`

---

## 🐛 常见问题

### 问题 1: 构建失败 - TypeScript 错误

**错误信息**:
```
Error: Type checking failed
```

**解决方案**:
```bash
# 在本地运行类型检查
npm run check

# 修复所有类型错误后重新部署
```

### 问题 2: 数据库连接失败

**错误信息**:
```
Error: Connection timeout
```

**解决方案**:
1. 确认使用 **Transaction pooler** 连接字符串（端口 6543）
2. 检查 Supabase 项目是否处于暂停状态
3. 验证 `DATABASE_URL` 中的密码是否正确

### 问题 3: AI 功能报错 401

**错误信息**:
```
Error: 401 Unauthorized
```

**解决方案**:
1. 检查 `OPENROUTER_API_KEY` 是否正确
2. 访问 https://openrouter.ai/keys 验证 API Key
3. 确认账户余额是否充足

### 问题 4: 静态资源 404

**错误信息**:
```
GET /assets/index-abc123.js 404
```

**解决方案**:
1. 确认 `vercel.json` 中的 `builds` 配置正确
2. 检查 `npm run build` 是否成功生成 `dist/public/assets/` 目录
3. 清除 Vercel 缓存后重新部署

### 问题 5: 前端页面刷新后 404

**错误信息**:
```
404 - This page could not be found
```

**原因**: SPA 路由问题，Vercel 未正确配置重定向

**解决方案**: `vercel.json` 中已配置捕获所有路由：
```json
{
  "src": "/(.*)",
  "dest": "/dist/public/index.html"
}
```

如果仍有问题，检查路由配置顺序是否正确。

---

## 🔒 安全最佳实践

### 1. 环境变量安全

- ✅ **永远不要提交** `.env` 文件到 Git
- ✅ 定期轮换 `SUPABASE_SERVICE_ROLE_KEY`（建议每季度）
- ✅ 使用强随机字符串作为 `SESSION_SECRET`
- ✅ 限制 `CORS_ORIGIN` 为具体域名，不要使用 `*`

### 2. Supabase 安全

- ✅ 启用 Row Level Security (RLS) 策略
- ✅ 定期审查数据库访问日志
- ✅ 配置 Storage bucket 权限策略

### 3. API 密钥管理

- ✅ 使用 Vercel 环境变量（自动加密）
- ✅ 不同环境使用不同的 API Key
- ✅ 监控 OpenRouter API 使用量

---

## 📊 监控和日志

### Vercel 日志

在 Vercel Dashboard → Deployments → 选择部署 → Runtime Logs 查看服务器日志。

### 常用监控指标

- **响应时间**: 确保 P95 < 2s
- **错误率**: 确保 < 1%
- **构建时间**: 通常 3-5 分钟
- **冷启动时间**: Serverless 函数首次调用约 1-2s

---

## 🔄 持续部署

### 自动部署

每次推送到 `main` 分支时，Vercel 会自动触发部署。

### 部署预览

每个 Pull Request 都会创建预览环境，可以在合并前测试。

### 回滚

如果新部署有问题，可在 Vercel Dashboard → Deployments → 选择之前的成功部署 → Promote to Production

---

## 📝 部署检查清单

部署前确认：

- [ ] 本地 `npm run build` 构建成功
- [ ] 本地 `npm run start` 运行正常
- [ ] 所有环境变量已在 Vercel 配置
- [ ] `DATABASE_URL` 使用 Transaction pooler（端口 6543）
- [ ] `SESSION_SECRET` 已生成强随机字符串
- [ ] Supabase Storage bucket 已创建
- [ ] Supabase RLS 策略已启用
- [ ] OpenRouter API Key 有足够余额

部署后验证：

- [ ] 访问首页正常
- [ ] `/api/health` 返回 200
- [ ] 登录功能正常
- [ ] 简历上传功能正常
- [ ] AI 分析功能正常
- [ ] 数据库读写正常
- [ ] 静态资源加载正常

---

## 🆘 获取帮助

如果遇到无法解决的问题：

1. **查看 Vercel 日志**: Dashboard → Deployments → Runtime Logs
2. **查看 Supabase 日志**: Dashboard → Logs → Postgres
3. **提交 Issue**: [GitHub Issues](https://github.com/changyoutaxiang/hr-ai-recruit/issues)
4. **Vercel 文档**: https://vercel.com/docs

---

**最后更新**: 2025-10-09
**维护者**: changyoutaxiang
