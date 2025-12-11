import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Log error to database for debugging
 */
async function logError(
  supabase: any,
  executionLogId: string,
  errorType: string,
  errorCategory: string,
  errorMessage: string,
  errorStack: string | undefined,
  contextData: Record<string, any>
) {
  try {
    await supabase.from("cron_job_error_details").insert({
      execution_log_id: executionLogId,
      error_type: errorType,
      error_category: errorCategory,
      error_message: errorMessage,
      error_stack: errorStack,
      context_data: contextData,
    } as never)
  } catch (insertError) {
    console.error("Failed to log error to database:", insertError)
    console.error("Original error:", {
      errorType,
      errorCategory,
      errorMessage,
      errorStack,
      contextData,
    })
  }
}

/**
 * Format phone number for Wigal API (233XXXXXXXXX format)
 */
function formatPhoneForWigal(phone: string): string {
  if (!phone) return ""
  
  let formatted = phone.replace(/\s+/g, "")
  
  if (formatted.startsWith("+")) {
    formatted = formatted.substring(1)
  }
  
  if (formatted.startsWith("0")) {
    formatted = "233" + formatted.substring(1)
  }
  
  if (!formatted.startsWith("233")) {
    formatted = "233" + formatted.replace(/^0+/, "")
  }
  
  return formatted
}

/**
 * Validate phone number format
 */
function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneForWigal(phone)
  return /^233\d{9}$/.test(formatted)
}

/**
 * Calculate next occurrence date for recurring events
 */
function calculateNextOccurrence(
  startDate: Date,
  frequency: string,
  currentDate: Date
): Date | null {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  
  const current = new Date(currentDate)
  current.setHours(0, 0, 0, 0)
  
  // If start date is in the future, return it
  if (start > current) {
    return start
  }
  
  let next = new Date(start)
  
  switch (frequency.toLowerCase()) {
    case "daily":
      // Find next occurrence after current date
      while (next <= current) {
        next.setDate(next.getDate() + 1)
      }
      return next
      
    case "weekly":
      // Find next occurrence on same weekday
      const targetDayOfWeek = start.getDay()
      const currentDayOfWeek = current.getDay()
      const daysUntilNext = (targetDayOfWeek - currentDayOfWeek + 7) % 7
      
      if (daysUntilNext === 0) {
        // Same day, check if start date is today or in past
        if (start <= current) {
          next.setDate(current.getDate() + 7)
        } else {
          next = new Date(start)
        }
      } else {
        next.setDate(current.getDate() + daysUntilNext)
      }
      return next
      
    case "monthly":
      // Find next occurrence on same day of month
      const targetDay = start.getDate()
      next = new Date(current)
      next.setDate(targetDay)
      
      // If date has passed this month, move to next month
      if (next <= current) {
        next.setMonth(next.getMonth() + 1)
        // Handle month-end edge cases (e.g., Jan 31 -> Feb 28/29)
        if (next.getDate() !== targetDay) {
          // Month doesn't have that many days, use last day of month
          next.setDate(0) // Go to last day of previous month
        }
      }
      return next
      
    case "yearly":
      // Find next occurrence on same month and day
      next = new Date(current)
      next.setMonth(start.getMonth())
      next.setDate(start.getDate())
      
      // If date has passed this year, move to next year
      if (next <= current) {
        next.setFullYear(next.getFullYear() + 1)
        // Handle leap year edge case (Feb 29)
        if (start.getMonth() === 1 && start.getDate() === 29 && next.getDate() !== 29) {
          next.setDate(28) // Use Feb 28 if not a leap year
        }
      }
      return next
      
    default:
      return null
  }
}

/**
 * Get all event occurrences that need reminders today
 */
function getEventOccurrences(
  event: any,
  today: Date,
  tomorrow: Date,
  yesterday: Date
): Array<{ occurrenceDate: Date; sendTime: string }> {
  const occurrences: Array<{ occurrenceDate: Date; sendTime: string }> = []
  
  if (!event.is_recurring) {
    // Non-recurring event
    const eventDate = new Date(event.event_date + "T00:00:00Z")
    eventDate.setHours(0, 0, 0, 0)
    
    const todayDate = new Date(today)
    todayDate.setHours(0, 0, 0, 0)
    
    // For "day_before": Send reminder today if event is tomorrow (event date = today + 1 day)
    // For "day_of": Send reminder today if event is today (event date = today)
    if (event.reminder_send_time === "day_before") {
      // Calculate what date the reminder should be sent (one day before event)
      const reminderSendDate = new Date(eventDate)
      reminderSendDate.setDate(reminderSendDate.getDate() - 1)
      reminderSendDate.setHours(0, 0, 0, 0)
      
      // Send reminder today if today is the reminder send date (one day before event)
      if (reminderSendDate.getTime() === todayDate.getTime()) {
        occurrences.push({ occurrenceDate: eventDate, sendTime: "day_before" })
      }
    } else if (event.reminder_send_time === "day_of" && eventDate.getTime() === todayDate.getTime()) {
      occurrences.push({ occurrenceDate: eventDate, sendTime: "day_of" })
    }
  } else {
    // Recurring event
    if (!event.recurrence_frequency) return occurrences
    
    const startDate = new Date(event.event_date + "T00:00:00Z")
    const nextOccurrence = calculateNextOccurrence(startDate, event.recurrence_frequency, today)
    
    if (!nextOccurrence) return occurrences
    
    // Check if there's an end date
    if (event.end_date) {
      const endDate = new Date(event.end_date + "T00:00:00Z")
      if (nextOccurrence > endDate) {
        return occurrences // Past end date
      }
    }
    
    const todayDate = new Date(today)
    todayDate.setHours(0, 0, 0, 0)
    
    const nextOccurrenceDate = new Date(nextOccurrence)
    nextOccurrenceDate.setHours(0, 0, 0, 0)
    
    // For "day_before": Send reminder today if today is one day before the next occurrence
    // For "day_of": Send reminder today if next occurrence is today
    if (event.reminder_send_time === "day_before") {
      // Calculate what date the reminder should be sent (one day before next occurrence)
      const reminderSendDate = new Date(nextOccurrenceDate)
      reminderSendDate.setDate(reminderSendDate.getDate() - 1)
      reminderSendDate.setHours(0, 0, 0, 0)
      
      // Send reminder today if today is the reminder send date (one day before next occurrence)
      if (reminderSendDate.getTime() === todayDate.getTime()) {
        occurrences.push({ occurrenceDate: nextOccurrence, sendTime: "day_before" })
      }
    } else if (event.reminder_send_time === "day_of" && nextOccurrenceDate.getTime() === todayDate.getTime()) {
      occurrences.push({ occurrenceDate: nextOccurrence, sendTime: "day_of" })
    }
  }
  
  return occurrences
}

/**
 * Process event reminders for all organizations
 * This function should be called daily to send event reminders based on reminder_send_time
 * Multi-tenant: Processes each organization separately with proper data isolation
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const executionStartTime = Date.now()
  let executionLogId: string | null = null
  let supabase: any = null

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    console.log("[EVENT-REMINDER-CRON] Starting event reminder processing")
    console.log("[EVENT-REMINDER-CRON] Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = "Missing Supabase environment variables"
      console.error("[EVENT-REMINDER-CRON] FATAL ERROR:", errorMsg)
      throw new Error(errorMsg)
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create execution log entry
    const { data: executionLog, error: logInsertError } = await supabase
      .from("cron_job_execution_logs")
      .insert({
        job_name: "process_event_reminders",
        status: "running",
        execution_started_at: new Date().toISOString(),
      } as never)
      .select()
      .single()

    if (logInsertError) {
      console.error("[EVENT-REMINDER-CRON] Failed to create execution log:", logInsertError)
    } else {
      executionLogId = executionLog.id
      console.log("[EVENT-REMINDER-CRON] Execution log created:", executionLogId)
    }

    // Get current date in UTC
    const today = new Date()
    const todayUTC = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    ))
    const todayDateString = todayUTC.toISOString().split("T")[0]
    
    const tomorrow = new Date(todayUTC)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowDateString = tomorrow.toISOString().split("T")[0]
    
    const yesterday = new Date(todayUTC)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayDateString = yesterday.toISOString().split("T")[0]

    console.log("[EVENT-REMINDER-CRON] Date information:", {
      todayISO: today.toISOString(),
      todayUTC: todayUTC.toISOString(),
      todayDateString,
      tomorrowDateString,
    })

    // Find all events with reminders enabled
    console.log("[EVENT-REMINDER-CRON] Fetching events with reminders enabled...")
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(`
        *,
        organizations!inner (id, name)
      `)
      .eq("reminder_enabled", true)
      .not("reminder_send_time", "is", null)
      .not("reminder_recipient_type", "is", null)

    if (eventsError) {
      const errorMsg = `Error fetching events: ${JSON.stringify(eventsError)}`
      console.error("[EVENT-REMINDER-CRON] FATAL ERROR:", errorMsg)
      
      if (executionLogId) {
        await logError(
          supabase,
          executionLogId,
          "database",
          "query_failure",
          errorMsg,
          eventsError.stack || undefined,
          { step: "fetch_events" }
        )
      }
      
      throw eventsError
    }

    console.log("[EVENT-REMINDER-CRON] Found events:", {
      count: events?.length || 0,
      events: events?.map((e: any) => ({
        id: e.id,
        name: e.name,
        isRecurring: e.is_recurring,
        frequency: e.recurrence_frequency,
        sendTime: e.reminder_send_time,
      })),
    })

    if (!events || events.length === 0) {
      const result = {
        message: "No events with reminders enabled",
        count: 0,
        date: todayDateString,
      }
      
      console.log("[EVENT-REMINDER-CRON] No events to process:", result)
      
      if (executionLogId) {
        await supabase
          .from("cron_job_execution_logs")
          .update({
            status: "success",
            execution_completed_at: new Date().toISOString(),
            duration_ms: Date.now() - executionStartTime,
            total_processed: 0,
            total_success: 0,
            total_errors: 0,
            execution_details: result,
          } as never)
          .eq("id", executionLogId)
      }
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    let totalSent = 0
    let totalErrors = 0
    let totalProcessed = 0
    const processedEvents: string[] = []
    const errors: Array<{ eventId?: string; error: string }> = []

    // Process each event
    for (const event of events) {
      const organization = (event as any).organizations
      if (!organization) {
        console.warn("[EVENT-REMINDER-CRON] Event missing organization:", event.id)
        continue
      }

      const orgId = organization.id
      const orgName = organization.name
      const eventId = event.id
      const eventName = event.name
      
      console.log(`[EVENT-REMINDER-CRON] Processing event: ${eventName} (${eventId})`)

      try {
        // Get event occurrences that need reminders today
        const occurrences = getEventOccurrences(event, todayUTC, tomorrow, yesterday)
        
        console.log(`[EVENT-REMINDER-CRON] [${eventName}] Event details:`, {
          event_date: event.event_date,
          reminder_send_time: event.reminder_send_time,
          is_recurring: event.is_recurring,
          recurrence_frequency: event.recurrence_frequency,
          end_date: event.end_date,
        })
        console.log(`[EVENT-REMINDER-CRON] [${eventName}] Date context:`, {
          today: todayDateString,
          tomorrow: tomorrowDateString,
          yesterday: yesterdayDateString,
        })
        console.log(`[EVENT-REMINDER-CRON] [${eventName}] Found ${occurrences.length} occurrences to process`)

        if (occurrences.length === 0) {
          const reason = !event.is_recurring
            ? `Event date (${event.event_date}) doesn't match reminder timing. For "day_before", today (${todayDateString}) must be one day before the event date. For "day_of", event date must be TODAY (${todayDateString}).`
            : `No recurring occurrences match today's date for reminder timing.`
          console.log(`[EVENT-REMINDER-CRON] [${eventName}] No occurrences need reminders today. Reason: ${reason}`)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "validation",
              "no_matching_occurrences",
              reason,
              undefined,
              { 
                step: "check_occurrences", 
                organization_id: orgId, 
                event_id: eventId, 
                event_date: event.event_date,
                reminder_send_time: event.reminder_send_time,
                today: todayDateString,
                tomorrow: tomorrowDateString
              }
            )
          }
          continue
        }

        // Get active API configuration (once per event, not per occurrence)
        console.log(`[EVENT-REMINDER-CRON] [${eventName}] Fetching API configuration...`)
        const { data: apiConfig, error: apiError } = await supabase
          .from("messaging_api_configurations")
          .select("*")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .maybeSingle()

        if (apiError || !apiConfig) {
          const errorMsg = `No active API config for org ${orgId}`
          console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "validation",
              "missing_api_config",
              errorMsg,
              undefined,
              { step: "fetch_api_config", organization_id: orgId, event_id: eventId }
            )
          }
          
          errors.push({ eventId, error: errorMsg })
          totalErrors++
          continue
        }

        if (!apiConfig.api_key || !apiConfig.sender_id) {
          const errorMsg = `Invalid API config for org ${orgId}: missing api_key or sender_id`
          console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "validation",
              "invalid_api_config",
              errorMsg,
              undefined,
              { step: "validate_api_config", organization_id: orgId, event_id: eventId }
            )
          }
          
          errors.push({ eventId, error: errorMsg })
          totalErrors++
          continue
        }

        // Get recipients (once per event, not per occurrence - more efficient)
        console.log(`[EVENT-REMINDER-CRON] [${eventName}] Fetching recipients (type: ${event.reminder_recipient_type})...`)
        let recipients: Array<{ id: string; phone_number: string; first_name: string; last_name: string }> = []

        if (event.reminder_recipient_type === "all_members") {
            // Get ALL members (active AND inactive)
          const { data: members, error: membersError } = await supabase
            .from("members")
            .select("id, first_name, last_name, phone_number")
              .eq("organization_id", orgId)
            .not("phone_number", "is", null)

          if (membersError) {
              const errorMsg = `Error fetching members: ${JSON.stringify(membersError)}`
              console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "query_failure",
                  errorMsg,
                  membersError.stack || undefined,
                  { step: "fetch_members", organization_id: orgId, event_id: eventId, recipient_type: "all_members" }
                )
              }
              
              errors.push({ eventId, error: errorMsg })
            totalErrors++
            continue
          }

            recipients = (members || []) as any[]
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Found ${recipients.length} members (all statuses)`)
          } else if (event.reminder_recipient_type === "groups") {
            const recipientIdsRaw = Array.isArray(event.reminder_recipient_ids) 
              ? event.reminder_recipient_ids 
              : event.reminder_recipient_ids ? [event.reminder_recipient_ids] : []

            // Filter out invalid UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            const recipientIds = recipientIdsRaw.filter((id: any) => {
              const idStr = String(id)
              return uuidRegex.test(idStr)
            })

            if (recipientIds.length === 0) {
              console.log(`[EVENT-REMINDER-CRON] [${eventName}] No valid group IDs specified (filtered ${recipientIdsRaw.length - recipientIds.length} invalid IDs)`)
              if (recipientIdsRaw.length > 0) {
                console.warn(`[EVENT-REMINDER-CRON] [${eventName}] Invalid group IDs found:`, recipientIdsRaw)
              }
              continue
            }

            if (recipientIdsRaw.length !== recipientIds.length) {
              console.warn(`[EVENT-REMINDER-CRON] [${eventName}] Filtered out ${recipientIdsRaw.length - recipientIds.length} invalid UUIDs from recipient_ids`)
            }

            // Get group names
            const { data: groups, error: groupsError } = await supabase
              .from("groups")
              .select("id, name")
              .eq("organization_id", orgId)
              .in("id", recipientIds)
              .eq("status", "Active")

            if (groupsError || !groups || groups.length === 0) {
              const errorMsg = `Error fetching groups: ${JSON.stringify(groupsError)}`
              console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "query_failure",
                  errorMsg,
                  groupsError?.stack || undefined,
                  { step: "fetch_groups", organization_id: orgId, event_id: eventId, group_ids: recipientIds }
                )
              }
              
              errors.push({ eventId, error: errorMsg })
              totalErrors++
              continue
            }

            const groupNames = groups.map((g: any) => g.name)
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Found groups: ${groupNames.join(", ")}`)

            // Get members in these groups (active AND inactive)
            const { data: members, error: membersError } = await supabase
              .from("members")
              .select("id, first_name, last_name, phone_number")
              .eq("organization_id", orgId)
              .not("phone_number", "is", null)
              .overlaps("groups", groupNames)

            if (membersError) {
              const errorMsg = `Error fetching group members: ${JSON.stringify(membersError)}`
              console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "query_failure",
                  errorMsg,
                  membersError.stack || undefined,
                  { step: "fetch_group_members", organization_id: orgId, event_id: eventId, group_names: groupNames }
                )
              }
              
              errors.push({ eventId, error: errorMsg })
              totalErrors++
              continue
            }

            recipients = (members || []) as any[]
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Found ${recipients.length} members in groups`)
        } else if (event.reminder_recipient_type === "selected_members") {
          const recipientIdsRaw = Array.isArray(event.reminder_recipient_ids) 
            ? event.reminder_recipient_ids 
            : event.reminder_recipient_ids ? [event.reminder_recipient_ids] : []

          // Filter out invalid UUIDs (UUIDs must be in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          const recipientIds = recipientIdsRaw.filter((id: any) => {
            const idStr = String(id)
            return uuidRegex.test(idStr)
          })

          if (recipientIds.length === 0) {
            const errorMsg = `No valid member UUIDs found. ${recipientIdsRaw.length} invalid ID(s) were filtered out: ${JSON.stringify(recipientIdsRaw)}. Please re-select members in the event settings.`
            console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
            if (recipientIdsRaw.length > 0) {
              console.warn(`[EVENT-REMINDER-CRON] [${eventName}] Invalid recipient IDs found:`, recipientIdsRaw)
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "validation",
                  "invalid_uuid_in_recipient_ids",
                  errorMsg,
                  undefined,
                  { 
                    step: "validate_member_ids", 
                    organization_id: orgId, 
                    event_id: eventId, 
                    invalid_ids: recipientIdsRaw,
                    total_invalid: recipientIdsRaw.length,
                    message: "All recipient IDs are invalid. Event needs to be updated with valid UUID member IDs."
                  }
                )
              }
            }
            errors.push({ eventId, error: errorMsg })
            totalErrors++
            continue
          }

          if (recipientIdsRaw.length !== recipientIds.length) {
            console.warn(`[EVENT-REMINDER-CRON] [${eventName}] Filtered out ${recipientIdsRaw.length - recipientIds.length} invalid UUIDs from recipient_ids`)
          }

          const { data: members, error: membersError } = await supabase
            .from("members")
            .select("id, first_name, last_name, phone_number")
            .eq("organization_id", orgId)
            .in("id", recipientIds)
            .not("phone_number", "is", null)

            if (membersError) {
              const errorMsg = `Error fetching selected members: ${JSON.stringify(membersError)}`
              console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "query_failure",
                  errorMsg,
                  membersError.stack || undefined,
                  { step: "fetch_selected_members", organization_id: orgId, event_id: eventId, member_ids: recipientIds }
                )
              }
              
              errors.push({ eventId, error: errorMsg })
              totalErrors++
              continue
            }

            recipients = (members || []) as any[]
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Found ${recipients.length} selected members`)
        }

        if (recipients.length === 0) {
          const reason = event.reminder_recipient_type === "selected_members"
            ? "No valid member UUIDs found or members don't have phone numbers"
            : event.reminder_recipient_type === "groups"
            ? "No members found in selected groups or members don't have phone numbers"
            : "No members found in organization or members don't have phone numbers"
          
          console.log(`[EVENT-REMINDER-CRON] [${eventName}] No recipients found. Reason: ${reason}`)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "validation",
              "no_recipients_found",
              reason,
              undefined,
              { 
                step: "fetch_recipients", 
                organization_id: orgId, 
                event_id: eventId,
                recipient_type: event.reminder_recipient_type,
                recipient_ids: event.reminder_recipient_ids
              }
            )
          }
          continue
        }

        console.log(`[EVENT-REMINDER-CRON] [${eventName}] Found ${recipients.length} recipients to process`)

        // Process each occurrence
        for (const occurrence of occurrences) {
          const occurrenceDateString = occurrence.occurrenceDate.toISOString().split("T")[0]
          
          console.log(`[EVENT-REMINDER-CRON] [${eventName}] Processing occurrence: ${occurrenceDateString} (${occurrence.sendTime})`)

          // Check if reminder already sent for this occurrence
          const { data: existingLog, error: logCheckError } = await supabase
            .from("event_reminder_sent_logs")
            .select("id")
            .eq("event_id", eventId)
            .eq("occurrence_date", occurrenceDateString)
            .eq("reminder_send_time", occurrence.sendTime)
            .maybeSingle()

          if (logCheckError) {
            console.error(`[EVENT-REMINDER-CRON] [${eventName}] Error checking sent log:`, logCheckError)
            if (executionLogId) {
              await logError(
                supabase,
                executionLogId,
                "database",
                "query_failure",
                `Error checking sent log: ${JSON.stringify(logCheckError)}`,
                logCheckError.stack || undefined,
                { step: "check_sent_log", event_id: eventId, occurrence_date: occurrenceDateString }
              )
            }
          }

          if (existingLog) {
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Reminder already sent for ${occurrenceDateString} (${occurrence.sendTime}), skipping`)
            continue
          }

          totalProcessed += recipients.length

          // Get message template or use custom/default message
          let messageText: string | null = null
          
          if (event.reminder_template_id) {
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Fetching template: ${event.reminder_template_id}`)
            const { data: template, error: templateError } = await supabase
              .from("messaging_templates")
              .select("message")
              .eq("id", event.reminder_template_id)
              .eq("organization_id", orgId)
              .maybeSingle()

            if (templateError) {
              console.warn(`[EVENT-REMINDER-CRON] [${eventName}] Error fetching template:`, templateError)
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "query_failure",
                  `Error fetching template: ${JSON.stringify(templateError)}`,
                  templateError.stack || undefined,
                  { step: "fetch_template", organization_id: orgId, event_id: eventId, template_id: event.reminder_template_id }
                )
              }
            } else if (template) {
              messageText = template.message
              console.log(`[EVENT-REMINDER-CRON] [${eventName}] Template loaded, length: ${messageText.length}`)
            }
          }

          if (!messageText && event.reminder_message_text) {
            messageText = event.reminder_message_text
            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Using custom message, length: ${messageText.length}`)
          }

          if (!messageText) {
            // Default message
            const eventDate = new Date(occurrence.occurrenceDate)
        const eventDateFormatted = eventDate.toLocaleDateString("en-US", { 
          weekday: "long", 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })

            messageText = `Reminder: ${event.name}`
        if (event.description) {
          messageText += `\n${event.description}`
        }
        messageText += `\nDate: ${eventDateFormatted}`
            if (event.event_time) {
              messageText += `\nTime: ${event.event_time}`
            }
        if (event.location) {
          messageText += `\nLocation: ${event.location}`
        }
        messageText += `\n\nWe look forward to seeing you there!`

            console.log(`[EVENT-REMINDER-CRON] [${eventName}] Using default message`)
          }

        // Create message record
          const eventMessageName = `Event Reminder - ${event.name} - ${occurrenceDateString}`
          console.log(`[EVENT-REMINDER-CRON] [${eventName}] Creating message record...`)
          
        const { data: message, error: messageError } = await supabase
          .from("messaging_messages")
          .insert({
              organization_id: orgId,
            message_name: eventMessageName,
            message_text: messageText,
            recipient_type: recipients.length === 1 ? "individual" : "group",
            recipient_count: recipients.length,
            status: "Sending",
              template_id: event.reminder_template_id || null,
            api_configuration_id: apiConfig.id,
              cost: recipients.length * 0.10,
              created_by: null,
          } as never)
          .select()
          .single()

        if (messageError || !message) {
            const errorMsg = `Error creating message: ${JSON.stringify(messageError)}`
            console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
            
            if (executionLogId) {
              await logError(
                supabase,
                executionLogId,
                "database",
                "insert_failure",
                errorMsg,
                messageError?.stack || undefined,
                { step: "create_message", organization_id: orgId, event_id: eventId }
              )
            }
            
            errors.push({ eventId, error: errorMsg })
            totalErrors += recipients.length
          continue
        }

          console.log(`[EVENT-REMINDER-CRON] [${eventName}] Message created: ${message.id}`)

          // Process recipients and send SMS
          let sentCount = 0
          let errorCount = 0

        for (const recipient of recipients) {
            try {
              const formattedPhone = formatPhoneForWigal(recipient.phone_number)
              
              if (!validatePhoneNumber(formattedPhone)) {
                console.error(`[EVENT-REMINDER-CRON] [${eventName}] Invalid phone: ${recipient.phone_number} -> ${formattedPhone}`)
                errorCount++
                continue
              }

              // Format event date for placeholder
              const eventDateForPlaceholder = new Date(occurrence.occurrenceDate)
              const formattedEventDate = eventDateForPlaceholder.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })

              // Personalize message
              let personalizedMessage = messageText
                .replace(/\{EventName\}/gi, event.name)
                .replace(/\{EventDate\}/gi, formattedEventDate)
                .replace(/\{EventTime\}/gi, event.event_time || "")
                .replace(/\{Location\}/gi, event.location || "")
                .replace(/\{Description\}/gi, event.description || "")
                .replace(/\{FirstName\}/gi, recipient.first_name || "")
                .replace(/\{LastName\}/gi, recipient.last_name || "")
                .replace(/\{first_name\}/gi, recipient.first_name || "")
                .replace(/\{last_name\}/gi, recipient.last_name || "")

              // Create recipient record
              const { error: recipientError } = await supabase
                .from("messaging_message_recipients")
                .insert({
            message_id: message.id,
            recipient_type: "member",
            recipient_id: recipient.id,
            phone_number: formattedPhone,
            recipient_name: `${recipient.first_name} ${recipient.last_name}`,
                  personalized_message: personalizedMessage,
            status: "Pending",
            cost: 0.10,
                } as never)

              if (recipientError) {
                console.error(`[EVENT-REMINDER-CRON] [${eventName}] Error creating recipient:`, recipientError)
                errorCount++
                continue
              }

              // Send SMS via Wigal FROG API
              const payload = {
                senderid: apiConfig.sender_id,
                destinations: [{
                  destination: formattedPhone,
                  message: personalizedMessage,
                  msgid: `EVT_${message.id}_${recipient.id}_${Date.now()}`,
                  smstype: "text",
                }],
              }

              const apiStartTime = Date.now()
              let response: Response
              let result: any

              try {
                response = await fetch("https://frogapi.wigal.com.gh/api/v3/sms/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                    "API-KEY": apiConfig.api_key,
                    "USERNAME": apiConfig.username || apiConfig.api_key,
                  },
                  body: JSON.stringify(payload),
                  signal: AbortSignal.timeout(30000),
                })

                const apiDuration = Date.now() - apiStartTime
                console.log(`[EVENT-REMINDER-CRON] [${eventName}] API response in ${apiDuration}ms:`, {
                  status: response.status,
                  ok: response.ok,
                })

                const contentType = response.headers.get("content-type")
                if (contentType && contentType.includes("application/json")) {
                  try {
                    result = await response.json()
                  } catch (parseError) {
                    const textResponse = await response.text()
                    const errorMsg = `Error parsing response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response: ${textResponse}`
                    console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
                    
                    if (executionLogId) {
                      await logError(
                        supabase,
                        executionLogId,
                        "api",
                        "response_parse_error",
                        errorMsg,
                        parseError instanceof Error ? parseError.stack : undefined,
                        { step: "parse_api_response", event_id: eventId, message_id: message.id, response_text: textResponse }
                      )
                    }
                    
                    result = { error: { message: errorMsg } }
                  }
                } else {
                  const textResponse = await response.text()
                  result = { error: { message: `Unexpected content type: ${contentType}. Response: ${textResponse}` } }
                }
              } catch (fetchError) {
                const errorMsg = `Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
                console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
                
                if (executionLogId) {
                  await logError(
                    supabase,
                    executionLogId,
                    "network",
                    fetchError instanceof Error && fetchError.name === "TimeoutError" ? "timeout" : "network_error",
                    errorMsg,
                    fetchError instanceof Error ? fetchError.stack : undefined,
                    { step: "api_call", event_id: eventId, message_id: message.id }
                  )
                }
                
                result = { error: { message: errorMsg } }
                response = { ok: false, status: 0 } as Response
              }

              // Check success
              const responseMessage = result?.message || result?.error?.message || ""
              const isAcceptedMessage = responseMessage.toLowerCase().includes("accepted") || 
                                       responseMessage.toLowerCase().includes("processing") ||
                                       responseMessage.toLowerCase().includes("sent")
              
              const isSuccess = response.ok && (
                result?.status === "success" ||
                result?.status === "SUCCESS" ||
                result?.success === true || 
                isAcceptedMessage ||
                (result?.data && !result?.error)
              )

              if (isSuccess) {
          await supabase
            .from("messaging_message_recipients")
            .update({
              status: "Sent",
                    sent_at: new Date().toISOString(),
            } as never)
            .eq("message_id", message.id)
                  .eq("recipient_id", recipient.id)

                sentCount++
        } else {
                const errorMessage = result?.error?.message || result?.error || result?.message || `HTTP ${response.status}`

          await supabase
            .from("messaging_message_recipients")
            .update({
              status: "Failed",
              error_message: errorMessage,
            } as never)
            .eq("message_id", message.id)
                  .eq("recipient_id", recipient.id)

                errorCount++
                
                if (executionLogId) {
                  await logError(
                    supabase,
                    executionLogId,
                    "api",
                    "send_failure",
                    errorMessage,
                    undefined,
                    { step: "send_sms", event_id: eventId, message_id: message.id, phone: formattedPhone, api_response: result }
                  )
                }
              }
            } catch (error) {
              const errorMsg = `Error processing recipient ${recipient.id}: ${error instanceof Error ? error.message : String(error)}`
              console.error(`[EVENT-REMINDER-CRON] [${eventName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "unknown",
                  "recipient_processing_error",
                  errorMsg,
                  error instanceof Error ? error.stack : undefined,
                  { step: "process_recipient", event_id: eventId, recipient_id: recipient.id }
                )
              }
              
              errorCount++
            }
          }

          // Update message status
          if (sentCount > 0) {
            await supabase
              .from("messaging_messages")
              .update({
                status: errorCount === 0 ? "Sent" : "Sending",
                sent_at: sentCount === recipients.length ? new Date().toISOString() : null,
              } as never)
              .eq("id", message.id)

            // Create sent log entry
            await supabase
              .from("event_reminder_sent_logs")
              .insert({
                event_id: eventId,
                occurrence_date: occurrenceDateString,
                reminder_send_time: occurrence.sendTime,
                message_id: message.id,
                recipient_count: sentCount,
              } as never)

            totalSent += sentCount
            if (!processedEvents.includes(eventId)) {
              processedEvents.push(eventId)
            }
          }

          if (errorCount > 0) {
            await supabase
              .from("messaging_messages")
              .update({
                status: sentCount === 0 ? "Failed" : "Sending",
                error_message: `${errorCount} recipients failed`,
              } as never)
              .eq("id", message.id)

            totalErrors += errorCount
          }

          console.log(`[EVENT-REMINDER-CRON] [${eventName}] Occurrence processed: ${sentCount} sent, ${errorCount} errors`)
        }
      } catch (error) {
        const errorMsg = `Error processing event ${eventId}: ${error instanceof Error ? error.message : String(error)}`
        console.error(`[EVENT-REMINDER-CRON] [${eventName}] FATAL ERROR:`, errorMsg, error)
        
        if (executionLogId) {
          await logError(
            supabase,
            executionLogId,
            "unknown",
            "event_processing_error",
            errorMsg,
            error instanceof Error ? error.stack : undefined,
            { step: "process_event", organization_id: orgId, event_id: eventId, event_name: eventName }
          )
        }
        
        errors.push({ eventId, error: errorMsg })
        totalErrors++
      }
    }

    const executionDuration = Date.now() - executionStartTime
    const finalStatus = totalErrors > 0 && totalSent === 0 ? "failed" : totalErrors > 0 ? "partial" : "success"
    
    const result = {
        message: "Event reminders processed",
        sent: totalSent,
        errors: totalErrors,
      processed: totalProcessed,
        eventsProcessed: processedEvents.length,
      date: todayDateString,
      duration_ms: executionDuration,
      status: finalStatus,
    }

    console.log("[EVENT-REMINDER-CRON] Execution completed:", result)

    // Update execution log
    if (executionLogId) {
      await supabase
        .from("cron_job_execution_logs")
        .update({
          status: finalStatus,
          execution_completed_at: new Date().toISOString(),
          duration_ms: executionDuration,
          total_processed: totalProcessed,
          total_success: totalSent,
          total_errors: totalErrors,
          error_message: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null,
          error_details: errors.length > 0 ? { errors: errors.slice(0, 10), total_errors: errors.length } : null,
          execution_details: {
            events_found: events.length,
            events_processed: processedEvents.length,
            date: todayDateString,
          },
          response_data: result,
        } as never)
        .eq("id", executionLogId)
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    const executionDuration = Date.now() - executionStartTime
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    const errorStack = error instanceof Error ? error.stack : undefined
    
    console.error("[EVENT-REMINDER-CRON] FATAL ERROR:", errorMsg, error)
    
    if (executionLogId && supabase) {
      try {
        await supabase
          .from("cron_job_execution_logs")
          .update({
            status: "failed",
            execution_completed_at: new Date().toISOString(),
            duration_ms: executionDuration,
            error_message: errorMsg,
            error_stack: errorStack,
            error_details: {
              error_type: error instanceof Error ? error.constructor.name : "Unknown",
              error_message: errorMsg,
            },
          } as never)
          .eq("id", executionLogId)
      } catch (updateError) {
        console.error("[EVENT-REMINDER-CRON] Failed to update execution log:", updateError)
      }
    }

    return new Response(
      JSON.stringify({ 
        error: errorMsg,
        stack: errorStack,
        duration_ms: executionDuration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
