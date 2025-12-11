-- Migration: comprehensive_performance_optimization
-- Description: Comprehensive database optimization for production readiness
-- Created: 2024-02-01
-- Priority: CRITICAL - Production performance optimization

-- ============================================
-- Additional Finance Module Indexes
-- ============================================

-- Index for budget queries by period and category
CREATE INDEX IF NOT EXISTS idx_finance_budgets_org_period_category 
ON finance_budgets(organization_id, period, category);

-- Index for category lookups by type
CREATE INDEX IF NOT EXISTS idx_finance_categories_org_type 
ON finance_categories(organization_id, type);

-- Index for reconciliation records by account and date
CREATE INDEX IF NOT EXISTS idx_finance_reconciliation_org_account_date 
ON finance_reconciliation_records(organization_id, account_id, date DESC);

-- Index for transfers by date range queries
CREATE INDEX IF NOT EXISTS idx_finance_transfers_org_date 
ON finance_transfers(organization_id, date DESC);

-- Index for income records by member (for member contribution tracking)
CREATE INDEX IF NOT EXISTS idx_finance_income_member_org 
ON finance_income_records(organization_id, member_id) 
WHERE member_id IS NOT NULL;

-- Index for expenditure records by category (for budget tracking)
CREATE INDEX IF NOT EXISTS idx_finance_expenditure_org_category_date 
ON finance_expenditure_records(organization_id, category, date DESC);

-- ============================================
-- Events Module Performance Indexes
-- ============================================

-- Composite index for event queries (organization + date range)
CREATE INDEX IF NOT EXISTS idx_events_org_date_range 
ON events(organization_id, start_date DESC, end_date DESC);

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_events_org_type 
ON events(organization_id, event_type_id);

-- Index for event reminders (used by cron job)
CREATE INDEX IF NOT EXISTS idx_events_reminder_enabled 
ON events(organization_id, reminder_enabled, reminder_send_time, start_date) 
WHERE reminder_enabled = true;

-- Index for event types by organization
CREATE INDEX IF NOT EXISTS idx_event_types_org 
ON event_types(organization_id);

-- ============================================
-- Assets Module Performance Indexes
-- ============================================

-- Composite index for asset queries (organization + category + status)
CREATE INDEX IF NOT EXISTS idx_assets_org_category_status 
ON assets(organization_id, category_id, status);

-- Index for asset disposal queries
CREATE INDEX IF NOT EXISTS idx_asset_disposals_org_date 
ON asset_disposals(organization_id, disposal_date DESC);

-- Index for asset categories by organization
CREATE INDEX IF NOT EXISTS idx_asset_categories_org 
ON asset_categories(organization_id);

-- ============================================
-- Messaging Module Additional Indexes
-- ============================================

-- Index for message recipients by message_id (for message detail queries)
CREATE INDEX IF NOT EXISTS idx_messaging_recipients_message_org 
ON messaging_message_recipients(organization_id, message_id, status);

-- Index for notification settings by organization
CREATE INDEX IF NOT EXISTS idx_messaging_notification_settings_org 
ON messaging_notification_settings(organization_id);

-- Index for API configurations by organization and active status
CREATE INDEX IF NOT EXISTS idx_messaging_api_config_org_active 
ON messaging_api_configurations(organization_id, is_active) 
WHERE is_active = true;

-- ============================================
-- User and Organization Performance Indexes
-- ============================================

-- Index for users table email lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- Index for organizations by slug (for public organization pages)
CREATE INDEX IF NOT EXISTS idx_organizations_slug_active 
ON organizations(slug) 
WHERE slug IS NOT NULL;

-- ============================================
-- Composite Indexes for Common Query Patterns
-- ============================================

-- Finance: Account + Date range queries
CREATE INDEX IF NOT EXISTS idx_finance_income_account_date 
ON finance_income_records(account_id, date DESC) 
WHERE account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_expenditure_account_date 
ON finance_expenditure_records(account_id, date DESC) 
WHERE account_id IS NOT NULL;

-- Members: Birthday queries (for birthday messages cron job)
CREATE INDEX IF NOT EXISTS idx_members_birthday_org 
ON members(organization_id, date_of_birth) 
WHERE date_of_birth IS NOT NULL;

-- ============================================
-- Vacuum and Analyze for Query Planner
-- ============================================

-- Update statistics for all optimized tables
ANALYZE finance_budgets;
ANALYZE finance_categories;
ANALYZE finance_reconciliation_records;
ANALYZE finance_transfers;
ANALYZE events;
ANALYZE event_types;
ANALYZE assets;
ANALYZE asset_disposals;
ANALYZE asset_categories;
ANALYZE messaging_message_recipients;
ANALYZE messaging_notification_settings;
ANALYZE messaging_api_configurations;
ANALYZE users;
ANALYZE organizations;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON INDEX idx_finance_budgets_org_period_category IS 
'Optimizes budget queries filtered by organization, period, and category';

COMMENT ON INDEX idx_events_org_date_range IS 
'Optimizes event queries filtered by organization and date range';

COMMENT ON INDEX idx_assets_org_category_status IS 
'Optimizes asset queries filtered by organization, category, and status';

COMMENT ON INDEX idx_members_birthday_org IS 
'Optimizes birthday queries for birthday message cron job processing';

