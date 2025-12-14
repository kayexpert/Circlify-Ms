-- Migration: optimize_birthday_query
-- Description: Add database function for efficient birthday member queries
-- Created: 2024-02-02
-- Priority: High - Performance optimization for birthday message processing

-- ============================================
-- Function to get members with birthdays today
-- ============================================
-- This function efficiently filters members by birthday using database-level date functions
-- Optimized for the birthday message edge function

CREATE OR REPLACE FUNCTION get_members_with_birthday_today(
  p_organization_id UUID
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  date_of_birth DATE
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.first_name,
    m.last_name,
    m.phone_number,
    m.date_of_birth::DATE
  FROM members m
  WHERE m.organization_id = p_organization_id
    AND m.membership_status = 'active'
    AND m.date_of_birth IS NOT NULL
    AND m.phone_number IS NOT NULL
    AND m.phone_number != ''
    -- Filter by month and day using EXTRACT for better performance
    AND EXTRACT(MONTH FROM m.date_of_birth::DATE) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM m.date_of_birth::DATE) = EXTRACT(DAY FROM CURRENT_DATE);
END;
$$;

-- Create index to optimize the birthday query
-- Composite index on organization_id, membership_status, and date_of_birth
CREATE INDEX IF NOT EXISTS idx_members_birthday_query 
ON members(organization_id, membership_status, date_of_birth)
WHERE membership_status = 'active' 
  AND date_of_birth IS NOT NULL 
  AND phone_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON FUNCTION get_members_with_birthday_today(UUID) IS 
'Returns active members with birthdays today. Optimized for birthday message processing. 
Uses database-level date filtering for better performance.';

