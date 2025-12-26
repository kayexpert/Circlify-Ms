-- Migration: create_audit_logs_table
-- Description: Create audit_logs table for security compliance and debugging
-- Created: 2024-02-01
-- Priority: HIGH - Security

-- ============================================
-- Create Audit Logs Table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'info',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for efficient querying
-- ============================================

-- Index for querying by organization (most common)
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id 
ON audit_logs(organization_id) 
WHERE organization_id IS NOT NULL;

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id) 
WHERE user_id IS NOT NULL;

-- Index for querying by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

-- Index for querying by severity (for alerts)
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity 
ON audit_logs(severity) 
WHERE severity IN ('warning', 'critical');

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
ON audit_logs(created_at DESC);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_action_time 
ON audit_logs(organization_id, action, created_at DESC);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs from their organization
CREATE POLICY "Users can view audit logs from their organization"
ON audit_logs FOR SELECT
USING (organization_id = get_user_organization_id());

-- Only service role can insert audit logs (from server-side)
CREATE POLICY "Service role can insert audit logs"
ON audit_logs FOR INSERT
TO service_role
WITH CHECK (true);

-- Audit logs should not be updated or deleted (immutable)
-- No UPDATE or DELETE policies

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE audit_logs IS 'Audit trail for sensitive operations - used for compliance and debugging';
COMMENT ON COLUMN audit_logs.action IS 'The action that was performed (e.g., member.create, finance.income.delete)';
COMMENT ON COLUMN audit_logs.severity IS 'Severity level: info, warning, or critical';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client that performed the action';

-- ============================================
-- Optional: Create a function to clean old logs
-- ============================================

-- Function to delete audit logs older than specified days
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Deletes audit logs older than specified days. Default is 365 days.';

-- Analyze the table for query optimization
ANALYZE audit_logs;
