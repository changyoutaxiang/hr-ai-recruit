# 代码风格和约定

## TypeScript 配置

### 严格模式
项目使用 TypeScript 严格模式：

```json
{
  "strict": true,
  "target": "ES2020",
  "module": "ESNext"
}
```

**要求**：
- 所有文件必须类型安全
- 不允许隐式 `any` 类型
- 必须明确处理 `null` 和 `undefined`

### ES Modules
项目使用 ES Modules（而非 CommonJS）：

```json
{
  "type": "module"  // package.json
}
```

**导入语法**：
```typescript
// ✅ 正确
import express from "express";
import { users } from "@shared/schema";

// ❌ 错误
const express = require("express");
```

## 命名约定

### 文件命名
- **组件文件**: PascalCase
  - `CandidateCard.tsx`
  - `ProfileComparison.tsx`
  - `AIChat.tsx`
  
- **页面文件**: kebab-case
  - `dashboard.tsx`
  - `candidate-detail.tsx`
  - `interview-assistant.tsx`
  
- **工具/服务文件**: camelCase
  - `aiService.ts`
  - `resumeParser.ts`
  - `matchingService.ts`

- **配置文件**: kebab-case
  - `tsconfig.json`
  - `vite.config.ts`
  - `tailwind.config.ts`

### 变量和函数命名
- **函数**: camelCase
  ```typescript
  function getCandidates() {}
  async function parseResume() {}
  ```

- **变量**: camelCase
  ```typescript
  const candidateData = ...;
  let matchScore = 85;
  ```

- **常量**: UPPER_SNAKE_CASE
  ```typescript
  const API_BASE_URL = "http://localhost:5000";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  ```

- **类型/接口**: PascalCase
  ```typescript
  interface CandidateType {}
  type MatchResult = {};
  ```

- **React 组件**: PascalCase
  ```typescript
  function CandidateCard() {}
  const ProfileCard = () => {};
  ```

## 代码组织

### 导入顺序
1. 外部库
2. 内部模块（@/ 别名）
3. 共享模块（@shared/ 别名）
4. 相对路径导入
5. 类型导入（可选分组）

**示例**：
```typescript
// 1. 外部库
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";

// 2. 内部模块
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

// 3. 共享模块
import { candidates } from "@shared/schema";

// 4. 相对路径
import { helper } from "./utils";

// 5. 类型导入
import type { Candidate } from "@shared/schema";
```

### 组件结构
```typescript
// 1. 导入
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. 类型定义
interface Props {
  name: string;
  onSubmit: () => void;
}

// 3. 组件定义
export function MyComponent({ name, onSubmit }: Props) {
  // 3.1 Hooks
  const [count, setCount] = useState(0);
  
  // 3.2 事件处理器
  const handleClick = () => {
    setCount(count + 1);
  };
  
  // 3.3 渲染
  return (
    <div>
      <Button onClick={handleClick}>{name}</Button>
    </div>
  );
}
```

### 服务层结构
```typescript
// 1. 导入
import { openai } from "./openaiService";
import type { Candidate } from "@shared/schema";

// 2. 类型定义
interface AnalysisResult {
  score: number;
  insights: string[];
}

// 3. 类定义（如果使用）
export class AIService {
  // 3.1 私有方法
  private async callAI() {}
  
  // 3.2 公共方法
  async analyzeCandidate(candidate: Candidate): Promise<AnalysisResult> {
    // 实现
  }
}

// 4. 导出实例
export const aiService = new AIService();
```

## 样式约定

### Tailwind CSS 使用
- 使用 Tailwind utility classes
- 复杂样式使用 `cn()` 工具函数组合
- 避免内联样式

```typescript
import { cn } from "@/lib/utils";

<div className={cn(
  "p-4 rounded-lg",
  isActive && "bg-blue-500",
  "hover:shadow-lg"
)}>
```

### CSS Variables
使用 CSS 变量定义主题色：

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
}
```

## 状态管理约定

### TanStack Query
- 用于服务器状态管理
- 自定义 hooks 封装查询逻辑

```typescript
// hooks/use-candidates.ts
export function useCandidates() {
  return useQuery({
    queryKey: ['/api/candidates'],
    queryFn: async () => {
      const response = await fetch('/api/candidates');
      return response.json();
    },
  });
}
```

### React Context
- 用于全局应用状态（认证、WebSocket、语言）
- 每个 Context 独立文件

```typescript
// contexts/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 实现
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

## API 约定

### 路由定义
```typescript
// server/routes.ts
app.get("/api/candidates", async (req, res) => {
  const candidates = await getCandidates();
  res.json(candidates);
});
```

### 错误处理
```typescript
app.get("/api/candidates/:id", async (req, res) => {
  try {
    const candidate = await getCandidateById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }
    res.json(candidate);
  } catch (error) {
    console.error("Error fetching candidate:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
```

## 数据库约定

### Drizzle ORM Schema
```typescript
// shared/schema.ts
export const candidates = pgTable('candidates', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

// 类型导出
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;
```

### 数据库操作
```typescript
// server/storage.ts
export async function getCandidates() {
  return await db.select().from(candidates);
}

export async function createCandidate(data: InsertCandidate) {
  const [candidate] = await db.insert(candidates).values(data).returning();
  return candidate;
}
```

## 注释约定

### JSDoc 注释（推荐用于公共 API）
```typescript
/**
 * 分析候选人简历并提取关键信息
 * @param resumeText - 简历文本内容
 * @param jobId - 可选的职位 ID，用于针对性分析
 * @returns 简历分析结果，包含技能、经验、教育背景等
 */
export async function analyzeResume(
  resumeText: string, 
  jobId?: number
): Promise<ResumeAnalysis> {
  // 实现
}
```

### 行内注释
- 用于解释复杂逻辑
- 保持简洁明了
- 避免显而易见的注释

```typescript
// ✅ 好的注释
// 使用指数退避重试 API 调用
const result = await retryWithBackoff(apiCall);

// ❌ 不必要的注释
// 定义一个变量
const count = 0;
```

## 禁止的做法

### ❌ 不要
- 使用 `var`（使用 `const`/`let`）
- 使用 `require()`（使用 ES imports）
- 混合命名风格
- 提交 `.env` 文件
- 提交 `node_modules/`
- 硬编码敏感信息
- 忽略 TypeScript 错误（使用 `@ts-ignore`）

### ✅ 要
- 使用 `const` 优先，需要重新赋值时用 `let`
- 使用 ES6+ 特性
- 保持命名一致性
- 使用环境变量存储敏感信息
- 处理所有错误情况
- 编写类型安全的代码
