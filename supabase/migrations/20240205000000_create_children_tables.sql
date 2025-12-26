-- Migration: create_children_tables
-- Description: Create Kidz Church module tables for children tracking
-- Created: 2024-02-05
-- Priority: High - Children tracking functionality (Church organizations only)

-- ============================================
-- Children Table
-- ============================================

CREATE TABLE IF NOT EXISTS children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Info
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(50),
  photo TEXT,
  
  -- Parent Relationships (links to members table)
  parent_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  second_parent_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  
  -- Ministry Tracking
  enrolled_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  class_group VARCHAR(255), -- e.g., "Toddlers", "Pre-K", "Elementary"
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for children table
CREATE INDEX IF NOT EXISTS idx_children_org ON children(organization_id);
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_children_name ON children(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_member_id) WHERE parent_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_second_parent ON children(second_parent_member_id) WHERE second_parent_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_birthday ON children(date_of_birth) WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_class_group ON children(class_group) WHERE class_group IS NOT NULL;

-- ============================================
-- Child Attendance Records Table
-- ============================================

CREATE TABLE IF NOT EXISTS child_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_out_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for child attendance
CREATE INDEX IF NOT EXISTS idx_child_attendance_org ON child_attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_child_attendance_child ON child_attendance_records(child_id);
CREATE INDEX IF NOT EXISTS idx_child_attendance_date ON child_attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_child_attendance_service ON child_attendance_records(service_type);

-- Unique constraint to prevent duplicate check-ins
CREATE UNIQUE INDEX IF NOT EXISTS idx_child_attendance_unique 
ON child_attendance_records(organization_id, child_id, date, service_type);

-- ============================================
-- Child Class Groups Table (for organizing children by age/class)
-- ============================================

CREATE TABLE IF NOT EXISTS child_class_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  min_age INTEGER, -- Minimum age in years
  max_age INTEGER, -- Maximum age in years
  leader VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT child_class_groups_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_child_class_groups_org ON child_class_groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_child_class_groups_status ON child_class_groups(status);

-- ============================================
-- Member-Children Junction Table (for linking members to their children)
-- ============================================

CREATE TABLE IF NOT EXISTS member_children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'parent', -- parent, guardian, etc.
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT member_children_unique UNIQUE (member_id, child_id)
);

CREATE INDEX IF NOT EXISTS idx_member_children_member ON member_children(member_id);
CREATE INDEX IF NOT EXISTS idx_member_children_child ON member_children(child_id);

-- ============================================
-- Add spouse_member_id to members table for spouse linking
-- ============================================

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS spouse_member_id UUID REFERENCES members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_spouse ON members(spouse_member_id) WHERE spouse_member_id IS NOT NULL;

-- ============================================
-- RLS Policies for Children Tables
-- ============================================

-- Enable RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_children ENABLE ROW LEVEL SECURITY;

-- Children table policies
CREATE POLICY "Users can view children in their organization" ON children
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert children in their organization" ON children
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update children in their organization" ON children
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete children in their organization" ON children
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Child attendance policies
CREATE POLICY "Users can view child attendance in their organization" ON child_attendance_records
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert child attendance in their organization" ON child_attendance_records
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update child attendance in their organization" ON child_attendance_records
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete child attendance in their organization" ON child_attendance_records
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Child class groups policies
CREATE POLICY "Users can view child class groups in their organization" ON child_class_groups
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert child class groups in their organization" ON child_class_groups
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update child class groups in their organization" ON child_class_groups
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete child class groups in their organization" ON child_class_groups
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Member children junction policies
CREATE POLICY "Users can view member-child links in their organization" ON member_children
  FOR SELECT USING (
    member_id IN (
      SELECT id FROM members WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert member-child links in their organization" ON member_children
  FOR INSERT WITH CHECK (
    member_id IN (
      SELECT id FROM members WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete member-child links in their organization" ON member_children
  FOR DELETE USING (
    member_id IN (
      SELECT id FROM members WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Analyze tables for query planner
ANALYZE children;
ANALYZE child_attendance_records;
ANALYZE child_class_groups;
ANALYZE member_children;
