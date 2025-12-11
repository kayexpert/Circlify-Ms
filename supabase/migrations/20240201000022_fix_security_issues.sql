-- Migration: fix_security_issues
-- Description: Fix security warnings - Enable RLS on cron job tables and fix function search_path issues
-- Created: 2024-02-01
-- Priority: High - Security

-- ============================================
-- Enable RLS on Cron Job Tables
-- ============================================

-- Enable RLS on cron_job_execution_logs
ALTER TABLE cron_job_execution_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cron_job_error_details
ALTER TABLE cron_job_error_details ENABLE ROW LEVEL SECURITY;

-- Enable RLS on event_reminder_sent_logs
ALTER TABLE event_reminder_sent_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for cron_job_execution_logs
-- ============================================
-- These logs are accessible to authenticated users for monitoring purposes
-- Service role can access all records (for cron jobs)

CREATE POLICY "Authenticated users can view cron job execution logs"
  ON cron_job_execution_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (for cron job execution)
CREATE POLICY "Service role can manage cron job execution logs"
  ON cron_job_execution_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RLS Policies for cron_job_error_details
-- ============================================
-- Error details are accessible to authenticated users for debugging

CREATE POLICY "Authenticated users can view cron job error details"
  ON cron_job_error_details
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (for cron job execution)
CREATE POLICY "Service role can manage cron job error details"
  ON cron_job_error_details
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- RLS Policies for event_reminder_sent_logs
-- ============================================
-- Sent logs are accessible to authenticated users for tracking

CREATE POLICY "Authenticated users can view event reminder sent logs"
  ON event_reminder_sent_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (for cron job execution)
CREATE POLICY "Service role can manage event reminder sent logs"
  ON event_reminder_sent_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Fix Function Search Path Security Issues
-- ============================================
-- Set search_path to prevent search path injection attacks

-- Fix get_latest_cron_job_status
CREATE OR REPLACE FUNCTION get_latest_cron_job_status(job_name_param VARCHAR(255))
RETURNS TABLE (
  job_name VARCHAR(255),
  last_execution TIMESTAMPTZ,
  status VARCHAR(50),
  duration_ms INTEGER,
  total_success INTEGER,
  total_errors INTEGER,
  error_message TEXT
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Fix get_cron_job_statistics
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
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Fix get_cron_job_status
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = cron, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule::text,
    j.command::text,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  WHERE j.jobname IN (
    'process_birthday_messages', 
    'process_event_reminders',
    'process_recurring_messages',
    'process_scheduled_messages'
  )
  ORDER BY j.jobname;
END;
$$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON POLICY "Authenticated users can view cron job execution logs" ON cron_job_execution_logs IS 'Allows authenticated users to view cron job execution logs for monitoring';
COMMENT ON POLICY "Service role can manage cron job execution logs" ON cron_job_execution_logs IS 'Allows service role to manage cron job execution logs';
COMMENT ON POLICY "Authenticated users can view cron job error details" ON cron_job_error_details IS 'Allows authenticated users to view cron job error details for debugging';
COMMENT ON POLICY "Service role can manage cron job error details" ON cron_job_error_details IS 'Allows service role to manage cron job error details';
COMMENT ON POLICY "Authenticated users can view event reminder sent logs" ON event_reminder_sent_logs IS 'Allows authenticated users to view event reminder sent logs';
COMMENT ON POLICY "Service role can manage event reminder sent logs" ON event_reminder_sent_logs IS 'Allows service role to manage event reminder sent logs';

