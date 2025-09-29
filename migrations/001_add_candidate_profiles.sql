-- 添加候选人画像表
CREATE TABLE IF NOT EXISTS candidate_profiles (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
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

-- 为候选人画像表添加索引（优化：移除冗余索引，保留复合索引）
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_candidate_version ON candidate_profiles(candidate_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_job_id ON candidate_profiles(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_profiles_stage ON candidate_profiles(stage);

-- 添加 JSONB 字段验证约束
ALTER TABLE candidate_profiles
ADD CONSTRAINT validate_profile_data CHECK (jsonb_typeof(profile_data) = 'object');

ALTER TABLE candidate_profiles
ADD CONSTRAINT validate_data_sources CHECK (data_sources IS NULL OR jsonb_typeof(data_sources) = 'array');

ALTER TABLE candidate_profiles
ADD CONSTRAINT validate_gaps CHECK (gaps IS NULL OR jsonb_typeof(gaps) = 'array');

ALTER TABLE candidate_profiles
ADD CONSTRAINT validate_strengths CHECK (strengths IS NULL OR jsonb_typeof(strengths) = 'array');

ALTER TABLE candidate_profiles
ADD CONSTRAINT validate_concerns CHECK (concerns IS NULL OR jsonb_typeof(concerns) = 'array');

-- 扩展面试表，添加转录和 AI 分析字段
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS transcription TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS transcription_method TEXT,
ADD COLUMN IF NOT EXISTS ai_key_findings JSONB,
ADD COLUMN IF NOT EXISTS ai_concern_areas JSONB;

-- 添加注释说明
COMMENT ON TABLE candidate_profiles IS '候选人动态画像表，记录候选人在招聘流程中的画像演进';
COMMENT ON COLUMN candidate_profiles.version IS '画像版本号，从1开始递增';
COMMENT ON COLUMN candidate_profiles.stage IS '画像生成阶段：resume（简历）、after_interview_1（第一轮面试后）等';
COMMENT ON COLUMN candidate_profiles.profile_data IS '画像详细数据（技能、经验、匹配度等）';
COMMENT ON COLUMN candidate_profiles.overall_score IS 'AI 评估的总体匹配分数';
COMMENT ON COLUMN candidate_profiles.data_sources IS '用于生成此版本画像的数据源';
COMMENT ON COLUMN candidate_profiles.gaps IS 'AI 识别的信息缺口';
COMMENT ON COLUMN candidate_profiles.strengths IS 'AI 识别的候选人优势';
COMMENT ON COLUMN candidate_profiles.concerns IS 'AI 识别的潜在顾虑';

COMMENT ON COLUMN interviews.transcription IS '面试转录文本';
COMMENT ON COLUMN interviews.recording_url IS '面试录音/录像文件 URL';
COMMENT ON COLUMN interviews.transcription_method IS '转录方式：manual（手动）、upload（上传文件）、voice（语音输入）';
COMMENT ON COLUMN interviews.ai_key_findings IS 'AI 从面试中提取的关键发现';
COMMENT ON COLUMN interviews.ai_concern_areas IS 'AI 从面试中识别的关注点';