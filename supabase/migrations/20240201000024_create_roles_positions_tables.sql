-- Migration: create_roles_positions_tables
-- Description: Create roles/positions table and add roles field to members
-- Created: 2024-02-01

-- ============================================
-- Roles/Positions Table
-- ============================================

CREATE TABLE IF NOT EXISTS roles_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT roles_positions_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_positions_org ON roles_positions(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_positions_status ON roles_positions(status);

-- ============================================
-- Add roles field to members table
-- ============================================

-- Add roles column as text array
ALTER TABLE members 
ADD COLUMN IF NOT EXISTS roles TEXT[];

-- Create index for roles array
CREATE INDEX IF NOT EXISTS idx_members_roles ON members USING GIN (roles);

-- Analyze tables for query planner
ANALYZE roles_positions;
ANALYZE members;

