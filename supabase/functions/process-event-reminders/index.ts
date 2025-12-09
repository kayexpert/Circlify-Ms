import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Process event reminders for all organizations
 * This function should be called daily to send event reminders based on reminder_send_time
 * Multi-tenant: Processes each organization separately with proper data isolation
 */
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date
    const today = new Date()
    const todayDate = today.toISOString().split("T")[0]
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split("T")[0]

    console.log(`Processing event reminders at ${today.toISOString()}`)
    console.log(`Today: ${todayDate}, Tomorrow: ${tomorrowDate}`)

    // Find all events with reminders enabled that need to be sent today
    // For "day_before": event_date is tomorrow
    // For "day_of": event_date is today
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(`
        *,
        organizations!inner (id, name)
      `)
      .eq("reminder_enabled", true)
      .not("reminder_send_time", "is", null)
      .not("reminder_recipient_type", "is", null)
      .or(`and(event_date.eq.${tomorrowDate},reminder_send_time.eq.day_before),and(event_date.eq.${todayDate},reminder_send_time.eq.day_of)`)

    if (eventsError) {
      console.error("Error fetching events:", eventsError)
      throw eventsError
    }

    if (!events || events.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No event reminders to process", 
          count: 0,
          date: todayDate 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    console.log(`Found ${events.length} events with reminders to process`)

    let totalSent = 0
    let totalErrors = 0
    const processedEvents: string[] = []

    // Process each event (grouped by organization for multi-tenant isolation)
    for (const event of events) {
      const organization = (event as any).organizations
      if (!organization) {
        console.warn(`Event ${event.id} has no organization, skipping`)
        continue
      }

      // Skip if we've already processed this event today
      // Check if a message was already created for this event today
      const eventMessageName = `Event Reminder - ${event.name}`
      const { data: existingMessage } = await supabase
        .from("messaging_messages")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("message_name", eventMessageName)
        .gte("created_at", todayDate)
        .limit(1)

      if (existingMessage && existingMessage.length > 0) {
        console.log(`Event ${event.id} already processed today, skipping`)
        continue
      }

      try {
        // Get active API configuration for this organization
        const { data: apiConfig, error: apiError } = await supabase
          .from("messaging_api_configurations")
          .select("*")
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .maybeSingle()

        if (apiError || !apiConfig) {
          console.error(`No active API config for org ${organization.id}, event ${event.id}`)
          totalErrors++
          continue
        }

        // Get recipients based on reminder_recipient_type
        let recipients: Array<{ id: string; phone_number: string; first_name: string; last_name: string }> = []

        if (event.reminder_recipient_type === "all_members") {
          // Get all active members
          const { data: members, error: membersError } = await supabase
            .from("members")
            .select("id, first_name, last_name, phone_number")
            .eq("organization_id", organization.id)
            .eq("membership_status", "active")
            .not("phone_number", "is", null)

          if (membersError) {
            console.error(`Error fetching members for org ${organization.id}:`, membersError)
            totalErrors++
            continue
          }

          if (members && members.length > 0) {
            recipients = members as any[]
          }
        } else if (event.reminder_recipient_type === "groups") {
          // Get members from selected groups
          // Note: Groups are stored as an array of group names in the members table
          // We need to get group names from group IDs first
          const recipientIds = Array.isArray(event.reminder_recipient_ids) 
            ? event.reminder_recipient_ids 
            : event.reminder_recipient_ids ? [event.reminder_recipient_ids] : []

          if (recipientIds.length > 0) {
            // First, get group names from group IDs
            const { data: groups, error: groupsError } = await supabase
              .from("groups")
              .select("id, name")
              .eq("organization_id", organization.id)
              .in("id", recipientIds)
              .eq("status", "Active")

            if (groupsError || !groups || groups.length === 0) {
              console.error(`Error fetching groups for org ${organization.id}:`, groupsError)
              totalErrors++
              continue
            }

            const groupNames = groups.map((g: any) => g.name)

            // Get members whose groups array contains any of the selected group names
            // Using array overlap operator (&&) to check if groups array contains any of the group names
            const { data: members, error: membersError } = await supabase
              .from("members")
              .select("id, first_name, last_name, phone_number")
              .eq("organization_id", organization.id)
              .eq("membership_status", "active")
              .not("phone_number", "is", null)
              .overlaps("groups", groupNames)

            if (membersError) {
              console.error(`Error fetching group members for org ${organization.id}:`, membersError)
              totalErrors++
              continue
            }

            if (members && members.length > 0) {
              recipients = members as any[]
            }
          }
        } else if (event.reminder_recipient_type === "selected_members") {
          // Get selected members
          const recipientIds = Array.isArray(event.reminder_recipient_ids) 
            ? event.reminder_recipient_ids 
            : event.reminder_recipient_ids ? [event.reminder_recipient_ids] : []

          if (recipientIds.length > 0) {
            const { data: members, error: membersError } = await supabase
              .from("members")
              .select("id, first_name, last_name, phone_number")
              .eq("organization_id", organization.id)
              .in("id", recipientIds)
              .not("phone_number", "is", null)

            if (membersError) {
              console.error(`Error fetching selected members for org ${organization.id}:`, membersError)
              totalErrors++
              continue
            }

            if (members && members.length > 0) {
              recipients = members as any[]
            }
          }
        }

        if (recipients.length === 0) {
          console.log(`No recipients found for event ${event.id}`)
          continue
        }

        // Create event reminder message
        const eventDate = new Date(event.event_date)
        const eventDateFormatted = eventDate.toLocaleDateString("en-US", { 
          weekday: "long", 
          year: "numeric", 
          month: "long", 
          day: "numeric" 
        })

        let messageText = `Reminder: ${event.name}`
        if (event.description) {
          messageText += `\n${event.description}`
        }
        messageText += `\nDate: ${eventDateFormatted}`
        if (event.location) {
          messageText += `\nLocation: ${event.location}`
        }
        messageText += `\n\nWe look forward to seeing you there!`

        // Calculate cost
        const cost = recipients.length * 0.10 // Approximate cost per SMS

        // Create message record
        const { data: message, error: messageError } = await supabase
          .from("messaging_messages")
          .insert({
            organization_id: organization.id,
            message_name: eventMessageName,
            message_text: messageText,
            recipient_type: recipients.length === 1 ? "individual" : "group",
            recipient_count: recipients.length,
            status: "Sending",
            api_configuration_id: apiConfig.id,
            cost: cost,
            created_by: null, // System generated
          } as never)
          .select()
          .single()

        if (messageError || !message) {
          console.error(`Error creating message for event ${event.id}:`, messageError)
          totalErrors++
          continue
        }

        // Create recipient records and prepare destinations
        const recipientInserts: any[] = []
        const destinations: any[] = []

        for (const recipient of recipients) {
          // Format phone number (233XXXXXXXXX format)
          let formattedPhone = recipient.phone_number.replace(/\s+/g, "")
          if (formattedPhone.startsWith("+")) {
            formattedPhone = formattedPhone.substring(1)
          }
          if (formattedPhone.startsWith("0")) {
            formattedPhone = "233" + formattedPhone.substring(1)
          }
          if (!formattedPhone.startsWith("233")) {
            formattedPhone = "233" + formattedPhone.replace(/^0+/, "")
          }

          recipientInserts.push({
            message_id: message.id,
            recipient_type: "member",
            recipient_id: recipient.id,
            phone_number: formattedPhone,
            recipient_name: `${recipient.first_name} ${recipient.last_name}`,
            personalized_message: messageText,
            status: "Pending",
            cost: 0.10,
          })

          destinations.push({
            phone: formattedPhone,
            message: messageText,
            msgid: `EVT_${message.id}_${recipient.id}_${Date.now()}`,
          })
        }

        // Insert recipients
        if (recipientInserts.length > 0) {
          const { error: recipientError } = await supabase
            .from("messaging_message_recipients")
            .insert(recipientInserts as never)

          if (recipientError) {
            console.error(`Error creating recipients for message ${message.id}:`, recipientError)
          }
        }

        // Send SMS in batches of 100
        const BATCH_SIZE = 100
        let batchSuccess = true
        let batchError: string | null = null

        for (let i = 0; i < destinations.length; i += BATCH_SIZE) {
          const batch = destinations.slice(i, i + BATCH_SIZE)

          try {
            const response = await fetch("https://api.wigal.com.gh/api/v1/sms/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiConfig.api_key}`,
              },
              body: JSON.stringify({
                username: apiConfig.username || apiConfig.api_key,
                sender_id: apiConfig.sender_id,
                destinations: batch,
              }),
            })

            const result = await response.json()

            const responseMessage = result.message || result.error?.message || ""
            const isAcceptedMessage = responseMessage.toLowerCase().includes("accepted") || 
                                     responseMessage.toLowerCase().includes("processing")
            
            const isSuccess = response.ok && (
              result.success === true || 
              isAcceptedMessage ||
              (result.data && !result.error)
            )

            if (!isSuccess) {
              batchSuccess = false
              batchError = result.error?.message || result.error || result.message || "Failed to send SMS"
              console.error(`Batch send failed for event ${event.id}:`, batchError)
            }
          } catch (batchErr) {
            batchSuccess = false
            batchError = batchErr instanceof Error ? batchErr.message : "Failed to send SMS"
            console.error(`Error sending batch for event ${event.id}:`, batchErr)
          }
        }

        // Update message and recipients status
        if (batchSuccess) {
          await supabase
            .from("messaging_messages")
            .update({
              status: "Sent",
              sent_at: today.toISOString(),
            } as never)
            .eq("id", message.id)

          await supabase
            .from("messaging_message_recipients")
            .update({
              status: "Sent",
              sent_at: today.toISOString(),
            } as never)
            .eq("message_id", message.id)

          totalSent += recipients.length
          processedEvents.push(event.id)
        } else {
          const errorMessage = batchError || "Failed to send SMS"
          
          await supabase
            .from("messaging_messages")
            .update({
              status: "Failed",
              error_message: errorMessage,
            } as never)
            .eq("id", message.id)

          await supabase
            .from("messaging_message_recipients")
            .update({
              status: "Failed",
              error_message: errorMessage,
            } as never)
            .eq("message_id", message.id)

          totalErrors += recipients.length
        }
      } catch (error) {
        console.error(`Error processing event ${event.id}:`, error)
        totalErrors++
      }
    }

    return new Response(
      JSON.stringify({
        message: "Event reminders processed",
        sent: totalSent,
        errors: totalErrors,
        eventsProcessed: processedEvents.length,
        date: todayDate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("Error in process-event-reminders:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})

