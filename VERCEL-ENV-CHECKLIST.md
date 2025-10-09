# ✅ Vercel 环境变量快速清单

**部署链接**：[点击这里导入项目](https://vercel.com/new/import?framework=vite&project-name=hr-ai-recruit&s=https://github.com/changyoutaxiang/hr-ai-recruit)

---

## 📝 必需环境变量（11 个）

### 1. Supabase 后端配置（3 个）

```
SUPABASE_URL=
值: https://your-project-id.supabase.co
来源: Supabase Dashboard → Settings → API → Project URL

SUPABASE_ANON_KEY=
值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
来源: Supabase Dashboard → Settings → API → anon/public key

SUPABASE_SERVICE_ROLE_KEY=
值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
来源: Supabase Dashboard → Settings → API → service_role key
```

### 2. Supabase 前端配置（2 个）

```
VITE_SUPABASE_URL=
值: [与 SUPABASE_URL 完全相同]

VITE_SUPABASE_ANON_KEY=
值: [与 SUPABASE_ANON_KEY 完全相同]
```

### 3. 数据库连接（1 个）

```
DATABASE_URL=
值: postgres://postgres.xxxxxxxxxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
来源: Supabase Dashboard → Settings → Database → Connection string → URI (Session Pooler)
⚠️ 注意: 使用端口 6543，不是 5432
```

### 4. AI 服务（2 个）

```
OPENROUTER_API_KEY=
值: sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
来源: https://openrouter.ai/ → 右上角头像 → Keys → Create Key

AI_MODEL=
值: google/gemini-2.5-flash
说明: 推荐使用此模型（性价比高）
```

### 5. 运行时配置（3 个）

```
NODE_ENV=
值: production
说明: 固定值

SESSION_SECRET=
值: [运行命令生成] openssl rand -base64 32
说明: 至少 32 个字符的随机字符串

CORS_ORIGIN=
值: https://your-app-name.vercel.app
说明: 部署后获取真实域名，然后回来填写
```

---

## 🔧 可选环境变量（增强功能）

```
RESUME_AI_MODEL=openai/gpt-4o-mini
ENABLE_VISION_PARSING=true
PROFILE_AI_MODEL=google/gemini-2.5-flash
MATCHING_AI_MODEL=google/gemini-2.5-flash
CHAT_AI_MODEL=google/gemini-2.5-flash
```

---

## 🎯 在 Vercel 中添加环境变量的步骤

### 方法 1：通过 Vercel Dashboard（推荐新手）

1. **打开导入页面**：点击上方的部署链接
2. **配置项目**：
   - Project Name: `hr-ai-recruit`
   - Framework: Vite（自动检测）
3. **添加环境变量**：
   - 在 **Environment Variables** 部分
   - 逐个添加上述变量
   - 每个变量都勾选：Production, Preview, Development
4. **点击 Deploy**

### 方法 2：通过 Vercel CLI（推荐高级用户）

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 进入项目目录
cd /Users/wangdong/Desktop/hr-ai-recruit-cc-new

# 4. 链接项目
vercel link

# 5. 运行配置脚本
chmod +x vercel-env-setup.sh
./vercel-env-setup.sh

# 6. 使用生成的自动配置脚本
source vercel-cli-commands.sh

# 7. 部署
vercel --prod
```

---

## ⚡ 快速复制模板

```env
# 复制下面的内容，替换成您的真实值

SUPABASE_URL=https://xxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxx
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxx
DATABASE_URL=postgres://postgres.xxxxxxxxxxxxxxxxxxxx:your-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AI_MODEL=google/gemini-2.5-flash
NODE_ENV=production
SESSION_SECRET=your-random-32-character-secret-here
CORS_ORIGIN=https://your-app.vercel.app
```

---

## 🔍 验证清单

部署前确认：
- [ ] 所有 11 个必需变量已填写
- [ ] `VITE_` 变量与对应的后端变量完全一致
- [ ] `DATABASE_URL` 使用端口 **6543**（Session Pooler）
- [ ] `SESSION_SECRET` 已生成随机值（不是示例值）
- [ ] OpenRouter 账户有余额

部署后确认：
- [ ] 更新 `CORS_ORIGIN` 为真实的 Vercel 域名
- [ ] 重新部署项目
- [ ] 测试注册/登录功能
- [ ] 测试简历上传和 AI 分析

---

## 🆘 常见错误速查

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Missing Supabase environment variables` | 缺少 VITE_ 变量 | 添加 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` |
| `Database connection failed` | 数据库连接错误 | 检查 `DATABASE_URL` 端口是否为 6543 |
| `CORS policy blocked` | CORS 配置错误 | 更新 `CORS_ORIGIN` 为 Vercel 域名 |
| `OpenRouter 401` | API Key 无效 | 检查 API Key 和账户余额 |
| `Build failed` | 构建错误 | 检查 `npm run build` 是否在本地成功 |

---

## 📚 相关文档

- [完整部署指南](./VERCEL-DEPLOYMENT-GUIDE.md)
- [Supabase 配置指南](./docs/Supabase配置指南.md)
- [项目 README](./README.md)

---

**准备好了吗？** [点击这里开始部署](https://vercel.com/new/import?framework=vite&project-name=hr-ai-recruit&s=https://github.com/changyoutaxiang/hr-ai-recruit) 🚀
