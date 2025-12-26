-- Migration: optimize_children_schema
-- Description: Clean up unused fields, add phone_number, consolidate parent fields to text
-- Date: 2025-12-25

-- Add phone_number field
ALTER TABLE children
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- Add text fields for parent names (replacing UUID references)
ALTER TABLE children
ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255);

-- Remove unused UUID reference fields
ALTER TABLE children
DROP COLUMN IF EXISTS mother_id,
DROP COLUMN IF EXISTS father_id,
DROP COLUMN IF EXISTS guardian_id;

-- Remove legacy parent fields
ALTER TABLE children
DROP COLUMN IF EXISTS parent_member_id,
DROP COLUMN IF EXISTS second_parent_member_id,
DROP COLUMN IF EXISTS parent_name,
DROP COLUMN IF EXISTS second_parent_name;

-- Remove middle_name (not used in UI)
ALTER TABLE children
DROP COLUMN IF EXISTS middle_name;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_children_status ON children(status);
CREATE INDEX IF NOT EXISTS idx_children_class_group ON children(class_group) WHERE class_group IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_date_of_birth ON children(date_of_birth) WHERE date_of_birth IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_organization ON children(organization_id);
CREATE INDEX IF NOT EXISTS idx_children_active ON children(organization_id, status) WHERE status = 'active';

-- Drop old indexes that are no longer needed
DROP INDEX IF EXISTS idx_children_mother;
DROP INDEX IF EXISTS idx_children_father;
DROP INDEX IF EXISTS idx_children_guardian;
DROP INDEX IF EXISTS idx_children_parent;
DROP INDEX IF EXISTS idx_children_second_parent;

-- Add comments for documentation
COMMENT ON COLUMN children.phone_number IS 'Phone number for kids who have phones';
COMMENT ON COLUMN children.mother_name IS 'Mother name (text field, searchable/typeable)';
COMMENT ON COLUMN children.father_name IS 'Father name (text field, searchable/typeable)';
COMMENT ON COLUMN children.guardian_name IS 'Guardian name (text field, searchable/typeable)';

-- Analyze table for query planner optimization
ANALYZE children;
