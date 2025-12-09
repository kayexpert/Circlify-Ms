import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

/**
 * Process recurring messages
 * This function should be called daily to check for recurring messages that need to be sent
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const now = new Date()
    const today = now.toISOString().split("T")[0]

    console.log(`Processing recurring messages at ${now.toISOString()}`)

    // Find all active recurring messages across all organizations
    // Multi-tenant: We'll process each organization separately
    const { data: recurringMessages, error: messagesError } = await supabase
      .from("messaging_messages")
      .select(`
        *,
        organizations!inner (id, name)
      `)
      .eq("is_recurring", true)
      .eq("status", "Sent")
      .or(
        `recurrence_end_date.is.null,recurrence_end_date.gte.${today}`
      )
      .limit(100)

    if (messagesError) {
      console.error("Error fetching recurring messages:", messagesError)
      return new Response(
        JSON.stringify({ error: "Failed to fetch recurring messages" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    if (!recurringMessages || recurringMessages.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recurring messages to process", processed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      )
    }

    let processed = 0
    let skipped = 0

    for (const message of recurringMessages) {
      try {
        // Check if message should be sent today based on recurrence frequency
        const lastSentDate = message.sent_at ? new Date(message.sent_at) : new Date(message.created_at)
        const daysSinceLastSent = Math.floor(
          (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        let shouldSend = false

        switch (message.recurrence_frequency) {
          case "Weekly":
            // Send if at least 7 days have passed (allows for slight delays)
            shouldSend = daysSinceLastSent >= 7 && daysSinceLastSent < 14
            break
          case "Monthly":
            // Send if at least 28 days have passed (approximately a month)
            // This handles months with different lengths
            shouldSend = daysSinceLastSent >= 28 && daysSinceLastSent < 35
            break
          case "Yearly":
            // Send if at least 365 days have passed (approximately a year)
            // Allow a window of 365-375 days to account for leap years
            shouldSend = daysSinceLastSent >= 365 && daysSinceLastSent < 375
            break
          default:
            shouldSend = false
        }

        // Check if we've reached the end date
        if (message.recurrence_end_date) {
          const endDate = new Date(message.recurrence_end_date)
          if (now > endDate) {
            // Disable recurring
            await supabase
              .from("messaging_messages")
              .update({ is_recurring: false })
              .eq("id", message.id)
            skipped++
            continue
          }
        }

        if (!shouldSend) {
          skipped++
          continue
        }

        // Get organization for multi-tenant isolation
        const organization = (message as any).organizations
        if (!organization) {
          console.warn(`Message ${message.id} has no organization, skipping`)
          skipped++
          continue
        }

        // Get API configuration for this organization
        const { data: apiConfig, error: apiConfigError } = await supabase
          .from("messaging_api_configurations")
          .select("*")
          .eq("id", message.api_configuration_id)
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .single()

        if (apiConfigError || !apiConfig) {
          console.error(`API config not found for message ${message.id} in org ${organization.id}`)
          skipped++
          continue
        }

        // Get original recipients
        const { data: originalRecipients, error: recipientsError } = await supabase
          .from("messaging_message_recipients")
          .select("*")
          .eq("message_id", message.id)
          .eq("status", "Sent")
          .limit(1)

        if (recipientsError || !originalRecipients || originalRecipients.length === 0) {
          skipped++
          continue
        }

        // Create a new message record for this recurrence
        const newMessageData = {
          organization_id: message.organization_id,
          message_name: `${message.message_name} (Recurring)`,
          message_text: message.message_text,
          recipient_type: message.recipient_type,
          recipient_count: message.recipient_count,
          status: "Sending",
          is_recurring: true,
          recurrence_frequency: message.recurrence_frequency,
          recurrence_end_date: message.recurrence_end_date,
          template_id: message.template_id,
          api_configuration_id: message.api_configuration_id,
          cost: message.cost,
          created_by: message.created_by,
        }

        const { data: newMessage, error: newMessageError } = await supabase
          .from("messaging_messages")
          .insert(newMessageData)
          .select()
          .single()

        if (newMessageError || !newMessage) {
          console.error(`Error creating new message for recurrence:`, newMessageError)
          skipped++
          continue
        }

        // Get all recipients (re-fetch from members if needed)
        // For simplicity, we'll use the same recipients as the original message
        const { data: allRecipients } = await supabase
          .from("messaging_message_recipients")
          .select("*")
          .eq("message_id", message.id)
          .eq("status", "Sent")

        if (allRecipients && allRecipients.length > 0) {
          // Create recipient records for new message
          const newRecipients = allRecipients.map((recipient) => ({
            message_id: newMessage.id,
            recipient_type: recipient.recipient_type,
            recipient_id: recipient.recipient_id,
            phone_number: recipient.phone_number,
            recipient_name: recipient.recipient_name,
            personalized_message: recipient.personalized_message || message.message_text,
            status: "Pending",
            cost: recipient.cost,
          }))

          await supabase
            .from("messaging_message_recipients")
            .insert(newRecipients)

          // Send SMS
          const destinations = allRecipients
            .filter((r) => r.phone_number)
            .map((recipient) => ({
              destination: recipient.phone_number!,
              message: recipient.personalized_message || message.message_text,
              msgid: `MSG_${newMessage.id}_${recipient.id}_${Date.now()}`,
            }))

          if (destinations.length > 0) {
            const payload = {
              senderid: apiConfig.sender_id,
              destinations,
            }

            const response = await fetch("https://frogapi.wigal.com.gh/api/v3/sms/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "API-KEY": apiConfig.api_key,
                "USERNAME": apiConfig.username || apiConfig.api_key, // Fallback for backward compatibility
              },
              body: JSON.stringify(payload),
            })

            const responseData = await response.json()

            if (response.ok && responseData.status === "success") {
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Sent",
                  sent_at: now.toISOString(),
                })
                .eq("id", newMessage.id)

              await supabase
                .from("messaging_message_recipients")
                .update({
                  status: "Sent",
                  sent_at: now.toISOString(),
                })
                .eq("message_id", newMessage.id)
                .eq("status", "Pending")

              processed++
            } else {
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Failed",
                  error_message: responseData.message || "Failed to send",
                })
                .eq("id", newMessage.id)
              skipped++
            }
          }
        }
      } catch (error) {
        console.error(`Error processing recurring message ${message.id}:`, error)
        skipped++
      }
    }

    return new Response(
      JSON.stringify({
        message: "Recurring messages processed",
        processed,
        skipped,
        total: recurringMessages.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  } catch (error) {
    console.error("Error in process-recurring-messages:", error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
