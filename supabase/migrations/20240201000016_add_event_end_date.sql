-- ============================================
-- Add end_date field to events table
-- ============================================

-- Add end_date column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add index for end_date queries
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date) WHERE end_date IS NOT NULL;

-- Add comment
COMMENT ON COLUMN events.end_date IS 'Optional end date for multi-day events';

