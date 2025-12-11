-- Migration: add_event_reminder_fields
-- Description: Add reminder template and message fields to events table
-- Created: 2024-02-01

-- Add reminder template and message fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS reminder_template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reminder_message_text TEXT;

-- Add comments
COMMENT ON COLUMN events.reminder_template_id IS 'Template to use for event reminder messages (optional)';
COMMENT ON COLUMN events.reminder_message_text IS 'Custom message text for event reminders (used if no template)';

-- Create index for reminder template lookups
CREATE INDEX IF NOT EXISTS idx_events_reminder_template ON events(reminder_template_id) WHERE reminder_template_id IS NOT NULL;

