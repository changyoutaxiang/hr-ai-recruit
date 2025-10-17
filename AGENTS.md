# Repository Guidelines

## 项目结构与模块划分
- `client/src`：React + TypeScript 前端代码，按 `pages/`、`components/`、`hooks/` 与 `lib/` 划分功能，`App.tsx` 组装路由，公共样式在 `index.css` 与 Tailwind utility class 中维护。
- `server/`：Express 入口位于 `index.ts`，`routes.ts` 挂载 REST API，`services/` 封装业务逻辑，`middleware/` 管理安全与请求管道，`websocket.ts` 提供协作通道；`storage.ts` 通过 Supabase Postgres 提供持久化。
- `shared/`：集中定义跨端类型与数据库 schema，前后端通过 `@shared/*` 路径别名共享。
- `migrations/` 与 `drizzle.config.ts`：使用 Drizzle ORM 维护数据库演进；`docs/` 记录架构与流程草稿。

## 构建、测试与本地开发
- `npm run dev`：同时启动 Vite 客户端与服务端的开发服务器（通过 `tsx` 注入 `.env`），缺少关键环境变量时会在服务启动前直接报错。
- `npm run build`：构建客户端产物并用 `esbuild` 打包 `server/index.ts` 至 `dist/`，用于生产部署。
- `npm start`：执行编译后的服务端入口，需先运行 `npm run build`。
- `npm run check`：触发 TypeScript 严格类型检查，确保 `tsconfig.json` 规则全部通过。
- `npm run db:push`：根据 `shared/schema.ts` 将最新 schema 推送到目标数据库。
- `node test_user_api.js`：简单的 API 冒烟脚本，修改前后用于校验关键招聘流程端点，运行前请确认 `.env` 或环境变量配置完整。

## 编码风格与命名规范
- 默认使用 TypeScript 严格模式与 2 空格缩进，React 组件首字母大写（`DashboardHeader`），函数与变量使用 `camelCase`，环境变量采用 `SCREAMING_SNAKE_CASE`。
- 前端统一使用模块化 hooks 与 context，通用工具放在 `client/src/lib`；路径别名 `@/*` 指向 `client/src`，避免相对路径地狱。
- 服务端请求与响应类型从 `@shared/types` 导入，使用 `zod` 校验输入，数据库访问统一通过 Drizzle 查询构造器。
- Tailwind class 排序遵循语义顺序（布局 → 尺寸 → 颜色），新增组件时同步在 `components.json` 中登记以保持样式一致性。

## 测试指南
- 当前未集成 Jest/Vitest，请在提交前运行 `npm run check` 与 `node test_user_api.js`；新增自动化测试时优先选择 Vitest，并将客户端测试放入 `client/src/__tests__`，服务端测试放入 `server/__tests__`。
- 编写 API 测试时，可复用 `shared/types` 里的契约；命名格式遵循 `<模块>.<功能>.test.ts`，并通过 `.env.test` 提供隔离配置。
- 关键流程（候选人评估、AI 助理、WebSocket 协作）需在 PR 描述中标明手动验证步骤或附带截图/录屏。

## 提交与 PR 指南
- Git 提交遵循 `<type>: <subject>`，保持祈使语气；常见 type 包含 `feat`、`fix`、`Security`、`chore`。单次提交聚焦单一职责，必要时在正文引用相关 issue。
- 在发起 PR 前：同步主分支、完成构建与检查、更新相关文档或数据迁移。PR 描述需包含变更摘要、测试结果、环境变量调整；涉及 UI 变更时附上前后对比截图。
- 若修改涉及外部服务（Supabase、OpenRouter），请确认 `.env.example` 已更新并在 reviewers 中 @ 对应负责人。

## 安全与配置提示
- `.env` 存放 Supabase、OpenRouter 等敏感密钥，切勿提交；仓库提供 `.env.example` 作为占位模板，部署时请通过密钥库注入真实值，生产环境务必设置 `CORS_ORIGIN`。
- 简历上传仅支持 PDF 文件，后端会在解析失败时返回 422，并保留原始解析文本以便后续审计。
- `server/index.ts` 已启用 Helmet 与限流策略，新增路由时确认纳入合适的速率限制与权限校验。
- 文件上传通过 Supabase Storage 与 `storage.ts` 处理，调整策略时需同时更新 CDN 缓存规则与客户端 `Upload` 组件。
