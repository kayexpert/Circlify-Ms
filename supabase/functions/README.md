# Supabase Edge Functions for Messaging Module

This directory contains edge functions for processing birthday messages, event reminders, and recurring messages.

## Functions

### 1. process-birthday-messages

Processes birthday messages for members whose birthday is today. This function is multi-tenant aware and processes each organization separately with proper data isolation.

**Deployment:**
```bash
supabase functions deploy process-birthday-messages
```

**Scheduling:**
Set up a cron job to call this function daily at 6:00 AM UTC:
- In Supabase Dashboard: Go to Database → Cron Jobs
- Add a new cron job:
  - Name: `process_birthday_messages`
  - Schedule: `0 6 * * *` (daily at 6:00 AM UTC)
  - SQL:
    ```sql
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-birthday-messages',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
    ```

**Features:**
- Processes all organizations with birthday messages enabled
- Sends personalized messages using configured birthday template
- Respects organization-specific API configurations
- Multi-tenant data isolation

### 2. process-event-reminders

Processes event reminders for events with reminders enabled. Sends reminders based on `reminder_send_time`:
- `day_before`: sends reminders for events happening tomorrow
- `day_of`: sends reminders for events happening today

This function is multi-tenant aware and processes each organization separately with proper data isolation.

**Deployment:**
```bash
supabase functions deploy process-event-reminders
```

**Scheduling:**
Set up a cron job to call this function daily at 8:00 AM UTC:
- In Supabase Dashboard: Go to Database → Cron Jobs
- Add a new cron job:
  - Name: `process_event_reminders`
  - Schedule: `0 8 * * *` (daily at 8:00 AM UTC)
  - SQL:
    ```sql
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-event-reminders',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
    ```

**Features:**
- Processes events with `reminder_enabled = true`
- Respects `reminder_send_time` (day_before or day_of)
- Supports multiple recipient types:
  - `all_members`: sends to all active members
  - `groups`: sends to members in selected groups
  - `selected_members`: sends to specific selected members
- Multi-tenant data isolation
- Prevents duplicate reminders (checks if already sent today)

### 3. process-recurring-messages

Processes recurring messages that need to be sent based on their frequency.

**Deployment:**
```bash
supabase functions deploy process-recurring-messages
```

**Scheduling:**
Set up a cron job to call this function daily:
- In Supabase Dashboard: Go to Database → Cron Jobs
- Add a new cron job:
  - Name: `process_recurring_messages`
  - Schedule: `0 0 * * *` (daily at midnight UTC)
  - SQL:
    ```sql
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-recurring-messages',
      headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    );
    ```

**Features:**
- Processes recurring messages based on frequency (Weekly, Monthly, Yearly)
- Improved frequency logic with proper day windows
- Multi-tenant data isolation
- Respects recurrence end dates

## Environment Variables

Make sure these are set in your Supabase project:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (for bypassing RLS)

## Testing

You can test the functions locally using:
```bash
supabase functions serve process-birthday-messages
supabase functions serve process-event-reminders
supabase functions serve process-recurring-messages
```

Then call them with:
```bash
curl -X POST http://localhost:54321/functions/v1/process-birthday-messages \
  -H "Authorization: Bearer YOUR_ANON_KEY"

curl -X POST http://localhost:54321/functions/v1/process-event-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

You can test them by calling the functions directly via curl or by setting up cron jobs in Supabase.
