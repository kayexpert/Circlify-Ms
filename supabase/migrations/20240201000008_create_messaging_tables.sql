-- Migration: create_messaging_tables
-- Description: Create all Messaging module tables with indexes
-- Created: 2024-02-01
-- Priority: High - Messaging functionality

-- ============================================
-- Messaging Templates Table
-- ============================================

CREATE TABLE IF NOT EXISTS messaging_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messaging_templates_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_messaging_templates_org ON messaging_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_messaging_templates_name ON messaging_templates(name);

-- ============================================
-- Messaging API Configurations Table
-- ============================================

CREATE TABLE IF NOT EXISTS messaging_api_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  api_key TEXT NOT NULL, -- Encrypted in application layer
  sender_id VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messaging_api_configs_org_name_unique UNIQUE (organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_messaging_api_configs_org ON messaging_api_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_messaging_api_configs_active ON messaging_api_configurations(is_active) WHERE is_active = true;

-- ============================================
-- Messaging Messages Table
-- ============================================

CREATE TABLE IF NOT EXISTS messaging_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  message_name VARCHAR(255) NOT NULL,
  message_text TEXT NOT NULL,
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('individual', 'group', 'department', 'all_members')),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Draft', 'Scheduled', 'Sending', 'Sent', 'Failed', 'Cancelled')),
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_frequency VARCHAR(50) CHECK (recurrence_frequency IN ('Weekly', 'Monthly', 'Yearly')),
  recurrence_end_date DATE,
  template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  api_configuration_id UUID REFERENCES messaging_api_configurations(id) ON DELETE SET NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messaging_messages_org ON messaging_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_status ON messaging_messages(status);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_scheduled ON messaging_messages(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messaging_messages_sent ON messaging_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_created ON messaging_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messaging_messages_recurring ON messaging_messages(is_recurring, recurrence_frequency) WHERE is_recurring = true;

-- ============================================
-- Messaging Message Recipients Table
-- ============================================

CREATE TABLE IF NOT EXISTS messaging_message_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messaging_messages(id) ON DELETE CASCADE,
  recipient_type VARCHAR(50) NOT NULL CHECK (recipient_type IN ('member', 'group', 'department', 'phone_number')),
  recipient_id UUID, -- References member, group, or department ID
  phone_number VARCHAR(50), -- For direct phone number entries
  recipient_name VARCHAR(255), -- Denormalized for easier display
  personalized_message TEXT, -- Personalized version of the message
  status VARCHAR(50) NOT NULL CHECK (status IN ('Pending', 'Sending', 'Sent', 'Failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messaging_recipients_message ON messaging_message_recipients(message_id);
CREATE INDEX IF NOT EXISTS idx_messaging_recipients_status ON messaging_message_recipients(status);
CREATE INDEX IF NOT EXISTS idx_messaging_recipients_phone ON messaging_message_recipients(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messaging_recipients_recipient_id ON messaging_message_recipients(recipient_id) WHERE recipient_id IS NOT NULL;

-- ============================================
-- Messaging Notification Settings Table
-- ============================================

CREATE TABLE IF NOT EXISTS messaging_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  birthday_messages_enabled BOOLEAN DEFAULT FALSE,
  birthday_template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  contribution_notifications_enabled BOOLEAN DEFAULT FALSE,
  contribution_template_id UUID REFERENCES messaging_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT messaging_notification_settings_org_unique UNIQUE (organization_id)
);

CREATE INDEX IF NOT EXISTS idx_messaging_notification_settings_org ON messaging_notification_settings(organization_id);

-- ============================================
-- Update Triggers
-- ============================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_messaging_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_messaging_templates_updated_at
  BEFORE UPDATE ON messaging_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

CREATE TRIGGER update_messaging_api_configs_updated_at
  BEFORE UPDATE ON messaging_api_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

CREATE TRIGGER update_messaging_messages_updated_at
  BEFORE UPDATE ON messaging_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

CREATE TRIGGER update_messaging_notification_settings_updated_at
  BEFORE UPDATE ON messaging_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_messaging_updated_at();

-- Analyze tables for query planner
ANALYZE messaging_templates;
ANALYZE messaging_api_configurations;
ANALYZE messaging_messages;
ANALYZE messaging_message_recipients;
ANALYZE messaging_notification_settings;
