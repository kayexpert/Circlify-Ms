-- Migration: query_performance_optimization
-- Description: Additional indexes and optimizations for slow queries
-- Created: 2024-02-01
-- Priority: HIGH - Performance optimization

-- ============================================
-- Additional Indexes for Common Query Patterns
-- ============================================

-- Index for members queries by status (used frequently)
CREATE INDEX IF NOT EXISTS idx_members_org_status_name 
ON members(organization_id, membership_status, last_name, first_name)
WHERE membership_status IS NOT NULL;

-- Index for visitors by follow-up status (common filter)
CREATE INDEX IF NOT EXISTS idx_visitors_org_followup_date 
ON visitors(organization_id, follow_up_required, visit_date DESC)
WHERE follow_up_required = true;

-- Index for income records by date range (for reports and trends)
CREATE INDEX IF NOT EXISTS idx_finance_income_org_date_category 
ON finance_income_records(organization_id, date DESC, category)
WHERE date IS NOT NULL;

-- Index for expenditure records by date range (for reports and trends)
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_org_date_category 
ON finance_expenditure_records(organization_id, date DESC, category)
WHERE date IS NOT NULL;

-- Index for messaging messages by status and date (common filter)
CREATE INDEX IF NOT EXISTS idx_messaging_messages_org_status_date 
ON messaging_messages(organization_id, status, created_at DESC)
WHERE status IS NOT NULL;

-- Index for asset disposals by date (for reports)
CREATE INDEX IF NOT EXISTS idx_asset_disposals_org_date 
ON asset_disposals(organization_id, date DESC)
WHERE date IS NOT NULL;

-- Index for reconciliation records by status (common filter)
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_org_status_date 
ON finance_reconciliation_records(organization_id, status, date DESC)
WHERE status IS NOT NULL;

-- Index for events by date range with reminder (for cron jobs)
CREATE INDEX IF NOT EXISTS idx_events_org_reminder_date 
ON events(organization_id, reminder_enabled, event_date)
WHERE reminder_enabled = true AND event_date IS NOT NULL;

-- Index for members by groups (for group-based queries)
CREATE INDEX IF NOT EXISTS idx_members_groups_gin 
ON members USING GIN(groups)
WHERE groups IS NOT NULL AND array_length(groups, 1) > 0;

-- Index for members by departments (for department-based queries)
CREATE INDEX IF NOT EXISTS idx_members_departments_gin 
ON members USING GIN(departments)
WHERE departments IS NOT NULL AND array_length(departments, 1) > 0;

-- ============================================
-- Composite Indexes for Multi-Column Queries
-- ============================================

-- Index for income records by member and date (member contribution tracking)
CREATE INDEX IF NOT EXISTS idx_finance_income_member_date 
ON finance_income_records(organization_id, member_id, date DESC)
WHERE member_id IS NOT NULL;

-- Index for expenditure records by account and date (account reconciliation)
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_account_date 
ON finance_expenditure_records(organization_id, account_id, date DESC)
WHERE account_id IS NOT NULL;

-- Index for messaging recipients by message and status (message detail queries)
CREATE INDEX IF NOT EXISTS idx_messaging_recipients_message_status 
ON messaging_message_recipients(message_id, status, sent_at DESC)
WHERE message_id IS NOT NULL;

-- ============================================
-- Partial Indexes for Common Filters
-- ============================================

-- Index for active members only (most common query)
CREATE INDEX IF NOT EXISTS idx_members_active_org 
ON members(organization_id, last_name, first_name)
WHERE membership_status = 'active';

-- Index for pending reconciliation records
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_pending 
ON finance_reconciliation_records(organization_id, date DESC)
WHERE status = 'Pending';

-- Index for sent messages (most common filter)
CREATE INDEX IF NOT EXISTS idx_messaging_messages_sent 
ON messaging_messages(organization_id, sent_at DESC)
WHERE status = 'Sent';

-- Index for failed messages (for error tracking)
CREATE INDEX IF NOT EXISTS idx_messaging_messages_failed 
ON messaging_messages(organization_id, created_at DESC)
WHERE status = 'Failed';

-- ============================================
-- Update Statistics for Query Planner
-- ============================================

ANALYZE members;
ANALYZE visitors;
ANALYZE finance_income_records;
ANALYZE finance_expenditure_records;
ANALYZE finance_reconciliation_records;
ANALYZE messaging_messages;
ANALYZE messaging_message_recipients;
ANALYZE asset_disposals;
ANALYZE events;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON INDEX idx_members_org_status_name IS 
'Optimizes member queries filtered by organization, status, and sorted by name';

COMMENT ON INDEX idx_visitors_org_followup_date IS 
'Optimizes visitor queries for follow-up tracking';

COMMENT ON INDEX idx_finance_income_org_date_category IS 
'Optimizes income record queries for date range and category filtering';

COMMENT ON INDEX idx_messaging_messages_org_status_date IS 
'Optimizes message queries filtered by status and sorted by date';

COMMENT ON INDEX idx_members_active_org IS 
'Partial index for active members only - most common query pattern';

