-- Migration: create_rls_helper_function
-- Description: Create helper function for Row Level Security policies
-- Created: 2024-02-01
-- Priority: Critical - Required for all RLS policies

-- ============================================
-- Helper Function for RLS Policies
-- ============================================

-- Function to get current user's organization_id from user_sessions
-- This function is SECURITY DEFINER so it can access user_sessions table
-- even when called from RLS policies
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_organization_id UUID;
BEGIN
  -- Get organization_id from user_sessions table
  SELECT organization_id
  INTO v_organization_id
  FROM user_sessions
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN v_organization_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_organization_id() IS 
'Returns the organization_id for the currently authenticated user from their active session. Used in RLS policies to ensure multi-tenant data isolation.';
