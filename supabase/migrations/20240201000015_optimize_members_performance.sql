-- Migration: optimize_members_performance
-- Description: Add critical indexes and optimizations for members module with 10k+ records
-- Created: 2024-02-01
-- Priority: CRITICAL - Performance optimization for large datasets

-- ============================================
-- Members Table - Additional Performance Indexes
-- ============================================

-- Composite index for common filter patterns (organization + status)
CREATE INDEX IF NOT EXISTS idx_members_org_status 
ON members(organization_id, membership_status) 
WHERE membership_status IN ('active', 'inactive');

-- Composite index for search queries (organization + name search)
CREATE INDEX IF NOT EXISTS idx_members_org_name_search 
ON members(organization_id, last_name, first_name);

-- Index for date-based queries (join date filtering)
CREATE INDEX IF NOT EXISTS idx_members_org_join_date 
ON members(organization_id, join_date DESC) 
WHERE join_date IS NOT NULL;

-- GIN index for array searches (groups and departments)
-- This is critical for fast array containment queries
CREATE INDEX IF NOT EXISTS idx_members_groups_gin 
ON members USING GIN(groups) 
WHERE groups IS NOT NULL AND array_length(groups, 1) > 0;

CREATE INDEX IF NOT EXISTS idx_members_departments_gin 
ON members USING GIN(departments) 
WHERE departments IS NOT NULL AND array_length(departments, 1) > 0;

-- Partial index for active members (most common query)
CREATE INDEX IF NOT EXISTS idx_members_active 
ON members(organization_id, last_name, first_name) 
WHERE membership_status = 'active';

-- ============================================
-- Visitors Table - Additional Performance Indexes
-- ============================================

-- Composite index for organization + status filtering
CREATE INDEX IF NOT EXISTS idx_visitors_org_status 
ON visitors(organization_id, status);

-- Composite index for organization + visit date (most common query)
CREATE INDEX IF NOT EXISTS idx_visitors_org_visit_date 
ON visitors(organization_id, visit_date DESC);

-- Index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_visitors_follow_up_required 
ON visitors(organization_id, follow_up_required, follow_up_date) 
WHERE follow_up_required = true;

-- ============================================
-- Attendance Records - Additional Performance Indexes
-- ============================================

-- Composite index for organization + date + service type (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_attendance_org_date_service 
ON attendance_records(organization_id, date DESC, service_type);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_attendance_org_date_range 
ON attendance_records(organization_id, date DESC);

-- ============================================
-- Member Attendance Records - Performance Indexes
-- ============================================

-- Check if member_attendance_records table exists and add indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_attendance_records') THEN
    -- Composite index for member attendance lookups
    CREATE INDEX IF NOT EXISTS idx_member_attendance_member_date 
    ON member_attendance_records(organization_id, member_id, date DESC);
    
    -- Index for date + service type queries
    CREATE INDEX IF NOT EXISTS idx_member_attendance_date_service 
    ON member_attendance_records(organization_id, date, service_type);
    
    -- Index for member attendance history
    CREATE INDEX IF NOT EXISTS idx_member_attendance_member 
    ON member_attendance_records(organization_id, member_id);
  END IF;
END $$;

-- ============================================
-- Groups and Departments - Performance Indexes
-- ============================================

-- Composite index for organization + status (most common query)
CREATE INDEX IF NOT EXISTS idx_groups_org_status 
ON groups(organization_id, status) 
WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_departments_org_status 
ON departments(organization_id, status) 
WHERE status = 'Active';

-- ============================================
-- Update Table Statistics
-- ============================================

-- Analyze all tables to update query planner statistics
ANALYZE members;
ANALYZE visitors;
ANALYZE attendance_records;
ANALYZE groups;
ANALYZE departments;

-- Analyze member_attendance_records if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_attendance_records') THEN
    ANALYZE member_attendance_records;
  END IF;
END $$;

-- ============================================
-- Member Follow-ups - Performance Indexes
-- ============================================

-- Check if member_follow_ups table exists and add indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'member_follow_ups') THEN
    -- Composite index for member follow-up lookups
    CREATE INDEX IF NOT EXISTS idx_member_follow_ups_member_date 
    ON member_follow_ups(organization_id, member_id, date DESC);
    
    -- Index for date range queries
    CREATE INDEX IF NOT EXISTS idx_member_follow_ups_org_date 
    ON member_follow_ups(organization_id, date DESC);
    
    ANALYZE member_follow_ups;
  END IF;
END $$;

-- ============================================
-- Visitor Follow-ups - Performance Indexes
-- ============================================

-- Check if visitor_follow_ups table exists and add indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitor_follow_ups') THEN
    -- Composite index for visitor follow-up lookups
    CREATE INDEX IF NOT EXISTS idx_visitor_follow_ups_visitor_date 
    ON visitor_follow_ups(organization_id, visitor_id, date DESC);
    
    -- Index for date range queries
    CREATE INDEX IF NOT EXISTS idx_visitor_follow_ups_org_date 
    ON visitor_follow_ups(organization_id, date DESC);
    
    ANALYZE visitor_follow_ups;
  END IF;
END $$;

-- ============================================
-- Query Performance Notes
-- ============================================
-- 
-- These indexes are optimized for:
-- 1. Organization-scoped queries (most common pattern)
-- 2. Status filtering (active/inactive members)
-- 3. Date range queries (attendance, join dates)
-- 4. Array searches (groups/departments)
-- 5. Name-based searches
--
-- For 10k+ records, these indexes will significantly improve:
-- - Member list loading
-- - Search functionality
-- - Filter operations
-- - Attendance queries
-- - Group/department member counts

