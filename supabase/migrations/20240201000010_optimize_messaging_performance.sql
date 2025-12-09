-- Migration: optimize_messaging_performance
-- Description: Add performance optimizations for messaging module
-- Created: 2024-02-01
-- Priority: High - Performance optimization

-- ============================================
-- Additional Indexes for Performance
-- ============================================

-- Composite index for common query pattern: organization + status + date
CREATE INDEX IF NOT EXISTS idx_messaging_messages_org_status_date 
ON messaging_messages(organization_id, status, created_at DESC);

-- Index for scheduled messages query (used by edge function)
CREATE INDEX IF NOT EXISTS idx_messaging_messages_scheduled_org 
ON messaging_messages(organization_id, scheduled_at) 
WHERE status = 'Scheduled' AND scheduled_at IS NOT NULL;

-- Index for recurring messages query (used by edge function)
CREATE INDEX IF NOT EXISTS idx_messaging_messages_recurring_org 
ON messaging_messages(organization_id, is_recurring, recurrence_frequency, recurrence_end_date) 
WHERE is_recurring = true AND status = 'Sent';

-- Index for recipient lookups by phone number
CREATE INDEX IF NOT EXISTS idx_messaging_recipients_phone_status 
ON messaging_message_recipients(phone_number, status) 
WHERE phone_number IS NOT NULL;

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_messaging_templates_org_name 
ON messaging_templates(organization_id, name);

-- ============================================
-- Materialized View for Analytics (Optional - for very large datasets)
-- ============================================

-- Create a materialized view for message statistics
-- This can be refreshed periodically for better analytics performance
CREATE MATERIALIZED VIEW IF NOT EXISTS messaging_stats_cache AS
SELECT 
  organization_id,
  DATE_TRUNC('month', created_at) as month,
  status,
  COUNT(*) as message_count,
  SUM(recipient_count) as total_recipients,
  SUM(cost) as total_cost,
  COUNT(CASE WHEN template_id IS NOT NULL THEN 1 END) as template_usage_count
FROM messaging_messages
GROUP BY organization_id, DATE_TRUNC('month', created_at), status;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_messaging_stats_cache_org_month 
ON messaging_stats_cache(organization_id, month);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_messaging_stats_cache()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY messaging_stats_cache;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Analyze tables for query planner
-- ============================================

ANALYZE messaging_messages;
ANALYZE messaging_message_recipients;
ANALYZE messaging_templates;
ANALYZE messaging_api_configurations;
