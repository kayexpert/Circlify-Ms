-- Migration: create_cron_job_logs
-- Description: Create table for tracking cron job executions and debugging
-- Created: 2024-02-01
-- Priority: High - Debugging and monitoring

-- ============================================
-- Cron Job Execution Logs Table
-- ============================================
-- This table tracks all cron job executions for debugging and monitoring

CREATE TABLE IF NOT EXISTS cron_job_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(255) NOT NULL,
  execution_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  execution_completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
  duration_ms INTEGER, -- Duration in milliseconds
  total_processed INTEGER DEFAULT 0,
  total_success INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  error_message TEXT,
  error_stack TEXT,
  error_details JSONB, -- Detailed error information
  execution_details JSONB, -- Additional execution context
  response_data JSONB, -- Full response data for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON cron_job_execution_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_execution_started ON cron_job_execution_logs(execution_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_status ON cron_job_execution_logs(job_name, status);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_date_status 
ON cron_job_execution_logs(job_name, execution_started_at DESC, status);

-- ============================================
-- Cron Job Error Details Table
-- ============================================
-- This table stores detailed error information for each failed operation

CREATE TABLE IF NOT EXISTS cron_job_error_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_log_id UUID NOT NULL REFERENCES cron_job_execution_logs(id) ON DELETE CASCADE,
  error_type VARCHAR(100) NOT NULL, -- 'validation', 'api', 'database', 'network', 'unknown'
  error_category VARCHAR(100), -- More specific category
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context_data JSONB, -- Context where error occurred (org_id, member_id, etc.)
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cron_job_error_details_execution ON cron_job_error_details(execution_log_id);
CREATE INDEX IF NOT EXISTS idx_cron_job_error_details_type ON cron_job_error_details(error_type);
CREATE INDEX IF NOT EXISTS idx_cron_job_error_details_occurred ON cron_job_error_details(occurred_at DESC);

-- ============================================
-- Helper Function: Get Latest Cron Job Status
-- ============================================

CREATE OR REPLACE FUNCTION get_latest_cron_job_status(job_name_param VARCHAR(255))
RETURNS TABLE (
  job_name VARCHAR(255),
  last_execution TIMESTAMPTZ,
  status VARCHAR(50),
  duration_ms INTEGER,
  total_success INTEGER,
  total_errors INTEGER,
  error_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.job_name,
    l.execution_started_at,
    l.status,
    l.duration_ms,
    l.total_success,
    l.total_errors,
    l.error_message
  FROM cron_job_execution_logs l
  WHERE l.job_name = job_name_param
  ORDER BY l.execution_started_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_latest_cron_job_status(VARCHAR) TO authenticated;

-- ============================================
-- Helper Function: Get Cron Job Statistics
-- ============================================

CREATE OR REPLACE FUNCTION get_cron_job_statistics(
  job_name_param VARCHAR(255),
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  job_name VARCHAR(255),
  total_executions BIGINT,
  successful_executions BIGINT,
  failed_executions BIGINT,
  partial_executions BIGINT,
  avg_duration_ms NUMERIC,
  total_processed BIGINT,
  total_success BIGINT,
  total_errors BIGINT,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.job_name,
    COUNT(*)::BIGINT as total_executions,
    COUNT(*) FILTER (WHERE l.status = 'success')::BIGINT as successful_executions,
    COUNT(*) FILTER (WHERE l.status = 'failed')::BIGINT as failed_executions,
    COUNT(*) FILTER (WHERE l.status = 'partial')::BIGINT as partial_executions,
    AVG(l.duration_ms)::NUMERIC as avg_duration_ms,
    SUM(l.total_processed)::BIGINT as total_processed,
    SUM(l.total_success)::BIGINT as total_success,
    SUM(l.total_errors)::BIGINT as total_errors,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        (COUNT(*) FILTER (WHERE l.status = 'success')::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as success_rate
  FROM cron_job_execution_logs l
  WHERE l.job_name = job_name_param
    AND l.execution_started_at >= NOW() - (days_back || ' days')::INTERVAL
  GROUP BY l.job_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_cron_job_statistics(VARCHAR, INTEGER) TO authenticated;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE cron_job_execution_logs IS 'Tracks all cron job executions for debugging and monitoring';
COMMENT ON TABLE cron_job_error_details IS 'Stores detailed error information for each failed operation in cron jobs';
COMMENT ON FUNCTION get_latest_cron_job_status(VARCHAR) IS 'Returns the latest execution status for a specific cron job';
COMMENT ON FUNCTION get_cron_job_statistics(VARCHAR, INTEGER) IS 'Returns statistics for a cron job over a specified number of days';

-- Analyze tables
ANALYZE cron_job_execution_logs;
ANALYZE cron_job_error_details;

