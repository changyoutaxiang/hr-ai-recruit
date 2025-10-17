# 🚀 立即部署指南

**当前时间**: $(date)
**项目目录**: /Users/wangdong/Desktop/hr-ai-recruit-cc-new
**最新提交**: b05f5fe - docs: 添加 Vercel 部署完整指南

---

## ⚡ 快速部署（3 个命令）

打开终端，复制粘贴以下命令：

### 命令 1：进入项目目录
```bash
cd /Users/wangdong/Desktop/hr-ai-recruit-cc-new
```

### 命令 2：登录 Vercel
```bash
npx vercel login
```

**会发生什么**：
- 🌐 浏览器会自动打开 https://vercel.com/login
- 📧 选择登录方式（GitHub、GitLab、Bitbucket 或 Email）
- ✅ 在浏览器中完成登录
- ✅ 终端显示 "Success! Authentication complete"

**如果浏览器没有自动打开**：
- 终端会显示一个链接
- 手动复制链接到浏览器
- 完成登录后返回终端

---

### 命令 3：部署到生产环境
```bash
npx vercel --prod
```

**第一次运行会问您几个问题**：

#### 问题 1: Set up and deploy?
```
? Set up and deploy "~/Desktop/hr-ai-recruit-cc-new"? [Y/n]
```
**回答**: 按 `Y` 或 `Enter`

#### 问题 2: Which scope?
```
? Which scope do you want to deploy to?
> Your Name (你的账户名)
```
**回答**: 直接按 `Enter`（选择默认）

#### 问题 3: Link to existing project?
```
? Link to existing project? [y/N]
```
**回答**: 输入 `y`（链接到已存在的 hr-ai-recruit 项目）

#### 问题 4: Project name?
```
? What's the name of your existing project?
```
**回答**: 输入 `hr-ai-recruit` 然后按 `Enter`

---

## 📊 部署过程（预计 3-5 分钟）

部署开始后，您会看到：

```
🔍 Inspect: https://vercel.com/xxx/hr-ai-recruit/xxx
⠙ Building...
```

**构建步骤**：
1. ⚡ Installing dependencies (npm install) - 约 1-2 分钟
2. 🏗️ Building frontend (vite build) - 约 30-60 秒
3. 📦 Building backend (esbuild) - 约 10-20 秒
4. 🚀 Deploying to CDN - 约 30 秒

**成功后显示**：
```
✅ Production: https://hr-ai-recruit-abc123.vercel.app [copied to clipboard]
```

🎉 **复制这个 URL！**

---

## ✅ 部署成功后的必做操作

### 1. 更新 CORS_ORIGIN 环境变量

**方法 A：使用命令行（推荐）**

```bash
# 添加 CORS_ORIGIN（替换为您的实际域名）
npx vercel env add CORS_ORIGIN production

# 粘贴您的 Vercel 域名（例如）：
https://hr-ai-recruit-abc123.vercel.app

# 重新部署以应用新的环境变量
npx vercel --prod
```

**方法 B：使用 Dashboard**

1. 打开 https://vercel.com/dashboard
2. 选择 `hr-ai-recruit` 项目
3. 点击 **Settings** → **Environment Variables**
4. 找到 `CORS_ORIGIN`，点击 **Edit**
5. 将值改为您的 Vercel 域名：`https://hr-ai-recruit-abc123.vercel.app`
6. 点击 **Save**
7. 前往 **Deployments**，点击最新部署的 **⋮** → **Redeploy**

---

### 2. 验证应用功能

访问您的应用 URL，测试：

- [ ] **首页加载**：页面正常显示
- [ ] **用户注册**：创建测试账户
- [ ] **用户登录**：登录系统
- [ ] **候选人列表**：查看候选人页面
- [ ] **简历上传**：上传 PDF 测试 AI 分析

---

## 🐛 如果遇到错误

### 错误 1：构建失败 - 缺少环境变量

```
Error: VITE_SUPABASE_URL is not defined
```

**解决**：
```bash
# 拉取远程环境变量到本地
npx vercel env pull .env.production

# 检查是否包含所有必需变量
cat .env.production

# 重新部署
npx vercel --prod
```

---

### 错误 2：登录失败

```
Error: Failed to authenticate
```

**解决**：
```bash
# 清除本地凭证
rm -rf ~/.vercel

# 重新登录
npx vercel login
```

---

### 错误 3：项目不存在

```
Error: Project not found
```

**解决**：
```bash
# 在问 "Link to existing project?" 时，选择 "N"
# 让 Vercel 创建新项目
npx vercel --prod
```

---

## 📞 需要帮助？

如果遇到问题：

1. **复制完整的错误信息**
2. **截图终端输出**
3. **告诉 Claude 您遇到的问题**

Claude 会帮您分析和解决！

---

## 🎯 总结：您只需要 3 步

```bash
# 步骤 1
cd /Users/wangdong/Desktop/hr-ai-recruit-cc-new

# 步骤 2（在浏览器中完成登录）
npx vercel login

# 步骤 3（回答几个问题，然后等待部署完成）
npx vercel --prod
```

**预计总时间**：5-10 分钟

祝您部署顺利！🚀
