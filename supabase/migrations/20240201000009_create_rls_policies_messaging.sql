-- Migration: create_rls_policies_messaging
-- Description: Create Row Level Security policies for Messaging tables
-- Created: 2024-02-01
-- Priority: CRITICAL - Security and multi-tenancy

-- ============================================
-- Messaging Templates RLS Policies
-- ============================================

ALTER TABLE messaging_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messaging templates from their organization" ON messaging_templates;
CREATE POLICY "Users can view messaging templates from their organization"
ON messaging_templates FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert messaging templates for their organization" ON messaging_templates;
CREATE POLICY "Users can insert messaging templates for their organization"
ON messaging_templates FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update messaging templates from their organization" ON messaging_templates;
CREATE POLICY "Users can update messaging templates from their organization"
ON messaging_templates FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete messaging templates from their organization" ON messaging_templates;
CREATE POLICY "Users can delete messaging templates from their organization"
ON messaging_templates FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Messaging API Configurations RLS Policies
-- ============================================

ALTER TABLE messaging_api_configurations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messaging API configurations from their organization" ON messaging_api_configurations;
CREATE POLICY "Users can view messaging API configurations from their organization"
ON messaging_api_configurations FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert messaging API configurations for their organization" ON messaging_api_configurations;
CREATE POLICY "Users can insert messaging API configurations for their organization"
ON messaging_api_configurations FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update messaging API configurations from their organization" ON messaging_api_configurations;
CREATE POLICY "Users can update messaging API configurations from their organization"
ON messaging_api_configurations FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete messaging API configurations from their organization" ON messaging_api_configurations;
CREATE POLICY "Users can delete messaging API configurations from their organization"
ON messaging_api_configurations FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Messaging Messages RLS Policies
-- ============================================

ALTER TABLE messaging_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messaging messages from their organization" ON messaging_messages;
CREATE POLICY "Users can view messaging messages from their organization"
ON messaging_messages FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert messaging messages for their organization" ON messaging_messages;
CREATE POLICY "Users can insert messaging messages for their organization"
ON messaging_messages FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update messaging messages from their organization" ON messaging_messages;
CREATE POLICY "Users can update messaging messages from their organization"
ON messaging_messages FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete messaging messages from their organization" ON messaging_messages;
CREATE POLICY "Users can delete messaging messages from their organization"
ON messaging_messages FOR DELETE
USING (organization_id = get_user_organization_id());

-- ============================================
-- Messaging Message Recipients RLS Policies
-- ============================================

ALTER TABLE messaging_message_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messaging recipients from their organization" ON messaging_message_recipients;
CREATE POLICY "Users can view messaging recipients from their organization"
ON messaging_message_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messaging_messages
    WHERE messaging_messages.id = messaging_message_recipients.message_id
    AND messaging_messages.organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "Users can insert messaging recipients for their organization" ON messaging_message_recipients;
CREATE POLICY "Users can insert messaging recipients for their organization"
ON messaging_message_recipients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messaging_messages
    WHERE messaging_messages.id = messaging_message_recipients.message_id
    AND messaging_messages.organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "Users can update messaging recipients from their organization" ON messaging_message_recipients;
CREATE POLICY "Users can update messaging recipients from their organization"
ON messaging_message_recipients FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM messaging_messages
    WHERE messaging_messages.id = messaging_message_recipients.message_id
    AND messaging_messages.organization_id = get_user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messaging_messages
    WHERE messaging_messages.id = messaging_message_recipients.message_id
    AND messaging_messages.organization_id = get_user_organization_id()
  )
);

DROP POLICY IF EXISTS "Users can delete messaging recipients from their organization" ON messaging_message_recipients;
CREATE POLICY "Users can delete messaging recipients from their organization"
ON messaging_message_recipients FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM messaging_messages
    WHERE messaging_messages.id = messaging_message_recipients.message_id
    AND messaging_messages.organization_id = get_user_organization_id()
  )
);

-- ============================================
-- Messaging Notification Settings RLS Policies
-- ============================================

ALTER TABLE messaging_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messaging notification settings from their organization" ON messaging_notification_settings;
CREATE POLICY "Users can view messaging notification settings from their organization"
ON messaging_notification_settings FOR SELECT
USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can insert messaging notification settings for their organization" ON messaging_notification_settings;
CREATE POLICY "Users can insert messaging notification settings for their organization"
ON messaging_notification_settings FOR INSERT
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can update messaging notification settings from their organization" ON messaging_notification_settings;
CREATE POLICY "Users can update messaging notification settings from their organization"
ON messaging_notification_settings FOR UPDATE
USING (organization_id = get_user_organization_id())
WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can delete messaging notification settings from their organization" ON messaging_notification_settings;
CREATE POLICY "Users can delete messaging notification settings from their organization"
ON messaging_notification_settings FOR DELETE
USING (organization_id = get_user_organization_id());
