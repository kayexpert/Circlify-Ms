-- Migration: add_leader_id_to_class_groups
-- Description: Add leader_id column to child_class_groups table for proper member reference
-- This allows class leaders to be linked to actual member records instead of storing names as text

-- Add leader_id column to store member UUID reference
ALTER TABLE child_class_groups 
ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES members(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_child_class_groups_leader ON child_class_groups(leader_id) WHERE leader_id IS NOT NULL;

-- Note: We're keeping the existing 'leader' VARCHAR column for backwards compatibility
-- and as a display fallback. New records should populate both leader (name) and leader_id (UUID).
