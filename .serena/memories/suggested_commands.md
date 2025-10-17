# 建议的开发命令

## 开发和构建命令

### 开发环境
```bash
# 启动完整开发服务器（前端 + 后端）
npm run dev

# 仅启动后端开发服务器
npm run dev:backend

# 仅启动前端开发服务器
npm run dev:frontend

# TypeScript 类型检查
npm run check
```

**说明**：
- `npm run dev` 使用 concurrently 同时启动前后端
- 前端运行在 `http://localhost:5173` (Vite)
- 后端运行在 `http://localhost:5000` (Express)
- 前端通过 Vite proxy 代理 `/api` 请求到后端

### 生产构建和部署
```bash
# 构建生产版本
npm run build
# 说明：执行两个步骤
# 1. vite build - 构建前端到 dist/public
# 2. esbuild - 打包后端到 dist/index.js

# 启动生产服务器
npm run start
# 说明：运行 dist/index.js，同时服务前端静态文件
```

### 数据库操作
```bash
# 推送 schema 变更到数据库
npm run db:push

# 说明：使用 Drizzle Kit 将 shared/schema.ts 的变更推送到数据库
# 不需要手动创建 migration 文件
```

## 系统命令（Darwin）

### Git 操作
```bash
# 查看项目状态
git status

# 查看分支
git branch

# 创建新分支
git checkout -b feature/your-feature-name

# 提交变更
git add .
git commit -m "描述性的提交信息"
git push origin branch-name
```

### 文件操作
```bash
# 列出目录内容
ls -la

# 查找文件
find . -name "*.ts" -type f

# 搜索文件内容 (使用 ripgrep 更快)
grep -r "searchTerm" ./src

# 查看文件内容
cat filename.ts
head -n 20 filename.ts
tail -n 20 filename.ts
```

### 进程管理
```bash
# 查看端口占用
lsof -i :5000
lsof -i :5173

# 结束进程
kill -9 <PID>

# 查看 Node 进程
ps aux | grep node
```

## 开发工作流命令序列

### 1. 启动开发环境
```bash
# 拉取最新代码
git pull origin main

# 安装依赖（如果有变更）
npm install

# 启动开发服务器
npm run dev
```

### 2. 数据库 Schema 变更
```bash
# 编辑 shared/schema.ts

# 推送变更到数据库
npm run db:push

# 验证变更（通过 Supabase Dashboard 或直接查询）
```

### 3. 添加新 API 端点
```bash
# 1. 编辑 server/routes.ts 添加路由
# 2. 编辑 server/storage.ts 添加数据库操作函数
# 3. 可选：在 server/services/ 添加业务逻辑
# 4. 类型检查
npm run check
```

### 4. 添加新前端页面
```bash
# 1. 在 client/src/pages/ 创建新页面组件
# 2. 在 client/src/App.tsx 添加路由
# 3. 可选：在 client/src/hooks/ 创建自定义 hooks
# 4. 类型检查
npm run check
```

### 5. 构建和测试生产版本
```bash
# 构建
npm run build

# 本地测试生产构建
npm run start

# 访问 http://localhost:5000 验证
```

## 环境配置相关

### 配置环境变量
```bash
# 复制模板
cp .env.example .env

# 编辑环境变量
nano .env
# 或
code .env

# 验证必需的环境变量
# 查看 server/config/env.ts 中的 ensureRequiredEnv()
```

### MCP 配置（Claude Code 专用）
```bash
# 复制 MCP 配置模板
cp .mcp.json.example .mcp.json

# 编辑并填入真实 API 密钥
code .mcp.json

# 验证 JSON 格式
npx jsonlint .mcp.json

# 确认文件未被 Git 跟踪
git status | grep mcp.json
```

## 故障排查命令

### 依赖问题
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 检查过期依赖
npm outdated
```

### 端口占用
```bash
# 查看端口占用
lsof -i :5000
lsof -i :5173

# 结束占用进程
kill -9 $(lsof -t -i:5000)
kill -9 $(lsof -t -i:5173)
```

### TypeScript 错误
```bash
# 完整类型检查
npm run check

# 清理 TypeScript 缓存
rm -rf node_modules/typescript/tsbuildinfo
npm run check
```

### 数据库连接问题
```bash
# 测试数据库连接（需要创建测试脚本）
node -e "import('./server/storage.js').then(m => m.db.execute('SELECT 1'))"
```
