-- ============================================
-- Events Module Tables
-- ============================================

-- Event Types Configuration Table
CREATE TABLE IF NOT EXISTS event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT event_types_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_event_types_org ON event_types(organization_id);

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  location VARCHAR(500),
  track_attendance BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_frequency VARCHAR(50), -- 'Daily', 'Weekly', 'Monthly', 'Yearly'
  reminder_enabled BOOLEAN DEFAULT FALSE,
  reminder_send_time VARCHAR(50), -- 'day_before' or 'day_of'
  reminder_recipient_type VARCHAR(50), -- 'all_members', 'groups', 'selected_members'
  reminder_recipient_ids JSONB, -- Array of member IDs or group IDs
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_org ON events(organization_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_track_attendance ON events(track_attendance) WHERE track_attendance = TRUE;

-- ============================================
-- Update Triggers
-- ============================================

-- Trigger to update updated_at timestamp for event_types
CREATE OR REPLACE FUNCTION update_event_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_types_updated_at
  BEFORE UPDATE ON event_types
  FOR EACH ROW
  EXECUTE FUNCTION update_event_types_updated_at();

-- Trigger to update updated_at timestamp for events
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_updated_at();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE event_types IS 'Configuration table for event types';
COMMENT ON TABLE events IS 'Events table with attendance tracking and reminder options';
COMMENT ON COLUMN events.track_attendance IS 'If true, this event will appear in attendance tracking';
COMMENT ON COLUMN events.is_recurring IS 'If true, this event repeats based on recurrence_frequency';
COMMENT ON COLUMN events.reminder_enabled IS 'If true, reminders will be sent for this event';
COMMENT ON COLUMN events.reminder_send_time IS 'When to send reminders: day_before or day_of';
COMMENT ON COLUMN events.reminder_recipient_type IS 'Type of recipients for reminders: all_members, groups, or selected_members';
COMMENT ON COLUMN events.reminder_recipient_ids IS 'JSON array of recipient IDs (member IDs or group IDs)';
