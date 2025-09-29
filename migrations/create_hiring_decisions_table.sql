-- Create hiring_decisions table for storing AI-generated hiring recommendations
CREATE TABLE IF NOT EXISTS hiring_decisions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id VARCHAR REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
  job_id VARCHAR REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,

  -- Decision and recommendation
  decision VARCHAR(50) NOT NULL CHECK (decision IN ('hire', 'reject', 'hold', 'next-round')),
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
  recommendation TEXT NOT NULL,

  -- Detailed analysis (JSONB fields)
  strengths JSONB,
  weaknesses JSONB,
  risk_assessment JSONB,
  growth_potential JSONB,
  cultural_fit JSONB,

  -- Comparative analysis
  comparison_with_others JSONB,
  alternative_roles JSONB,

  -- Conditions and next steps
  conditions JSONB,
  next_steps JSONB,
  timeline_suggestion VARCHAR(255),

  -- Compensation insights
  compensation_range JSONB,
  negotiation_points JSONB,

  -- Decision metadata
  decided_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'revised')),

  -- Tracking
  viewed_at TIMESTAMPTZ,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  feedback_comment TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Unique constraint to prevent duplicate decisions for same candidate-job pair
  UNIQUE(candidate_id, job_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_hiring_decisions_candidate ON hiring_decisions(candidate_id);
CREATE INDEX idx_hiring_decisions_job ON hiring_decisions(job_id);
CREATE INDEX idx_hiring_decisions_status ON hiring_decisions(status);
CREATE INDEX idx_hiring_decisions_decision ON hiring_decisions(decision);

-- Enable Row Level Security
ALTER TABLE hiring_decisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view all hiring decisions
CREATE POLICY "Users can view all hiring decisions"
  ON hiring_decisions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to create hiring decisions
CREATE POLICY "Users can create hiring decisions"
  ON hiring_decisions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update hiring decisions
CREATE POLICY "Users can update hiring decisions"
  ON hiring_decisions FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to delete hiring decisions
CREATE POLICY "Users can delete hiring decisions"
  ON hiring_decisions FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_hiring_decisions_updated_at
  BEFORE UPDATE ON hiring_decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();