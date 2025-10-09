# 🚀 Vercel 部署检查清单

快速部署前必须完成的检查项。完整指南请参考 [docs/Vercel部署指南.md](docs/Vercel部署指南.md)

---

## ✅ 部署前检查（必须全部完成）

### 1. 本地构建测试
```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 测试生产服务器
npm run start
```
- [ ] 构建成功，无 TypeScript 错误
- [ ] 本地生产服务器正常运行
- [ ] 访问 http://localhost:5000 正常

### 2. 环境变量准备

**🔴 必需配置**（缺一不可）：

- [ ] `SUPABASE_URL` - 从 [Supabase Dashboard](https://supabase.com/dashboard) → Settings → API 获取
- [ ] `SUPABASE_ANON_KEY` - 公开匿名密钥
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - ⚠️ 服务角色密钥（敏感，完全权限）
- [ ] `VITE_SUPABASE_URL` - 与 SUPABASE_URL 相同
- [ ] `VITE_SUPABASE_ANON_KEY` - 与 SUPABASE_ANON_KEY 相同
- [ ] `DATABASE_URL` - PostgreSQL 连接字符串（**必须使用 Transaction Pooler，端口 6543**）
- [ ] `OPENROUTER_API_KEY` - 从 https://openrouter.ai/keys 获取
- [ ] `AI_MODEL` - 默认模型（如 `google/gemini-2.5-flash`）
- [ ] `SESSION_SECRET` - ⚠️ **必须修改为随机字符串**（运行 `openssl rand -base64 32` 生成）
- [ ] `CORS_ORIGIN` - ⚠️ **必须设置为实际域名**（如 `https://your-app.vercel.app`）

**💡 快速配置**：
```bash
# 使用配置助手
bash vercel-env-setup.sh
```

### 3. 数据库准备

- [ ] 在 Supabase 中执行 `migrations/001_initial_schema.sql`
- [ ] 验证 13 张表全部创建成功
- [ ] 确认 Supabase Storage bucket `resumes` 已存在（代码会自动创建）

### 4. 安全配置检查

- [ ] `SESSION_SECRET` **不是** 默认值 `replace-me`
- [ ] `CORS_ORIGIN` **不包含** `localhost`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 已妥善保管（不要泄露）
- [ ] `OPENROUTER_API_KEY` 账户余额充足

### 5. vercel.json 配置确认

- [ ] `functions.maxDuration` 设置为 30 秒（或根据订阅调整）
- [ ] 安全头配置完整（HSTS、CSP 等）
- [ ] 缓存策略已配置

---

## 🚀 部署步骤

### 方式 A：通过 Vercel Dashboard（推荐）

1. **导入项目**
   - 访问 https://vercel.com/dashboard
   - 点击 "Add New Project"
   - 导入 GitHub 仓库

2. **配置构建设置**
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **添加环境变量**
   - Settings → Environment Variables
   - 逐个添加上述必需的环境变量
   - ⚠️ 确保选择 **Production** 环境

4. **开始部署**
   - 点击 "Deploy"
   - 等待构建完成（约 3-5 分钟）

### 方式 B：通过 Vercel CLI

```bash
# 安装 CLI
npm i -g vercel

# 登录
vercel login

# 配置环境变量（交互式）
bash vercel-env-setup.sh

# 预览部署
vercel

# 生产部署
vercel --prod
```

---

## ✅ 部署后验证（5 分钟内完成）

### 1. 基础功能测试

访问以下端点确认部署成功：

- [ ] **首页**: `https://your-app.vercel.app` - 正常加载
- [ ] **健康检查**: `https://your-app.vercel.app/api/health` - 返回 `{"status":"ok"}`
- [ ] **登录页面**: `https://your-app.vercel.app/login` - 正常显示

### 2. 静态资源检查

- [ ] 图标和 favicon 正常显示
- [ ] CSS 样式正确加载
- [ ] 无 404 错误（检查浏览器控制台）

### 3. 核心功能测试

- [ ] **登录功能** - 使用测试账号登录
- [ ] **简历上传** - 上传测试简历
- [ ] **AI 分析** - 触发简历解析
- [ ] **数据库读写** - 创建候选人、职位等

### 4. 性能检查

- [ ] 首页加载时间 < 3 秒
- [ ] API 响应时间 < 2 秒
- [ ] 无明显卡顿或延迟

---

## ⚠️ 常见问题快速修复

### 问题 1: 构建失败
```bash
# 本地测试构建
npm run build

# 检查 TypeScript 错误
npm run check
```

### 问题 2: 数据库连接失败
- ✅ 确认使用 **Transaction Pooler**（端口 6543）
- ✅ 检查 `DATABASE_URL` 密码是否正确
- ✅ 验证 Supabase 项目未暂停

### 问题 3: AI 功能 401 错误
- ✅ 检查 `OPENROUTER_API_KEY` 是否有效
- ✅ 确认账户余额充足
- ✅ 访问 https://openrouter.ai/keys 验证

### 问题 4: CORS 错误
- ✅ 确认 `CORS_ORIGIN` 设置为实际域名
- ✅ 触发 Redeploy（Deployments → Redeploy）

### 问题 5: 静态资源 404
- ✅ 检查 `npm run build` 生成 `dist/public/assets/`
- ✅ 清除 Vercel 缓存后重新部署

---

## 🔧 部署后立即执行

### 1. 更新 CORS 配置
```bash
# 记录 Vercel 分配的域名
https://your-app-abc123.vercel.app

# 在 Vercel Dashboard 更新环境变量
CORS_ORIGIN=https://your-app-abc123.vercel.app

# 触发 Redeploy
```

### 2. 配置自定义域名（可选）
- Vercel Dashboard → Settings → Domains
- 添加域名并按提示配置 DNS

### 3. 启用监控
- Vercel Dashboard → Analytics（自动启用）
- 设置告警通知（Settings → Notifications）

---

## 📊 性能监控

### 关键指标

| 指标 | 目标值 | 检查方法 |
|------|--------|----------|
| **首屏加载** | < 3s | Chrome DevTools → Network |
| **API 响应** | < 2s | Vercel Dashboard → Analytics |
| **错误率** | < 1% | Vercel Dashboard → Logs |
| **冷启动** | < 2s | 首次 API 调用 |

### 监控端点
```bash
# 健康检查
curl https://your-app.vercel.app/api/health

# 性能测试
curl -w "@curl-format.txt" -o /dev/null -s https://your-app.vercel.app
```

---

## 🆘 紧急回滚

如果部署出现严重问题：

1. **Vercel Dashboard** → Deployments
2. 找到上一个成功的部署
3. 点击右侧三点菜单 → **"Promote to Production"**
4. 确认回滚

---

## 📝 部署完成报告模板

```markdown
## 部署报告

**部署时间**: 2025-10-09 10:30:00
**部署人员**: [您的名字]
**部署域名**: https://your-app.vercel.app

### 验证结果
- [x] 构建成功
- [x] 健康检查通过
- [x] 登录功能正常
- [x] 简历上传正常
- [x] AI 分析正常
- [x] 性能达标

### 注意事项
- WebSocket 功能在 Vercel 上不可用（已文档说明）
- SESSION_SECRET 已修改为随机值
- CORS_ORIGIN 已设置为实际域名

### 下一步
- [ ] 配置自定义域名
- [ ] 启用生产监控
- [ ] 通知团队部署完成
```

---

**✅ 完成所有检查后，您的应用已可以安全部署到生产环境！**

如有问题，请参考 [docs/Vercel部署指南.md](docs/Vercel部署指南.md) 或提交 [GitHub Issue](https://github.com/changyoutaxiang/hr-ai-recruit/issues)。
