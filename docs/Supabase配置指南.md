# Supabase 配置指南

## 第一步：执行数据库 Schema

1. 登录 Supabase Dashboard: https://supabase.com/dashboard
2. 选择项目: `ndpryzqiwhndlokmjouo`
3. 点击左侧菜单 **SQL Editor**
4. 点击 **New Query**
5. 复制 `/migrations/001_initial_schema.sql` 文件的全部内容
6. 粘贴到 SQL Editor 中
7. 点击 **Run** 执行

### 预期结果
执行成功后，你应该看到以下12张表被创建：
- `users`
- `jobs`
- `candidates`
- `interviews`
- `ai_conversations`
- `job_matches`
- `prompt_templates`
- `candidate_status_history`
- `activity_log`
- `notifications`
- `user_sessions`
- `comments`

### 验证
在 SQL Editor 中运行以下查询来验证表是否创建成功：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

---

## 第二步：配置 Supabase Auth

1. 点击左侧菜单 **Authentication**
2. 点击 **Providers** tab
3. 确保 **Email** provider 已启用
4. 配置 Email Templates（可选，暂时使用默认）

### 创建测试用户

在 **Authentication > Users** 中点击 **Add user** 创建测试账号：

| Email | 角色 | 说明 |
|-------|------|------|
| `recruiter@test.com` | recruiter | 招聘专员 |
| `lead@test.com` | recruitment_lead | 招聘负责人 |
| `hiring@test.com` | hiring_manager | Hiring Manager |

密码可以统一设置为: `Test123456!`

**重要**: 创建用户后，需要手动在 users 表中设置角色：

```sql
-- 更新用户角色
UPDATE users
SET role = 'recruiter'
WHERE email = 'wangdongleon1981@gmail.com';

UPDATE users
SET role = 'recruitment_lead'
WHERE email = 'woonleon69@gmail.com';

UPDATE users
SET role = 'hiring_manager'
WHERE email = 'wangdong@51talk.com';
```

---

## 第三步：配置 Storage（文件存储）

1. 点击左侧菜单 **Storage**
2. 创建两个 Bucket:

### Bucket 1: resumes
- Name: `resumes`
- Public: **No** (私有)
- File size limit: 10 MB
- Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Bucket 2: interview-recordings
- Name: `interview-recordings`
- Public: **No** (私有)
- File size limit: 50 MB
- Allowed MIME types: `audio/mpeg`, `audio/wav`, `audio/mp4`

### 配置 Storage Policies

点击每个 bucket 的 **Policies** tab，添加以下策略：

#### resumes bucket policies

**SELECT (读取)**
```sql
CREATE POLICY "Users can read resumes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resumes');
```

**INSERT (上传)**
```sql
CREATE POLICY "Users can upload resumes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resumes');
```

**DELETE (删除)**
```sql
CREATE POLICY "Recruiters can delete resumes"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'resumes' AND
  auth.jwt() ->> 'role' IN ('recruiter', 'recruitment_lead')
);
```

#### interview-recordings bucket policies

使用相同的策略模式，只需将 `'resumes'` 替换为 `'interview-recordings'`

---

## 第四步：配置 Row Level Security (RLS)

### 启用 RLS

在 SQL Editor 中执行：

```sql
-- 为所有表启用 RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
```

### 基础 RLS 策略

```sql
-- Users 表策略
CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid()::text);

-- Candidates 表策略
CREATE POLICY "Authenticated users can read candidates"
  ON candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can create candidates"
  ON candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('recruiter', 'recruitment_lead')
  );

CREATE POLICY "Recruiters can update candidates"
  ON candidates FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('recruiter', 'recruitment_lead')
  );

-- Jobs 表策略
CREATE POLICY "All authenticated users can read jobs"
  ON jobs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can manage jobs"
  ON jobs FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' IN ('recruiter', 'recruitment_lead')
  );

-- Interviews 表策略
CREATE POLICY "Users can read interviews"
  ON interviews FOR SELECT
  TO authenticated
  USING (
    CASE
      WHEN auth.jwt() ->> 'role' = 'hiring_manager'
      THEN interviewer_id = auth.uid()::text
      ELSE true
    END
  );

CREATE POLICY "Recruiters can create interviews"
  ON interviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('recruiter', 'recruitment_lead')
  );

CREATE POLICY "Interviewers can update their interviews"
  ON interviews FOR UPDATE
  TO authenticated
  USING (
    interviewer_id = auth.uid()::text OR
    auth.jwt() ->> 'role' IN ('recruiter', 'recruitment_lead')
  );

-- 其他表的策略（简化版，允许所有认证用户读取）
CREATE POLICY "Authenticated users can read ai_conversations"
  ON ai_conversations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read job_matches"
  ON job_matches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read prompt_templates"
  ON prompt_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read candidate_status_history"
  ON candidate_status_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read activity_log"
  ON activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read their notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

CREATE POLICY "Authenticated users can read user_sessions"
  ON user_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read comments"
  ON comments FOR SELECT TO authenticated USING (true);
```

---

## 第五步：获取数据库连接字符串

1. 点击左侧菜单 **Project Settings**
2. 点击 **Database** tab
3. 找到 **Connection string** 部分
4. 选择 **Pooler (Supavisor)** 模式（推荐用于 Serverless）
5. 复制 Connection string

格式类似：
```
postgresql://postgres.ndpryzqiwhndlokmjouo:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

6. 将 `[YOUR-PASSWORD]` 替换为你的数据库密码
7. 更新 `.env` 文件中的 `DATABASE_URL`

**注意**: 如果忘记密码，可以在 **Database Settings** 中重置密码

---

## 第六步：测试连接

回到项目根目录，运行：

```bash
# 安装依赖（如果还没安装）
npm install

# 测试数据库连接
npm run check
```

如果配置正确，应该没有 TypeScript 错误。

---

## 第七步：本地开发

```bash
# 启动开发服务器
npm run dev
```

访问 http://localhost:5000（或显示的端口）

---

## 常见问题

### 1. 连接数据库失败
- 检查 `DATABASE_URL` 是否包含正确的密码
- 确保使用的是 Pooler connection string（不是 Direct connection）
- 检查 IP 是否被限制（Supabase 默认允许所有 IP）

### 2. RLS 策略错误
- 确保所有表都已启用 RLS
- 检查策略是否正确创建
- 可以临时禁用 RLS 测试：`ALTER TABLE tablename DISABLE ROW LEVEL SECURITY;`

### 3. Auth 用户角色不匹配
- Supabase Auth 创建的用户需要手动在 users 表中设置角色
- 使用 SQL 更新用户角色（见第二步）

---

## 下一步

完成 Supabase 配置后，继续：
- 阶段 0: 实现认证系统（前后端集成）
- 阶段 0: 部署到 Vercel