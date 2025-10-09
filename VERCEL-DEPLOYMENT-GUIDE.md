# 🚀 Vercel 部署完整指南

本指南将帮助您逐步完成 HR AI Recruit 系统在 Vercel 上的部署。

---

## 📋 部署前准备清单

### ✅ 必需账户和服务

- [ ] **GitHub 账户**（已有：changyoutaxiang）
- [ ] **Vercel 账户**（使用 GitHub 登录）
- [ ] **Supabase 项目**（数据库和存储）
- [ ] **OpenRouter 账户**（AI 服务）

---

## 🔧 步骤 1：准备环境变量

### 方法 A：使用自动配置脚本（推荐）

```bash
# 1. 运行配置助手
chmod +x vercel-env-setup.sh
./vercel-env-setup.sh

# 2. 按照提示输入各项配置
# 3. 脚本会生成 vercel-env-variables.txt 文件
```

### 方法 B：手动收集信息

#### 1.1 Supabase 凭据

访问：https://supabase.com/dashboard

1. 选择您的项目
2. 点击 **Settings** → **API**
3. 复制以下信息：

```
Project URL: https://xxxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 1.2 数据库连接字符串

1. Supabase Dashboard → **Settings** → **Database**
2. 找到 **Connection string** → **URI**
3. 选择 **Session Pooler**（端口 6543）
4. 点击 **Copy** 复制连接字符串
5. 替换 `[YOUR-PASSWORD]` 为您的数据库密码

```
postgres://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

#### 1.3 OpenRouter API Key

访问：https://openrouter.ai/

1. 注册/登录账户
2. 点击右上角头像 → **Keys**
3. 点击 **Create Key**
4. 复制生成的 API Key（格式：`sk-or-v1-...`）
5. 确保账户有足够余额（至少充值 $5）

#### 1.4 生成 Session Secret

```bash
# macOS/Linux
openssl rand -base64 32

# Windows (PowerShell)
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

复制生成的随机字符串备用。

---

## 🌐 步骤 2：在 Vercel 上创建项目

### 2.1 导入 GitHub 仓库

1. **访问您提供的链接**：
   ```
   https://vercel.com/new/import?framework=vite&project-name=hr-ai-recruit&s=https://github.com/changyoutaxiang/hr-ai-recruit
   ```

2. **授权 GitHub**：
   - 如果提示授权，点击 **Authorize Vercel**
   - 允许 Vercel 访问您的仓库

3. **配置项目**：
   - **Project Name**: `hr-ai-recruit`（已自动填写）
   - **Framework Preset**: Vite（已检测）
   - **Root Directory**: `./`（保持默认）
   - **Build Command**: `npm run build`（保持默认）
   - **Output Directory**: `dist`（保持默认）
   - **Install Command**: `npm install`（保持默认）

4. **暂时不要点击 Deploy**，先配置环境变量！

---

## 🔐 步骤 3：配置环境变量

在 Vercel 项目配置页面，找到 **Environment Variables** 部分。

### 3.1 添加 Supabase 配置（6 个变量）

| 变量名 | 值 | 环境 |
|--------|-------|------|
| `SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `SUPABASE_ANON_KEY` | `eyJhbGci...`（您的 anon key） | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...`（您的 service role key） | Production, Preview, Development |
| `VITE_SUPABASE_URL` | **与 SUPABASE_URL 相同** | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | **与 SUPABASE_ANON_KEY 相同** | Production, Preview, Development |
| `DATABASE_URL` | `postgres://postgres...`（您的连接字符串） | Production, Preview, Development |

⚠️ **重要**：`VITE_` 开头的变量必须与对应的后端变量**完全一致**！

### 3.2 添加 AI 服务配置（2 个变量）

| 变量名 | 值 | 环境 |
|--------|-------|------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...`（您的 API key） | Production, Preview, Development |
| `AI_MODEL` | `google/gemini-2.5-flash` | Production, Preview, Development |

推荐模型选择：
- 💰 **性价比**：`google/gemini-2.5-flash`（$0.075/1M tokens）
- 🎯 **质量**：`openai/gpt-4o-mini`（$0.15/1M tokens）
- 🚀 **速度**：`anthropic/claude-3-haiku`（$0.25/1M tokens）

### 3.3 添加运行时配置（3 个变量）

| 变量名 | 值 | 环境 |
|--------|-------|------|
| `NODE_ENV` | `production` | Production |
| `SESSION_SECRET` | **您生成的 32 字符随机字符串** | Production, Preview, Development |
| `CORS_ORIGIN` | `https://hr-ai-recruit.vercel.app` | Production |

⚠️ **注意**：`CORS_ORIGIN` 需要等部署后获取真实域名，可以先留空，部署后再回来填写。

### 3.4 可选配置（增强功能）

| 变量名 | 值 | 说明 |
|--------|-------|------|
| `RESUME_AI_MODEL` | `openai/gpt-4o-mini` | 简历分析专用模型（更精准） |
| `ENABLE_VISION_PARSING` | `true` | 启用 PDF 视觉解析 |
| `PROFILE_AI_MODEL` | `google/gemini-2.5-flash` | 候选人画像生成模型 |

---

## 🚀 步骤 4：部署项目

### 4.1 首次部署

1. **确认所有环境变量已添加**（至少 11 个必需变量）
2. 点击 **Deploy** 按钮
3. 等待部署完成（约 2-5 分钟）

部署过程中您会看到：
```
> Building...
✓ Compiled successfully
> Deploying...
✓ Deployment ready
```

### 4.2 获取部署域名

部署成功后，Vercel 会显示您的应用 URL：
```
https://hr-ai-recruit-xxxx.vercel.app
```

复制这个域名！

### 4.3 更新 CORS_ORIGIN

1. 返回 **Settings** → **Environment Variables**
2. 找到 `CORS_ORIGIN` 变量
3. 点击 **Edit**
4. 将值改为您的 Vercel 域名：`https://hr-ai-recruit-xxxx.vercel.app`
5. 点击 **Save**

### 4.4 重新部署

1. 前往 **Deployments** 标签
2. 点击最新部署右侧的 **⋮** 菜单
3. 选择 **Redeploy**
4. 确认重新部署

---

## ✅ 步骤 5：验证部署

### 5.1 基础功能测试

访问您的应用：`https://your-app.vercel.app`

- [ ] **页面加载**：首页正常显示
- [ ] **用户注册**：可以创建新账户
- [ ] **用户登录**：可以登录系统
- [ ] **候选人列表**：可以查看候选人页面

### 5.2 AI 功能测试

- [ ] **简历上传**：上传 PDF 简历
- [ ] **AI 分析**：查看是否生成了分析结果
- [ ] **职位匹配**：测试候选人-职位匹配功能
- [ ] **AI 助手**：尝试与 AI 助手对话

### 5.3 检查日志

如果遇到错误，查看 Vercel 日志：

```bash
# 使用 Vercel CLI
vercel logs

# 或在 Dashboard 中
# 前往 Deployments → 点击部署 → 查看 Runtime Logs
```

---

## 🐛 故障排查

### 问题 1：`Error: Missing Supabase environment variables`

**原因**：前端环境变量未配置

**解决**：
1. 检查 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否存在
2. 确认值与后端变量完全一致
3. 重新部署

### 问题 2：`Database connection failed`

**原因**：数据库连接字符串错误

**解决**：
1. 确认使用的是 **Session Pooler**（端口 6543）
2. 验证密码是否正确
3. 检查 Supabase 项目是否暂停（免费版 7 天不活动会暂停）

### 问题 3：`CORS policy: No 'Access-Control-Allow-Origin'`

**原因**：CORS_ORIGIN 未配置或配置错误

**解决**：
1. 添加/更新 `CORS_ORIGIN` 环境变量
2. 值必须是完整的 Vercel 域名（包括 `https://`）
3. 重新部署

### 问题 4：`OpenRouter API error: 401 Unauthorized`

**原因**：API Key 无效或余额不足

**解决**：
1. 访问 https://openrouter.ai/credits 检查余额
2. 重新生成 API Key
3. 更新 `OPENROUTER_API_KEY` 环境变量
4. 重新部署

### 问题 5：文件上传失败

**原因**：Supabase Storage 配置问题

**解决**：
1. 登录 Supabase Dashboard → **Storage**
2. 确认 `resumes` bucket 存在
3. 检查存储策略是否正确（见项目文档）

---

## 🎯 性能优化建议

### 1. 配置自定义域名

在 Vercel Dashboard：
1. **Settings** → **Domains**
2. 添加您的自定义域名
3. 更新 DNS 记录
4. 更新 `CORS_ORIGIN` 为自定义域名

### 2. 启用 Edge Functions（可选）

```json
// vercel.json
{
  "regions": ["iad1", "hnd1", "sin1"]
}
```

这会在多个区域部署，降低延迟。

### 3. 配置 Cron Jobs（可选）

如果需要定期任务（如清理过期数据）：
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/cleanup",
    "schedule": "0 0 * * *"
  }]
}
```

---

## 📊 监控和维护

### Vercel Analytics

1. **Settings** → **Analytics**
2. 启用 **Web Analytics**
3. 查看访问量、性能指标

### 成本监控

- **Vercel**：免费版每月 100GB 带宽
- **Supabase**：免费版 500MB 数据库 + 1GB 存储
- **OpenRouter**：按使用量付费，建议设置每月预算

---

## 🔒 安全检查清单

部署完成后，请确认：

- [ ] ✅ 所有 API Key 仅配置在服务端（无 `VITE_` 前缀）
- [ ] ✅ `SESSION_SECRET` 是随机生成的强密码
- [ ] ✅ `CORS_ORIGIN` 仅包含您的域名
- [ ] ✅ Supabase RLS 策略已启用
- [ ] ✅ `.env` 文件未提交到 Git
- [ ] ✅ 删除了 `vercel-env-variables.txt`（包含敏感信息）
- [ ] ✅ 定期轮换 API Key 和数据库密码

---

## 📚 相关资源

- [Vercel 部署文档](https://vercel.com/docs)
- [Supabase 生产检查清单](https://supabase.com/docs/guides/platform/going-into-prod)
- [OpenRouter 使用指南](https://openrouter.ai/docs)
- [项目 GitHub 仓库](https://github.com/changyoutaxiang/hr-ai-recruit)

---

## 🆘 需要帮助？

如果遇到问题：

1. **查看 Vercel 日志**：`vercel logs`
2. **检查 Supabase 日志**：Dashboard → Logs
3. **GitHub Issues**：提交问题到项目仓库
4. **Vercel 支持**：https://vercel.com/support

---

**部署成功后，请删除敏感文件**：
```bash
rm vercel-env-setup.sh
rm vercel-env-variables.txt
rm vercel-cli-commands.sh
```

祝您部署顺利！🎉
