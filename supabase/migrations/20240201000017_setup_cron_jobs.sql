-- ============================================
-- Setup Cron Jobs for Birthday and Event Reminders
-- ============================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Note: These cron jobs need to be set up manually in Supabase Dashboard
-- or via Supabase CLI. The SQL below shows the recommended schedule.

-- ============================================
-- Cron Job 1: Process Birthday Messages
-- ============================================
-- Schedule: Daily at 6:00 AM UTC
-- This will send birthday messages to members whose birthday is today
-- 
-- To set up manually in Supabase Dashboard:
-- 1. Go to Database → Cron Jobs
-- 2. Add new cron job:
--    - Name: process_birthday_messages
--    - Schedule: 0 6 * * * (daily at 6:00 AM UTC)
--    - SQL:
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-birthday-messages',
--        headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--
-- Or via SQL (replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY):
-- SELECT cron.schedule(
--   'process_birthday_messages',
--   '0 6 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-birthday-messages',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- Cron Job 2: Process Event Reminders
-- ============================================
-- Schedule: Daily at 8:00 AM UTC
-- This will send event reminders based on reminder_send_time:
-- - "day_before": sends reminders for events happening tomorrow
-- - "day_of": sends reminders for events happening today
--
-- To set up manually in Supabase Dashboard:
-- 1. Go to Database → Cron Jobs
-- 2. Add new cron job:
--    - Name: process_event_reminders
--    - Schedule: 0 8 * * * (daily at 8:00 AM UTC)
--    - SQL:
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-event-reminders',
--        headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--
-- Or via SQL (replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY):
-- SELECT cron.schedule(
--   'process_event_reminders',
--   '0 8 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-event-reminders',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- Cron Job 3: Process Recurring Messages
-- ============================================
-- Schedule: Daily at midnight UTC
-- This will process recurring messages that need to be sent based on their frequency
--
-- To set up manually in Supabase Dashboard:
-- 1. Go to Database → Cron Jobs
-- 2. Add new cron job:
--    - Name: process_recurring_messages
--    - Schedule: 0 0 * * * (daily at midnight UTC)
--    - SQL:
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recurring-messages',
--        headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--
-- Or via SQL (replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY):
-- SELECT cron.schedule(
--   'process_recurring_messages',
--   '0 0 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recurring-messages',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- Cron Job 4: Process Scheduled Messages
-- ============================================
-- Schedule: Every 15 minutes
-- This will process scheduled messages that are due to be sent
--
-- To set up manually in Supabase Dashboard:
-- 1. Go to Database → Cron Jobs
-- 2. Add new cron job:
--    - Name: process_scheduled_messages
--    - Schedule: */15 * * * * (every 15 minutes)
--    - SQL:
--      SELECT net.http_post(
--        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-scheduled-messages',
--        headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--      );
--
-- Or via SQL (replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY):
-- SELECT cron.schedule(
--   'process_scheduled_messages',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-scheduled-messages',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- Helper Function: Get Cron Job Status
-- ============================================
-- This function can be used to check if cron jobs are running
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule::text,
    j.command::text,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  WHERE j.jobname IN (
    'process_birthday_messages', 
    'process_event_reminders',
    'process_recurring_messages',
    'process_scheduled_messages'
  )
  ORDER BY j.jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_cron_job_status() TO authenticated;

-- ============================================
-- Comments
-- ============================================
COMMENT ON FUNCTION get_cron_job_status() IS 'Returns the status of all messaging cron jobs (birthday messages, event reminders, recurring messages, and scheduled messages)';

