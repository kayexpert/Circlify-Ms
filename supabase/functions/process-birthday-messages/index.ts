import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

/**
 * Process birthday messages for all organizations
 * This function should be called daily to send birthday messages to members
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

    // Get current date (today's birthdays)
    const today = new Date()
    const todayMonth = today.getMonth() + 1 // JavaScript months are 0-indexed
    const todayDate = today.getDate()

    // Find all organizations with birthday messages enabled
    const { data: notificationSettings, error: settingsError } = await supabase
      .from("messaging_notification_settings")
      .select(`
        *,
        organizations!inner (id, name, currency)
      `)
      .eq("birthday_messages_enabled", true)

    if (settingsError) {
      console.error("Error fetching notification settings:", settingsError)
      throw settingsError
    }

    if (!notificationSettings || notificationSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No organizations with birthday messages enabled", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      )
    }

    let totalSent = 0
    let totalErrors = 0

    // Process each organization
    for (const setting of notificationSettings) {
      const organization = (setting as any).organizations
      if (!organization) continue

      try {
        // Find members with birthdays today
        const { data: members, error: membersError } = await supabase
          .from("members")
          .select("id, first_name, last_name, phone_number, date_of_birth")
          .eq("organization_id", organization.id)
          .eq("membership_status", "active")
          .not("date_of_birth", "is", null)
          .not("phone_number", "is", null)

        if (membersError) {
          console.error(`Error fetching members for org ${organization.id}:`, membersError)
          continue
        }

        if (!members || members.length === 0) continue

        // Filter members with birthdays today
        const birthdayMembers = members.filter((member: any) => {
          if (!member.date_of_birth) return false
          const birthDate = new Date(member.date_of_birth + "T00:00:00")
          return birthDate.getMonth() + 1 === todayMonth && birthDate.getDate() === todayDate
        })

        if (birthdayMembers.length === 0) continue

        // Get active API configuration for this organization
        const { data: apiConfig, error: apiError } = await supabase
          .from("messaging_api_configurations")
          .select("*")
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .maybeSingle()

        if (apiError || !apiConfig) {
          console.error(`No active API config for org ${organization.id}`)
          continue
        }

        // Get birthday template if configured
        let templateMessage: string | null = null
        if (setting.birthday_template_id) {
          const { data: template, error: templateError } = await supabase
            .from("messaging_templates")
            .select("message")
            .eq("id", setting.birthday_template_id)
            .eq("organization_id", organization.id)
            .maybeSingle()

          if (!templateError && template) {
            templateMessage = template.message
          }
        }

        // Default birthday message if no template
        if (!templateMessage) {
          templateMessage = `Happy Birthday {FirstName}! Wishing you a blessed day filled with joy and happiness. God bless you!`
        }

        // Process each birthday member
        for (const member of birthdayMembers) {
          try {
            // Personalize message
            let personalizedMessage = templateMessage
              .replace(/\{FirstName\}/gi, member.first_name || "")
              .replace(/\{LastName\}/gi, member.last_name || "")
              .replace(/\{first_name\}/gi, member.first_name || "")
              .replace(/\{last_name\}/gi, member.last_name || "")

            // Format phone number (233XXXXXXXXX format)
            let formattedPhone = member.phone_number.replace(/\s+/g, "")
            if (formattedPhone.startsWith("+")) {
              formattedPhone = formattedPhone.substring(1)
            }
            if (formattedPhone.startsWith("0")) {
              formattedPhone = "233" + formattedPhone.substring(1)
            }
            if (!formattedPhone.startsWith("233")) {
              formattedPhone = "233" + formattedPhone.replace(/^0+/, "")
            }

            // Create message record
            const { data: message, error: messageError } = await supabase
              .from("messaging_messages")
              .insert({
                organization_id: organization.id,
                message_name: `Birthday Message - ${member.first_name} ${member.last_name}`,
                message_text: personalizedMessage,
                recipient_type: "individual",
                recipient_count: 1,
                status: "Sending",
                template_id: setting.birthday_template_id || null,
                api_configuration_id: apiConfig.id,
                cost: 0.10, // Approximate cost
                created_by: null, // System generated
              } as never)
              .select()
              .single()

            if (messageError || !message) {
              console.error(`Error creating message for member ${member.id}:`, messageError)
              totalErrors++
              continue
            }

            // Create recipient record
            const { error: recipientError } = await supabase
              .from("messaging_message_recipients")
              .insert({
                message_id: message.id,
                recipient_type: "member",
                recipient_id: member.id,
                phone_number: formattedPhone,
                recipient_name: `${member.first_name} ${member.last_name}`,
                personalized_message: personalizedMessage,
                status: "Pending",
                cost: 0.10,
              } as never)

            if (recipientError) {
              console.error(`Error creating recipient for message ${message.id}:`, recipientError)
            }

            // Send SMS
            const response = await fetch("https://api.wigal.com.gh/api/v1/sms/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiConfig.api_key}`,
              },
              body: JSON.stringify({
                username: apiConfig.username || apiConfig.api_key,
                sender_id: apiConfig.sender_id,
                destinations: [{
                  phone: formattedPhone,
                  message: personalizedMessage,
                  msgid: `BDAY_${message.id}_${member.id}_${Date.now()}`,
                }],
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

            if (isSuccess) {
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

              totalSent++
            } else {
              const errorMessage = result.error?.message || result.error || result.message || "Failed to send SMS"
              
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

              totalErrors++
            }
          } catch (error) {
            console.error(`Error processing birthday for member ${member.id}:`, error)
            totalErrors++
          }
        }
      } catch (error) {
        console.error(`Error processing organization ${organization.id}:`, error)
        totalErrors++
      }
    }

    return new Response(
      JSON.stringify({
        message: "Birthday messages processed",
        sent: totalSent,
        errors: totalErrors,
        date: today.toISOString().split("T")[0],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  } catch (error) {
    console.error("Error in process-birthday-messages:", error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})
