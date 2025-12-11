-- Migration: create_event_reminder_sent_logs
-- Description: Create table to track sent event reminders (prevents duplicates, especially for recurring events)
-- Created: 2024-02-01

-- ============================================
-- Event Reminder Sent Logs Table
-- ============================================
-- This table tracks which event reminders have been sent to prevent duplicates
-- Especially important for recurring events where we need to track each occurrence

CREATE TABLE IF NOT EXISTS event_reminder_sent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL, -- The specific date this reminder was for
  reminder_send_time VARCHAR(50) NOT NULL CHECK (reminder_send_time IN ('day_before', 'day_of')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_id UUID REFERENCES messaging_messages(id) ON DELETE SET NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate reminders for same event occurrence
  CONSTRAINT event_reminder_sent_logs_unique UNIQUE (event_id, occurrence_date, reminder_send_time)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_event_reminder_logs_event ON event_reminder_sent_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reminder_logs_occurrence ON event_reminder_sent_logs(occurrence_date);
CREATE INDEX IF NOT EXISTS idx_event_reminder_logs_sent_at ON event_reminder_sent_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_reminder_logs_event_occurrence ON event_reminder_sent_logs(event_id, occurrence_date, reminder_send_time);

-- Composite index for common queries (checking if reminder already sent)
CREATE INDEX IF NOT EXISTS idx_event_reminder_logs_check 
ON event_reminder_sent_logs(event_id, occurrence_date, reminder_send_time);

-- Comments
COMMENT ON TABLE event_reminder_sent_logs IS 'Tracks which event reminders have been sent to prevent duplicates, especially for recurring events';
COMMENT ON COLUMN event_reminder_sent_logs.occurrence_date IS 'The specific date this reminder was for (for recurring events, this is the calculated occurrence date)';
COMMENT ON COLUMN event_reminder_sent_logs.reminder_send_time IS 'Whether this was sent day_before or day_of the event';

-- Analyze table
ANALYZE event_reminder_sent_logs;

