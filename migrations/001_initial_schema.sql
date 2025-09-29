-- ============================================
-- 初始数据库 Schema
-- 请在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'recruiter',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加角色约束
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('recruiter', 'recruitment_lead', 'hiring_manager'));

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. 职位表
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  requirements JSONB,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加约束和索引
ALTER TABLE jobs ADD CONSTRAINT jobs_type_check
  CHECK (type IN ('full-time', 'part-time', 'contract'));
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('active', 'paused', 'closed'));

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs(department);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);

-- 3. 候选人表
CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  experience INTEGER,
  education TEXT,
  location TEXT,
  salary_expectation INTEGER,
  resume_url TEXT,
  resume_text TEXT,
  skills JSONB,
  status TEXT NOT NULL DEFAULT 'applied',
  match_score DECIMAL(5,2),
  ai_summary TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual',
  tags JSONB,
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加约束和索引
ALTER TABLE candidates ADD CONSTRAINT candidates_status_check
  CHECK (status IN ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected'));
ALTER TABLE candidates ADD CONSTRAINT candidates_source_check
  CHECK (source IN ('manual', 'linkedin', 'job_board', 'referral'));

CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(name);

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_candidates_resume_text ON candidates USING gin(to_tsvector('english', resume_text));

-- 4. 面试表
CREATE TABLE IF NOT EXISTS interviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  candidate_id VARCHAR REFERENCES candidates(id) NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) NOT NULL,
  interviewer_id VARCHAR REFERENCES users(id),
  scheduled_date TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  meeting_link TEXT,
  location TEXT,
  round INTEGER NOT NULL DEFAULT 1,
  feedback TEXT,
  rating INTEGER,
  recommendation TEXT,
  interviewer_notes TEXT,
  candidate_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 添加约束和索引
ALTER TABLE interviews ADD CONSTRAINT interviews_type_check
  CHECK (type IN ('phone', 'video', 'in-person', 'technical', 'behavioral', 'system_design'));
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check
  CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show'));
ALTER TABLE interviews ADD CONSTRAINT interviews_rating_check
  CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE interviews ADD CONSTRAINT interviews_recommendation_check
  CHECK (recommendation IN ('hire', 'reject', 'next-round', 'hold'));

CREATE INDEX IF NOT EXISTS idx_interviews_candidate_id ON interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_job_id ON interviews(job_id);
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_id ON interviews(interviewer_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_date ON interviews(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_interviews_status ON interviews(status);

-- 5. AI 对话表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  session_id VARCHAR NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  template_id VARCHAR,
  context TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_session_id ON ai_conversations(session_id);

-- 6. 职位匹配表
CREATE TABLE IF NOT EXISTS job_matches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  candidate_id VARCHAR REFERENCES candidates(id) NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  match_reasons JSONB,
  ai_analysis TEXT,
  basic_match_score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_matches_candidate_id ON job_matches(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_job_id ON job_matches(job_id);
CREATE INDEX IF NOT EXISTS idx_job_matches_score ON job_matches(match_score DESC);

-- 7. 提示词模板表
CREATE TABLE IF NOT EXISTS prompt_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE prompt_templates ADD CONSTRAINT prompt_templates_category_check
  CHECK (category IN ('resume_analysis', 'job_matching', 'interview_questions', 'candidate_screening', 'general'));

CREATE INDEX IF NOT EXISTS idx_prompt_templates_category ON prompt_templates(category);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_is_active ON prompt_templates(is_active);

-- 8. 候选人状态历史表
CREATE TABLE IF NOT EXISTS candidate_status_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  candidate_id VARCHAR REFERENCES candidates(id) NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  changed_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_status_history_candidate_id ON candidate_status_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_status_history_created_at ON candidate_status_history(created_at DESC);

-- 9. 活动日志表
CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR NOT NULL,
  entity_name TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_type ON activity_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity_id ON activity_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- 10. 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id VARCHAR,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 11. 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT true,
  current_page TEXT,
  last_activity TIMESTAMP DEFAULT NOW(),
  socket_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_online ON user_sessions(is_online);

-- 12. 评论表
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  entity_type TEXT NOT NULL,
  entity_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  author_id VARCHAR REFERENCES users(id) NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  mentions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- ============================================
-- 触发器：自动更新 updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at BEFORE UPDATE ON interviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_templates_updated_at BEFORE UPDATE ON prompt_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 初始测试数据（可选）
-- ============================================

-- 插入测试用户（密码需要在应用层通过 Supabase Auth 处理）
-- 这里仅作为示例，实际使用 Supabase Auth 注册
INSERT INTO users (email, password, name, role) VALUES
  ('recruiter@company.com', 'temp_password', '招聘专员', 'recruiter'),
  ('lead@company.com', 'temp_password', '招聘负责人', 'recruitment_lead'),
  ('hiring@company.com', 'temp_password', 'Hiring Manager', 'hiring_manager')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 完成
-- ============================================

-- 查看所有表
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;