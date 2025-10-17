-- 创建 HR 招聘系统的表结构

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'hr_manager',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 职位表
CREATE TABLE IF NOT EXISTS jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL, -- full-time, part-time, contract
  salary_min INTEGER,
  salary_max INTEGER,
  requirements JSONB, -- array of strings
  focus_areas JSONB,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, closed
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 候选人表
CREATE TABLE IF NOT EXISTS candidates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  experience INTEGER, -- years
  education TEXT,
  location TEXT,
  salary_expectation INTEGER,
  expected_salary INTEGER,
  years_of_experience INTEGER,
  resume_url TEXT,
  resume_text TEXT,
  skills JSONB, -- array of strings
  status TEXT NOT NULL DEFAULT 'applied', -- applied, screening, interview, offer, hired, rejected
  match_score DECIMAL(5,2),
  ai_summary TEXT,
  notes TEXT,
  source TEXT DEFAULT 'manual', -- manual, linkedin, job_board, referral
  tags JSONB, -- array of strings for categorization
  resume_analysis JSONB,
  targeted_analysis JSONB,
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 面试表
CREATE TABLE IF NOT EXISTS interviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
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
  transcription TEXT,
  recording_url TEXT,
  transcription_method TEXT,
  ai_key_findings JSONB,
  ai_concern_areas JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI 对话表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  session_id VARCHAR NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  template_id VARCHAR, -- reference to prompt template used
  context TEXT, -- additional context provided
  created_at TIMESTAMP DEFAULT NOW()
);

-- 职位匹配表
CREATE TABLE IF NOT EXISTS job_matches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR REFERENCES candidates(id) NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) NOT NULL,
  match_score DECIMAL(5,2) NOT NULL,
  match_reasons JSONB, -- array of strings
  ai_analysis TEXT,
  basic_match_score DECIMAL(5,2),
  status TEXT NOT NULL DEFAULT 'pending',
  analysis JSONB,
  score DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 提示模板表
CREATE TABLE IF NOT EXISTS prompt_templates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- resume_analysis, job_matching, interview_questions, candidate_screening, general
  template TEXT NOT NULL,
  variables JSONB NOT NULL, -- array of variable names
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 候选人状态历史表
CREATE TABLE IF NOT EXISTS candidate_status_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR REFERENCES candidates(id) NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  changed_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 活动日志表
CREATE TABLE IF NOT EXISTS activity_log (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL, -- candidate_updated, interview_scheduled, job_created, etc.
  entity_type TEXT NOT NULL, -- candidate, job, interview
  entity_id VARCHAR NOT NULL,
  entity_name TEXT NOT NULL, -- for display
  details JSONB, -- additional context
  created_at TIMESTAMP DEFAULT NOW()
);

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  type TEXT NOT NULL, -- candidate_update, interview_reminder, team_activity
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT, -- candidate, job, interview
  entity_id VARCHAR,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT true,
  current_page TEXT,
  last_activity TIMESTAMP DEFAULT NOW(),
  socket_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id VARCHAR NOT NULL,
  content TEXT NOT NULL,
  author_id VARCHAR REFERENCES users(id) NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT true,
  mentions JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 候选人档案表
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) ON DELETE SET NULL,
  version INTEGER NOT NULL,
  stage TEXT NOT NULL,
  profile_data JSONB NOT NULL,
  overall_score DECIMAL(5,2),
  data_sources JSONB,
  gaps JSONB,
  strengths JSONB,
  concerns JSONB,
  ai_summary TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(candidate_id, version)
);

-- 面试准备表
CREATE TABLE IF NOT EXISTS interview_preparations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) ON DELETE SET NULL,
  interview_id VARCHAR REFERENCES interviews(id) ON DELETE CASCADE NOT NULL,
  generated_for VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'generating',
  candidate_context JSONB NOT NULL,
  suggested_questions JSONB NOT NULL,
  focus_areas JSONB NOT NULL,
  previous_gaps JSONB,
  interviewer_tips JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  confidence INTEGER,
  ai_model TEXT,
  viewed_at TIMESTAMP,
  feedback_rating INTEGER,
  feedback_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(interview_id)
);

-- 招聘决策表
CREATE TABLE IF NOT EXISTS hiring_decisions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  decision VARCHAR(50) NOT NULL, -- hire, reject, hold, next-round
  confidence INTEGER, -- 0-100 confidence score
  recommendation TEXT NOT NULL, -- AI generated recommendation text
  strengths JSONB, -- Array of key strengths
  weaknesses JSONB, -- Array of weaknesses/concerns
  risk_assessment JSONB, -- Risk factors and mitigation
  growth_potential JSONB, -- Growth trajectory analysis
  cultural_fit JSONB, -- Cultural alignment assessment
  comparison_with_others JSONB, -- How candidate compares to others
  alternative_roles JSONB, -- Other suitable positions
  conditions JSONB, -- Conditions for hiring (if applicable)
  next_steps JSONB, -- Recommended next actions
  timeline_suggestion VARCHAR(255), -- Urgency/timeline
  compensation_range JSONB, -- Suggested compensation
  negotiation_points JSONB, -- Key negotiation considerations
  decided_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'draft', -- draft, final, revised
  viewed_at TIMESTAMP,
  feedback_rating INTEGER, -- 1-5 rating
  feedback_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI Token 使用表
CREATE TABLE IF NOT EXISTS ai_token_usage (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  operation VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR,
  model VARCHAR(100) NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(10,6),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  latency_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_interview_prep_candidate ON interview_preparations(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_interview ON interview_preparations(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_prep_generated_for ON interview_preparations(generated_for);
CREATE INDEX IF NOT EXISTS idx_interview_prep_created_at ON interview_preparations(created_at);
CREATE INDEX IF NOT EXISTS idx_interview_prep_status ON interview_preparations(status);

CREATE INDEX IF NOT EXISTS idx_ai_token_usage_user ON ai_token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_operation ON ai_token_usage(operation);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_entity ON ai_token_usage(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_created_at ON ai_token_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_token_usage_model ON ai_token_usage(model);