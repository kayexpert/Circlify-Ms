-- Migration: enhance_children_parent_relationship
-- Description: Add parent-member relationships, medical info, and emergency contact fields

-- Add parent/guardian relationship fields
ALTER TABLE children
ADD COLUMN IF NOT EXISTS mother_id UUID REFERENCES members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS father_id UUID REFERENCES members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guardian_id UUID REFERENCES members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(100);

-- Add medical and emergency fields
ALTER TABLE children
ADD COLUMN IF NOT EXISTS medical_info TEXT,
ADD COLUMN IF NOT EXISTS allergies TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS special_needs TEXT;

-- Add notes field
ALTER TABLE children
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add middle name for consistency with members
ALTER TABLE children
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_children_mother ON children(mother_id) WHERE mother_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_father ON children(father_id) WHERE father_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_children_guardian ON children(guardian_id) WHERE guardian_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN children.mother_id IS 'Reference to member who is the mother';
COMMENT ON COLUMN children.father_id IS 'Reference to member who is the father';
COMMENT ON COLUMN children.guardian_id IS 'Reference to member who is the guardian';
COMMENT ON COLUMN children.guardian_relationship IS 'Relationship of guardian to child (e.g., Aunt, Uncle, Grandparent)';
COMMENT ON COLUMN children.medical_info IS 'Important medical information about the child';
COMMENT ON COLUMN children.allergies IS 'Known allergies';
COMMENT ON COLUMN children.emergency_contact_name IS 'Emergency contact person name';
COMMENT ON COLUMN children.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN children.special_needs IS 'Any special needs or accommodations required';
