-- Migration: create_members_tables
-- Description: Create all Members module tables with indexes
-- Created: 2024-02-01
-- Priority: High - Members functionality

-- ============================================
-- Members Table
-- ============================================

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  middle_name VARCHAR(255),
  email VARCHAR(255),
  phone_number VARCHAR(50),
  secondary_phone VARCHAR(50),
  photo TEXT, -- URL or path
  membership_status VARCHAR(50) NOT NULL CHECK (membership_status IN ('active', 'inactive', 'visitor')),
  join_date DATE,
  gender VARCHAR(50),
  date_of_birth DATE,
  marital_status VARCHAR(50),
  spouse_name VARCHAR(255),
  number_of_children INTEGER DEFAULT 0,
  occupation VARCHAR(255),
  address TEXT,
  city VARCHAR(255),
  town VARCHAR(255),
  region VARCHAR(255),
  digital_address VARCHAR(255),
  notes TEXT,
  groups TEXT[], -- Array of group names
  departments TEXT[], -- Array of department names
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_org ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(membership_status);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_name ON members(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_members_join_date ON members(join_date) WHERE join_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_members_birthday ON members(date_of_birth) WHERE date_of_birth IS NOT NULL;

-- ============================================
-- Visitors Table
-- ============================================

CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone_number VARCHAR(50),
  photo TEXT,
  status VARCHAR(50) NOT NULL CHECK (status IN ('New', 'Returning')),
  visit_date DATE NOT NULL,
  source VARCHAR(50) CHECK (source IN ('Walk-in', 'Invited', 'Online')),
  follow_up_required BOOLEAN DEFAULT FALSE,
  gender VARCHAR(50),
  address TEXT,
  invited_by VARCHAR(255),
  interests TEXT,
  notes TEXT,
  follow_up_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_org ON visitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_visit_date ON visitors(visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_follow_up ON visitors(follow_up_required, follow_up_date) WHERE follow_up_required = true;

-- ============================================
-- Attendance Records Table
-- ============================================

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  total_attendance INTEGER NOT NULL CHECK (total_attendance >= 0),
  men INTEGER DEFAULT 0 CHECK (men >= 0),
  women INTEGER DEFAULT 0 CHECK (women >= 0),
  children INTEGER DEFAULT 0 CHECK (children >= 0),
  first_timers INTEGER DEFAULT 0 CHECK (first_timers >= 0),
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT attendance_org_date_service_unique UNIQUE (organization_id, date, service_type)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_service_type ON attendance_records(service_type);

-- ============================================
-- Groups Table
-- ============================================

CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  leader VARCHAR(255),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT groups_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_groups_org ON groups(organization_id);
CREATE INDEX IF NOT EXISTS idx_groups_status ON groups(status);

-- ============================================
-- Departments Table
-- ============================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  leader VARCHAR(255),
  status VARCHAR(50) NOT NULL CHECK (status IN ('Active', 'Inactive')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT departments_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_status ON departments(status);

-- Now update foreign key constraints in finance_income_records to reference members
-- Only add if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_income_member'
  ) THEN
    ALTER TABLE finance_income_records 
      ADD CONSTRAINT fk_income_member 
      FOREIGN KEY (member_id) 
      REFERENCES members(id) 
      ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_income_asset'
  ) THEN
    ALTER TABLE finance_income_records 
      ADD CONSTRAINT fk_income_asset 
      FOREIGN KEY (linked_asset_id) 
      REFERENCES assets(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- Analyze tables for query planner
ANALYZE members;
ANALYZE visitors;
ANALYZE attendance_records;
ANALYZE groups;
ANALYZE departments;
