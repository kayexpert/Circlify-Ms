-- ============================================
-- RLS Policies for Events Module
-- ============================================

-- Enable RLS on event_types
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view event types from their organization" ON event_types;
CREATE POLICY "Users can view event types from their organization"
ON event_types FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert event types for their organization" ON event_types;
CREATE POLICY "Users can insert event types for their organization"
ON event_types FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update event types from their organization" ON event_types;
CREATE POLICY "Users can update event types from their organization"
ON event_types FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete event types from their organization" ON event_types;
CREATE POLICY "Users can delete event types from their organization"
ON event_types FOR DELETE
USING (organization_id = get_user_organization_id());

-- Enable RLS on events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view events from their organization" ON events;
CREATE POLICY "Users can view events from their organization"
ON events FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert events for their organization" ON events;
CREATE POLICY "Users can insert events for their organization"
ON events FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update events from their organization" ON events;
CREATE POLICY "Users can update events from their organization"
ON events FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete events from their organization" ON events;
CREATE POLICY "Users can delete events from their organization"
ON events FOR DELETE
USING (organization_id = get_user_organization_id());
