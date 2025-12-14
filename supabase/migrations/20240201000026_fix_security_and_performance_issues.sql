-- Migration: fix_security_and_performance_issues
-- Description: Fix all security and performance issues identified by Supabase advisors
-- Created: 2024-02-01
-- Priority: CRITICAL - Security and Performance

-- ============================================
-- 1. SECURITY: Enable RLS on roles_positions table
-- ============================================

ALTER TABLE roles_positions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view roles_positions from their organization" ON roles_positions;
DROP POLICY IF EXISTS "Users can insert roles_positions for their organization" ON roles_positions;
DROP POLICY IF EXISTS "Users can update roles_positions from their organization" ON roles_positions;
DROP POLICY IF EXISTS "Users can delete roles_positions from their organization" ON roles_positions;

-- Create RLS policies for roles_positions
CREATE POLICY "Users can view roles_positions from their organization"
ON roles_positions FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can insert roles_positions for their organization"
ON roles_positions FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update roles_positions from their organization"
ON roles_positions FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can delete roles_positions from their organization"
ON roles_positions FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- 2. PERFORMANCE: Fix RLS policies to use (select auth.uid()) pattern
-- This prevents re-evaluation of auth functions for each row
-- CRITICAL: This was causing slow queries at scale
-- ============================================

-- Fix project_categories RLS policies
DROP POLICY IF EXISTS "Users can view project categories in their organization" ON project_categories;
CREATE POLICY "Users can view project categories in their organization"
  ON project_categories FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert project categories in their organization" ON project_categories;
CREATE POLICY "Users can insert project categories in their organization"
  ON project_categories FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update project categories in their organization" ON project_categories;
CREATE POLICY "Users can update project categories in their organization"
  ON project_categories FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete project categories in their organization" ON project_categories;
CREATE POLICY "Users can delete project categories in their organization"
  ON project_categories FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Fix projects RLS policies
DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
CREATE POLICY "Users can view projects in their organization"
  ON projects FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert projects in their organization" ON projects;
CREATE POLICY "Users can insert projects in their organization"
  ON projects FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update projects in their organization" ON projects;
CREATE POLICY "Users can update projects in their organization"
  ON projects FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete projects in their organization" ON projects;
CREATE POLICY "Users can delete projects in their organization"
  ON projects FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Fix project_income RLS policies
DROP POLICY IF EXISTS "Users can view project income in their organization" ON project_income;
CREATE POLICY "Users can view project income in their organization"
  ON project_income FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert project income in their organization" ON project_income;
CREATE POLICY "Users can insert project income in their organization"
  ON project_income FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update project income in their organization" ON project_income;
CREATE POLICY "Users can update project income in their organization"
  ON project_income FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete project income in their organization" ON project_income;
CREATE POLICY "Users can delete project income in their organization"
  ON project_income FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Fix project_expenditure RLS policies
DROP POLICY IF EXISTS "Users can view project expenditure in their organization" ON project_expenditure;
CREATE POLICY "Users can view project expenditure in their organization"
  ON project_expenditure FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert project expenditure in their organization" ON project_expenditure;
CREATE POLICY "Users can insert project expenditure in their organization"
  ON project_expenditure FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update project expenditure in their organization" ON project_expenditure;
CREATE POLICY "Users can update project expenditure in their organization"
  ON project_expenditure FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete project expenditure in their organization" ON project_expenditure;
CREATE POLICY "Users can delete project expenditure in their organization"
  ON project_expenditure FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Fix organizations RLS policy (insert_organizations)
DROP POLICY IF EXISTS "insert_organizations" ON organizations;
CREATE POLICY "insert_organizations"
  ON organizations FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================
-- 3. SECURITY: Fix function search_path for security
-- ============================================

-- Fix create_finance_income_from_project_income function
CREATE OR REPLACE FUNCTION create_finance_income_from_project_income()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_name VARCHAR(255);
  member_name_val VARCHAR(255);
  account_name_val VARCHAR(255);
  finance_record_id UUID;
BEGIN
  -- Get project name
  SELECT name INTO project_name
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Get member name if member_id is provided
  IF NEW.member_id IS NOT NULL THEN
    SELECT CONCAT(first_name, ' ', last_name) INTO member_name_val
    FROM members
    WHERE id = NEW.member_id;
  END IF;
  
  -- Get account name
  SELECT name INTO account_name_val
  FROM finance_accounts
  WHERE id = NEW.account_id;
  
  -- Create finance income record
  INSERT INTO finance_income_records (
    organization_id,
    date,
    source,
    category,
    amount,
    method,
    account_id,
    member_id,
    member_name,
    reference
  ) VALUES (
    NEW.organization_id,
    NEW.date,
    'Project Funding',
    'Project',
    NEW.amount,
    account_name_val,
    NEW.account_id,
    NEW.member_id,
    member_name_val,
    CONCAT('Funding for ', project_name)
  )
  RETURNING id INTO finance_record_id;
  
  -- Update project_income with linked record ID
  UPDATE project_income
  SET linked_income_record_id = finance_record_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Fix create_finance_expenditure_from_project_expenditure function
CREATE OR REPLACE FUNCTION create_finance_expenditure_from_project_expenditure()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_name VARCHAR(255);
  account_name_val VARCHAR(255);
  finance_record_id UUID;
BEGIN
  -- Get project name
  SELECT name INTO project_name
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Get account name
  SELECT name INTO account_name_val
  FROM finance_accounts
  WHERE id = NEW.account_id;
  
  -- Create finance expenditure record
  INSERT INTO finance_expenditure_records (
    organization_id,
    date,
    description,
    category,
    amount,
    method,
    account_id,
    reference
  ) VALUES (
    NEW.organization_id,
    NEW.date,
    COALESCE(NEW.description, CONCAT('Payment for ', project_name)),
    'Project',
    NEW.amount,
    account_name_val,
    NEW.account_id,
    CONCAT('Payment for ', project_name)
  )
  RETURNING id INTO finance_record_id;
  
  -- Update project_expenditure with linked record ID
  UPDATE project_expenditure
  SET linked_expenditure_record_id = finance_record_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$;

-- Fix delete_finance_record_on_project_income_delete function
CREATE OR REPLACE FUNCTION delete_finance_record_on_project_income_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete linked finance income record if it exists
  IF OLD.linked_income_record_id IS NOT NULL THEN
    DELETE FROM finance_income_records
    WHERE id = OLD.linked_income_record_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Fix delete_finance_record_on_project_expenditure_delete function
CREATE OR REPLACE FUNCTION delete_finance_record_on_project_expenditure_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete linked finance expenditure record if it exists
  IF OLD.linked_expenditure_record_id IS NOT NULL THEN
    DELETE FROM finance_expenditure_records
    WHERE id = OLD.linked_expenditure_record_id;
  END IF;
  
  RETURN OLD;
END;
$$;

-- ============================================
-- 4. PERFORMANCE: Add missing index on foreign key
-- ============================================

-- Add index on event_reminder_sent_logs.message_id foreign key
CREATE INDEX IF NOT EXISTS idx_event_reminder_sent_logs_message_id 
ON event_reminder_sent_logs(message_id) 
WHERE message_id IS NOT NULL;

-- ============================================
-- 5. PERFORMANCE: Remove duplicate indexes
-- ============================================

-- Remove duplicate index on event_reminder_sent_logs
-- Keep idx_event_reminder_logs_event_occurrence, drop idx_event_reminder_logs_check
DROP INDEX IF EXISTS idx_event_reminder_logs_check;

-- Remove duplicate index on members
-- Keep idx_members_active_org (more specific), drop idx_members_active
DROP INDEX IF EXISTS idx_members_active;

-- ============================================
-- Analyze tables for query planner
-- ============================================

ANALYZE roles_positions;
ANALYZE project_categories;
ANALYZE projects;
ANALYZE project_income;
ANALYZE project_expenditure;
ANALYZE organizations;
ANALYZE event_reminder_sent_logs;
ANALYZE members;
