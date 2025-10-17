# 任务完成检查清单

当你完成一个开发任务后，应该执行以下检查步骤以确保代码质量：

## 1. TypeScript 类型检查 ✅

```bash
npm run check
```

**说明**：
- 确保所有 TypeScript 文件类型正确
- 无类型错误或警告
- 如果有错误，必须修复后才能提交

## 2. 代码风格检查（如果配置了 ESLint）

```bash
# 如果项目配置了 ESLint
npm run lint
```

**说明**：
- 检查代码是否符合项目风格规范
- 修复自动可修复的问题
- 手动修复剩余问题

## 3. 格式化代码（如果配置了 Prettier）

```bash
# 如果项目配置了 Prettier
npm run format
```

**说明**：
- 统一代码格式
- 确保缩进、空格等一致性

## 4. 测试新功能

### 前端功能测试
- 在浏览器中手动测试新功能
- 检查 UI 是否正确渲染
- 验证用户交互是否正常
- 检查控制台是否有错误

### 后端 API 测试
- 使用工具测试 API 端点（curl、Postman、Thunder Client）
- 验证请求和响应格式
- 测试错误处理
- 检查服务器日志

**示例**：
```bash
# 测试 GET 端点
curl http://localhost:5000/api/candidates

# 测试 POST 端点
curl -X POST http://localhost:5000/api/candidates \
  -H "Content-Type: application/json" \
  -d '{"name": "测试候选人", "email": "test@example.com"}'
```

## 5. 数据库验证（如果涉及 Schema 变更）

```bash
# 推送 Schema 变更
npm run db:push

# 在 Supabase Dashboard 验证
# 1. 登录 https://supabase.com/dashboard
# 2. 进入 Table Editor
# 3. 检查表结构是否正确
# 4. 验证数据是否正常
```

## 6. Git 提交前检查

### 检查变更内容
```bash
# 查看所有变更
git status

# 查看具体修改
git diff

# 查看已暂存的修改
git diff --staged
```

### 确保不提交敏感文件
```bash
# 检查是否包含敏感文件
git status | grep -E "\.env$|\.mcp\.json$|node_modules"

# 应该只看到 .env.example 和 .mcp.json.example
```

### 提交前检查清单
- [ ] `.env` 文件未被添加到 Git
- [ ] `.mcp.json` 文件未被添加到 Git
- [ ] `node_modules/` 未被添加到 Git
- [ ] 没有调试代码（`console.log`, `debugger`）
- [ ] 没有注释掉的代码块
- [ ] 没有 TODO 注释（除非是有意保留的）
- [ ] 代码已格式化
- [ ] TypeScript 检查通过

## 7. 构建验证（可选，用于重大变更）

```bash
# 构建生产版本
npm run build

# 检查是否有构建错误
# 检查 dist/ 目录是否正确生成

# 测试生产构建
npm run start

# 访问 http://localhost:5000 验证
```

## 8. 文档更新（如果需要）

### 更新 README.md
- 如果添加了新功能，更新功能列表
- 如果修改了配置，更新配置说明
- 如果添加了新的环境变量，更新 `.env.example`

### 更新 CLAUDE.md
- 如果架构有重大变更，更新架构说明
- 如果添加了新的开发约定，记录下来

### 更新 API 文档（如果添加了新 API）
- 在 README.md 的 API 文档部分添加新端点
- 包括请求方法、参数、响应格式
- 提供示例请求

## 9. 提交代码

```bash
# 添加变更
git add .

# 提交（使用描述性的提交信息）
git commit -m "feat: 添加候选人批量导入功能"

# 推送到远程
git push origin your-branch-name
```

### 提交信息约定（推荐）
- `feat:` - 新功能
- `fix:` - 修复 Bug
- `docs:` - 文档变更
- `style:` - 代码格式变更（不影响功能）
- `refactor:` - 重构（不是新功能也不是修复）
- `perf:` - 性能优化
- `test:` - 添加测试
- `chore:` - 构建过程或辅助工具变更

## 10. 代码审查（如果需要）

### 自我审查清单
- [ ] 代码逻辑清晰易懂
- [ ] 变量命名有意义
- [ ] 没有重复代码
- [ ] 错误处理完善
- [ ] 性能考虑合理
- [ ] 安全性考虑（输入验证、SQL 注入等）
- [ ] 可维护性好

### 使用 Code Review 子代理
根据项目 CLAUDE.md 的要求：

> 每完成一步，都用 code review 子代理进行代码审查，有错误就自行修复

**如何使用**：
请求 Claude Code 使用 code-reviewer 代理审查你的代码：
```
"请用 code-reviewer 代理审查我刚才添加的代码"
```

## 快速检查脚本（推荐）

创建一个检查脚本 `scripts/pre-commit-check.sh`：

```bash
#!/bin/bash

echo "🔍 运行 TypeScript 类型检查..."
npm run check

if [ $? -ne 0 ]; then
  echo "❌ TypeScript 检查失败，请修复错误"
  exit 1
fi

echo "✅ 所有检查通过！"
exit 0
```

**使用方法**：
```bash
chmod +x scripts/pre-commit-check.sh
./scripts/pre-commit-check.sh
```

## 总结

**最小检查（每次提交必做）**：
1. `npm run check` - TypeScript 类型检查
2. 手动测试新功能
3. Git diff 检查变更内容
4. 确保不提交敏感文件

**完整检查（重大变更）**：
1. 上述所有步骤
2. 构建生产版本验证
3. 更新相关文档
4. 使用 code-reviewer 代理审查代码
