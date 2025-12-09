-- Migration: add_visitor_fields_and_followups
-- Description: Add missing personal information fields to visitors table and create visitor_follow_ups table
-- Created: 2024-02-01

-- ============================================
-- Add missing fields to visitors table
-- ============================================

-- Add middle_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'middle_name'
  ) THEN
    ALTER TABLE visitors ADD COLUMN middle_name VARCHAR(255);
  END IF;
END $$;

-- Add secondary_phone if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'secondary_phone'
  ) THEN
    ALTER TABLE visitors ADD COLUMN secondary_phone VARCHAR(50);
  END IF;
END $$;

-- Add date_of_birth if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE visitors ADD COLUMN date_of_birth DATE;
  END IF;
END $$;

-- Add marital_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'marital_status'
  ) THEN
    ALTER TABLE visitors ADD COLUMN marital_status VARCHAR(50);
  END IF;
END $$;

-- Add spouse_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'spouse_name'
  ) THEN
    ALTER TABLE visitors ADD COLUMN spouse_name VARCHAR(255);
  END IF;
END $$;

-- Add number_of_children if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'number_of_children'
  ) THEN
    ALTER TABLE visitors ADD COLUMN number_of_children INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add occupation if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'occupation'
  ) THEN
    ALTER TABLE visitors ADD COLUMN occupation VARCHAR(255);
  END IF;
END $$;

-- Add city if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'city'
  ) THEN
    ALTER TABLE visitors ADD COLUMN city VARCHAR(255);
  END IF;
END $$;

-- Add town if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'town'
  ) THEN
    ALTER TABLE visitors ADD COLUMN town VARCHAR(255);
  END IF;
END $$;

-- Add region if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'region'
  ) THEN
    ALTER TABLE visitors ADD COLUMN region VARCHAR(255);
  END IF;
END $$;

-- Add digital_address if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visitors' AND column_name = 'digital_address'
  ) THEN
    ALTER TABLE visitors ADD COLUMN digital_address VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- Visitor Follow-ups Table
-- ============================================

CREATE TABLE IF NOT EXISTS visitor_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  method VARCHAR(50) NOT NULL,
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_follow_ups_visitor ON visitor_follow_ups(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_follow_ups_org ON visitor_follow_ups(organization_id);
CREATE INDEX IF NOT EXISTS idx_visitor_follow_ups_date ON visitor_follow_ups(date DESC);

-- Analyze tables for query planner
ANALYZE visitors;
ANALYZE visitor_follow_ups;
