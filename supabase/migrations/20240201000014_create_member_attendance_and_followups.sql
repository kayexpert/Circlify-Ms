-- Migration: create_member_attendance_and_followups
-- Description: Create tables for member attendance records and member follow-ups

-- ============================================
-- Member Attendance Records Table
-- ============================================

CREATE TABLE IF NOT EXISTS member_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  service_type VARCHAR(255) NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_member_service_date UNIQUE (member_id, service_type, date)
);

CREATE INDEX IF NOT EXISTS idx_member_attendance_member ON member_attendance_records(member_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_org ON member_attendance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_attendance_date ON member_attendance_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_member_attendance_service ON member_attendance_records(service_type);
CREATE INDEX IF NOT EXISTS idx_member_attendance_event ON member_attendance_records(event_id) WHERE event_id IS NOT NULL;

COMMENT ON TABLE member_attendance_records IS 'Individual member attendance records for services and events';
COMMENT ON COLUMN member_attendance_records.member_id IS 'Reference to the member who attended';
COMMENT ON COLUMN member_attendance_records.service_type IS 'Type of service or event name';
COMMENT ON COLUMN member_attendance_records.event_id IS 'Reference to event if attendance is for a tracked event';
COMMENT ON COLUMN member_attendance_records.checked_in_at IS 'Timestamp when the member was checked in';

-- ============================================
-- Member Follow-ups Table
-- ============================================

CREATE TABLE IF NOT EXISTS member_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  method VARCHAR(50) NOT NULL,
  notes TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_member_follow_ups_member ON member_follow_ups(member_id);
CREATE INDEX IF NOT EXISTS idx_member_follow_ups_org ON member_follow_ups(organization_id);
CREATE INDEX IF NOT EXISTS idx_member_follow_ups_date ON member_follow_ups(date DESC);

COMMENT ON TABLE member_follow_ups IS 'Follow-up records for members';
COMMENT ON COLUMN member_follow_ups.member_id IS 'Reference to the member';
COMMENT ON COLUMN member_follow_ups.method IS 'Method of follow-up (e.g., Phone, Email, Visit, SMS)';
COMMENT ON COLUMN member_follow_ups.notes IS 'Notes about the follow-up';
COMMENT ON COLUMN member_follow_ups.created_by IS 'User who created the follow-up record';

-- ============================================
-- Update Triggers
-- ============================================

CREATE OR REPLACE FUNCTION update_member_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_attendance_records_updated_at
  BEFORE UPDATE ON member_attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION update_member_attendance_records_updated_at();

CREATE OR REPLACE FUNCTION update_member_follow_ups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_member_follow_ups_updated_at
  BEFORE UPDATE ON member_follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_member_follow_ups_updated_at();

-- Analyze tables for query planner
ANALYZE member_attendance_records;
ANALYZE member_follow_ups;
