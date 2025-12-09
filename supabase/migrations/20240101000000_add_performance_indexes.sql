-- Migration: add_performance_indexes
-- Description: Add critical indexes for query performance optimization
-- Created: 2024-01-01
-- Priority: High - Essential for query performance

-- ============================================
-- organization_users table indexes
-- ============================================

-- Index for user_id lookups (most common query pattern)
-- This index is critical for all user-organization relationship queries
CREATE INDEX IF NOT EXISTS idx_organization_users_user_id 
ON organization_users(user_id);

-- Index for organization_id lookups
-- Critical for filtering users by organization
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id 
ON organization_users(organization_id);

-- Composite index for common join patterns
-- Optimizes queries that filter by both user_id and organization_id
CREATE INDEX IF NOT EXISTS idx_organization_users_user_org 
ON organization_users(user_id, organization_id);

-- Partial index for role-based queries (super_admin and admin)
-- Only indexes rows with these roles, reducing index size
CREATE INDEX IF NOT EXISTS idx_organization_users_role 
ON organization_users(role) 
WHERE role IN ('super_admin', 'admin');

-- ============================================
-- user_sessions table indexes
-- ============================================

-- Index for user_id lookups (primary query pattern)
-- Critical for session lookups which happen on every request
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
ON user_sessions(user_id);

-- Unique index to ensure one session per user
-- Also serves as an index for fast lookups
-- Note: This may already exist if user_id is the primary key
-- If it causes an error, the table may already have a unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'idx_user_sessions_user_id_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_user_sessions_user_id_unique 
    ON user_sessions(user_id);
  END IF;
END $$;

-- ============================================
-- organizations table indexes
-- ============================================

-- Unique index on slug for fast lookups and uniqueness
-- Critical for organization slug validation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'idx_organizations_slug'
  ) THEN
    CREATE UNIQUE INDEX idx_organizations_slug 
    ON organizations(slug);
  END IF;
END $$;

-- Index on type if filtering by organization type is common
-- Only create if you frequently filter by organization type
CREATE INDEX IF NOT EXISTS idx_organizations_type 
ON organizations(type);

-- ============================================
-- users table indexes
-- ============================================

-- Index on email for lookups
-- Note: This may already exist if email is used in auth
-- Supabase auth.users table already has email indexed
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

-- ============================================
-- Analyze tables after creating indexes
-- ============================================

-- Update table statistics for query planner
ANALYZE organization_users;
ANALYZE user_sessions;
ANALYZE organizations;
ANALYZE users;

