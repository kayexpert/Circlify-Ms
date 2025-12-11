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
  } catch (logError) {
    // If logging fails, at least log to console
    console.error("Failed to log error to database:", logError)
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
  
  // Remove all whitespace
  let formatted = phone.replace(/\s+/g, "")
  
  // Remove any + prefix
  if (formatted.startsWith("+")) {
    formatted = formatted.substring(1)
  }
  
  // If starts with 0, replace with 233
  if (formatted.startsWith("0")) {
    formatted = "233" + formatted.substring(1)
  }
  
  // If doesn't start with 233, add it
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
  // Ghana phone numbers should be 12 digits (233 + 9 digits)
  return /^233\d{9}$/.test(formatted)
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

  const executionStartTime = Date.now()
  let executionLogId: string | null = null
  let supabase: any = null

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    
    console.log("[BIRTHDAY-CRON] Starting birthday message processing")
    console.log("[BIRTHDAY-CRON] Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl.length,
      keyLength: supabaseServiceKey.length,
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      const errorMsg = "Missing Supabase environment variables"
      console.error("[BIRTHDAY-CRON] FATAL ERROR:", errorMsg)
      throw new Error(errorMsg)
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create execution log entry
    const { data: executionLog, error: logError } = await supabase
      .from("cron_job_execution_logs")
      .insert({
        job_name: "process_birthday_messages",
        status: "running",
        execution_started_at: new Date().toISOString(),
      } as never)
      .select()
      .single()

    if (logError) {
      console.error("[BIRTHDAY-CRON] Failed to create execution log:", logError)
      // Continue execution even if logging fails
    } else {
      executionLogId = executionLog.id
      console.log("[BIRTHDAY-CRON] Execution log created:", executionLogId)
    }

    // Get current date in UTC (today's birthdays)
    const today = new Date()
    const todayUTC = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    ))
    const todayMonth = todayUTC.getUTCMonth() + 1 // JavaScript months are 0-indexed
    const todayDate = todayUTC.getUTCDate()
    const todayDateString = todayUTC.toISOString().split("T")[0]

    console.log("[BIRTHDAY-CRON] Date information:", {
      todayISO: today.toISOString(),
      todayUTC: todayUTC.toISOString(),
      todayDateString,
      todayMonth,
      todayDate,
    })

    // Find all organizations with birthday messages enabled
    console.log("[BIRTHDAY-CRON] Fetching organizations with birthday messages enabled...")
    const { data: notificationSettings, error: settingsError } = await supabase
      .from("messaging_notification_settings")
      .select(`
        *,
        organizations!inner (id, name, currency)
      `)
      .eq("birthday_messages_enabled", true)

    if (settingsError) {
      const errorMsg = `Error fetching notification settings: ${JSON.stringify(settingsError)}`
      console.error("[BIRTHDAY-CRON] FATAL ERROR:", errorMsg)
      
      if (executionLogId) {
        await logError(
          supabase,
          executionLogId,
          "database",
          "query_failure",
          errorMsg,
          settingsError.stack || undefined,
          { step: "fetch_notification_settings" }
        )
      }
      
      throw settingsError
    }

    console.log("[BIRTHDAY-CRON] Found organizations:", {
      count: notificationSettings?.length || 0,
      organizations: notificationSettings?.map((s: any) => ({
        orgId: s.organizations?.id,
        orgName: s.organizations?.name,
        hasTemplate: !!s.birthday_template_id,
      })),
    })

    if (!notificationSettings || notificationSettings.length === 0) {
      const result = {
        message: "No organizations with birthday messages enabled",
        count: 0,
        date: todayDateString,
      }
      
      console.log("[BIRTHDAY-CRON] No organizations to process:", result)
      
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
    const errors: Array<{ orgId?: string; memberId?: string; error: string }> = []

    // Process each organization
    for (const setting of notificationSettings) {
      const organization = (setting as any).organizations
      if (!organization) {
        console.warn("[BIRTHDAY-CRON] Setting missing organization data:", setting)
        continue
      }

      const orgId = organization.id
      const orgName = organization.name
      
      console.log(`[BIRTHDAY-CRON] Processing organization: ${orgName} (${orgId})`)

      try {
        // Find members with birthdays today
        console.log(`[BIRTHDAY-CRON] [${orgName}] Fetching active members...`)
        const { data: members, error: membersError } = await supabase
          .from("members")
          .select("id, first_name, last_name, phone_number, date_of_birth")
          .eq("organization_id", orgId)
          .eq("membership_status", "active")
          .not("date_of_birth", "is", null)
          .not("phone_number", "is", null)

        if (membersError) {
          const errorMsg = `Error fetching members for org ${orgId}: ${JSON.stringify(membersError)}`
          console.error(`[BIRTHDAY-CRON] [${orgName}] ERROR:`, errorMsg)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "database",
              "query_failure",
              errorMsg,
              membersError.stack || undefined,
              { step: "fetch_members", organization_id: orgId, organization_name: orgName }
            )
          }
          
          errors.push({ orgId, error: errorMsg })
          totalErrors++
          continue
        }

        console.log(`[BIRTHDAY-CRON] [${orgName}] Found ${members?.length || 0} active members with DOB and phone`)

        if (!members || members.length === 0) {
          console.log(`[BIRTHDAY-CRON] [${orgName}] No members to process`)
          continue
        }

        // Filter members with birthdays today
        console.log(`[BIRTHDAY-CRON] [${orgName}] Filtering members with birthdays on ${todayDateString}...`)
        const birthdayMembers = members.filter((member: any) => {
          if (!member.date_of_birth) return false
          
          try {
            // Parse date of birth - handle different formats
            let birthDate: Date
            if (member.date_of_birth.includes("T")) {
              birthDate = new Date(member.date_of_birth)
            } else {
              // Assume YYYY-MM-DD format, create date in UTC
              birthDate = new Date(member.date_of_birth + "T00:00:00Z")
            }
            
            // Compare month and date in UTC
            const birthMonth = birthDate.getUTCMonth() + 1
            const birthDateNum = birthDate.getUTCDate()
            
            const isBirthday = birthMonth === todayMonth && birthDateNum === todayDate
            
            if (isBirthday) {
              console.log(`[BIRTHDAY-CRON] [${orgName}] Found birthday member: ${member.first_name} ${member.last_name} (DOB: ${member.date_of_birth})`)
            }
            
            return isBirthday
          } catch (dateError) {
            console.error(`[BIRTHDAY-CRON] [${orgName}] Error parsing date for member ${member.id}:`, {
              date_of_birth: member.date_of_birth,
              error: dateError,
            })
            return false
          }
        })

        console.log(`[BIRTHDAY-CRON] [${orgName}] Found ${birthdayMembers.length} members with birthdays today`)

        if (birthdayMembers.length === 0) {
          console.log(`[BIRTHDAY-CRON] [${orgName}] No birthday members to process`)
          continue
        }

        totalProcessed += birthdayMembers.length

        // Get active API configuration for this organization
        console.log(`[BIRTHDAY-CRON] [${orgName}] Fetching active API configuration...`)
        const { data: apiConfig, error: apiError } = await supabase
          .from("messaging_api_configurations")
          .select("*")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .maybeSingle()

        if (apiError) {
          const errorMsg = `Error fetching API config for org ${orgId}: ${JSON.stringify(apiError)}`
          console.error(`[BIRTHDAY-CRON] [${orgName}] ERROR:`, errorMsg)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "database",
              "query_failure",
              errorMsg,
              apiError.stack || undefined,
              { step: "fetch_api_config", organization_id: orgId, organization_name: orgName }
            )
          }
          
          errors.push({ orgId, error: errorMsg })
          totalErrors += birthdayMembers.length
          continue
        }

        if (!apiConfig) {
          const errorMsg = `No active API config found for org ${orgId}`
          console.error(`[BIRTHDAY-CRON] [${orgName}] ERROR:`, errorMsg)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "validation",
              "missing_api_config",
              errorMsg,
              undefined,
              { step: "validate_api_config", organization_id: orgId, organization_name: orgName, member_count: birthdayMembers.length }
            )
          }
          
          errors.push({ orgId, error: errorMsg })
          totalErrors += birthdayMembers.length
          continue
        }

        console.log(`[BIRTHDAY-CRON] [${orgName}] API config found:`, {
          configId: apiConfig.id,
          name: apiConfig.name,
          hasApiKey: !!apiConfig.api_key,
          hasSenderId: !!apiConfig.sender_id,
          hasUsername: !!apiConfig.username,
        })

        // Validate API configuration
        if (!apiConfig.api_key || !apiConfig.sender_id) {
          const errorMsg = `Invalid API config for org ${orgId}: missing api_key or sender_id`
          console.error(`[BIRTHDAY-CRON] [${orgName}] ERROR:`, errorMsg)
          
          if (executionLogId) {
            await logError(
              supabase,
              executionLogId,
              "validation",
              "invalid_api_config",
              errorMsg,
              undefined,
              { step: "validate_api_config", organization_id: orgId, organization_name: orgName, api_config: { hasApiKey: !!apiConfig.api_key, hasSenderId: !!apiConfig.sender_id } }
            )
          }
          
          errors.push({ orgId, error: errorMsg })
          totalErrors += birthdayMembers.length
          continue
        }

        // Get birthday template if configured
        let templateMessage: string | null = null
        if (setting.birthday_template_id) {
          console.log(`[BIRTHDAY-CRON] [${orgName}] Fetching birthday template: ${setting.birthday_template_id}`)
          const { data: template, error: templateError } = await supabase
            .from("messaging_templates")
            .select("message")
            .eq("id", setting.birthday_template_id)
            .eq("organization_id", orgId)
            .maybeSingle()

          if (templateError) {
            console.warn(`[BIRTHDAY-CRON] [${orgName}] Error fetching template:`, templateError)
            if (executionLogId) {
              await logError(
                supabase,
                executionLogId,
                "database",
                "query_failure",
                `Error fetching template: ${JSON.stringify(templateError)}`,
                templateError.stack || undefined,
                { step: "fetch_template", organization_id: orgId, template_id: setting.birthday_template_id }
              )
            }
          } else if (template) {
            templateMessage = template.message
            console.log(`[BIRTHDAY-CRON] [${orgName}] Template loaded, length: ${templateMessage.length}`)
          }
        }

        // Default birthday message if no template
        if (!templateMessage) {
          templateMessage = `Happy Birthday {FirstName}! Wishing you a blessed day filled with joy and happiness. God bless you!`
          console.log(`[BIRTHDAY-CRON] [${orgName}] Using default template`)
        }

        // Process each birthday member
        for (const member of birthdayMembers) {
          const memberId = member.id
          const memberName = `${member.first_name} ${member.last_name}`
          
          console.log(`[BIRTHDAY-CRON] [${orgName}] Processing member: ${memberName} (${memberId})`)

          try {
            // Personalize message
            let personalizedMessage = templateMessage
              .replace(/\{FirstName\}/gi, member.first_name || "")
              .replace(/\{LastName\}/gi, member.last_name || "")
              .replace(/\{first_name\}/gi, member.first_name || "")
              .replace(/\{last_name\}/gi, member.last_name || "")

            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Personalized message length: ${personalizedMessage.length}`)

            // Format and validate phone number
            if (!member.phone_number) {
              const errorMsg = `Member ${memberId} has no phone number`
              console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "validation",
                  "missing_phone",
                  errorMsg,
                  undefined,
                  { step: "validate_phone", organization_id: orgId, member_id: memberId, member_name: memberName }
                )
              }
              
              errors.push({ orgId, memberId, error: errorMsg })
              totalErrors++
              continue
            }

            const formattedPhone = formatPhoneForWigal(member.phone_number)
            
            if (!validatePhoneNumber(formattedPhone)) {
              const errorMsg = `Invalid phone number format for member ${memberId}: ${member.phone_number} -> ${formattedPhone}`
              console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "validation",
                  "invalid_phone_format",
                  errorMsg,
                  undefined,
                  { step: "validate_phone", organization_id: orgId, member_id: memberId, member_name: memberName, original_phone: member.phone_number, formatted_phone: formattedPhone }
                )
              }
              
              errors.push({ orgId, memberId, error: errorMsg })
              totalErrors++
              continue
            }

            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Phone formatted: ${formattedPhone}`)

            // Create message record
            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Creating message record...`)
            const { data: message, error: messageError } = await supabase
              .from("messaging_messages")
              .insert({
                organization_id: orgId,
                message_name: `Birthday Message - ${member.first_name} ${member.last_name}`,
                message_text: personalizedMessage,
                recipient_type: "individual",
                recipient_count: 1,
                status: "Sending",
                template_id: setting.birthday_template_id || null,
                api_configuration_id: apiConfig.id,
                cost: 0.10,
                created_by: null,
              } as never)
              .select()
              .single()

            if (messageError || !message) {
              const errorMsg = `Error creating message for member ${memberId}: ${JSON.stringify(messageError)}`
              console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "insert_failure",
                  errorMsg,
                  messageError?.stack || undefined,
                  { step: "create_message", organization_id: orgId, member_id: memberId, member_name: memberName }
                )
              }
              
              errors.push({ orgId, memberId, error: errorMsg })
              totalErrors++
              continue
            }

            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Message created: ${message.id}`)

            // Create recipient record
            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Creating recipient record...`)
            const { error: recipientError } = await supabase
              .from("messaging_message_recipients")
              .insert({
                message_id: message.id,
                recipient_type: "member",
                recipient_id: member.id,
                phone_number: formattedPhone,
                recipient_name: memberName,
                personalized_message: personalizedMessage,
                status: "Pending",
                cost: 0.10,
              } as never)

            if (recipientError) {
              const errorMsg = `Error creating recipient for message ${message.id}: ${JSON.stringify(recipientError)}`
              console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "database",
                  "insert_failure",
                  errorMsg,
                  recipientError.stack || undefined,
                  { step: "create_recipient", organization_id: orgId, member_id: memberId, message_id: message.id }
                )
              }
              
              // Try to clean up message record
              await supabase
                .from("messaging_messages")
                .delete()
                .eq("id", message.id)
              
              errors.push({ orgId, memberId, error: errorMsg })
              totalErrors++
              continue
            }

            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Recipient created`)

            // Send SMS using Wigal FROG API
            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] Sending SMS via Wigal API...`)
            const payload = {
              senderid: apiConfig.sender_id,
              destinations: [{
                destination: formattedPhone,
                message: personalizedMessage,
                msgid: `BDAY_${message.id}_${member.id}_${Date.now()}`,
                smstype: "text",
              }],
            }

            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] API request payload:`, {
              senderid: apiConfig.sender_id,
              destination: formattedPhone,
              messageLength: personalizedMessage.length,
              msgid: payload.destinations[0].msgid,
            })

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
                // Add timeout (30 seconds)
                signal: AbortSignal.timeout(30000),
              })

              const apiDuration = Date.now() - apiStartTime
              console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] API response received in ${apiDuration}ms:`, {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok,
              })

              // Parse response
              const contentType = response.headers.get("content-type")
              if (contentType && contentType.includes("application/json")) {
                try {
                  result = await response.json()
                  console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] API response data:`, JSON.stringify(result))
                } catch (parseError) {
                  const textResponse = await response.text()
                  const errorMsg = `Error parsing JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response: ${textResponse}`
                  console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg)
                  
                  if (executionLogId) {
                    await logError(
                      supabase,
                      executionLogId,
                      "api",
                      "response_parse_error",
                      errorMsg,
                      parseError instanceof Error ? parseError.stack : undefined,
                      { step: "parse_api_response", organization_id: orgId, member_id: memberId, message_id: message.id, response_text: textResponse, response_status: response.status }
                    )
                  }
                  
                  result = { error: { message: errorMsg } }
                }
              } else {
                const textResponse = await response.text()
                const errorMsg = `Unexpected response content type: ${contentType}. Response: ${textResponse}`
                console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg)
                
                if (executionLogId) {
                  await logError(
                    supabase,
                    executionLogId,
                    "api",
                    "unexpected_content_type",
                    errorMsg,
                    undefined,
                    { step: "parse_api_response", organization_id: orgId, member_id: memberId, message_id: message.id, content_type: contentType, response_text: textResponse }
                  )
                }
                
                result = { error: { message: errorMsg } }
              }
            } catch (fetchError) {
              const apiDuration = Date.now() - apiStartTime
              const errorMsg = `Network error calling Wigal API: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
              console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ERROR:`, errorMsg, "Duration:", apiDuration)
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "network",
                  fetchError instanceof Error && fetchError.name === "TimeoutError" ? "timeout" : "network_error",
                  errorMsg,
                  fetchError instanceof Error ? fetchError.stack : undefined,
                  { step: "api_call", organization_id: orgId, member_id: memberId, message_id: message.id, duration_ms: apiDuration }
                )
              }
              
              result = { error: { message: errorMsg } }
              response = { ok: false, status: 0 } as Response
            }

            // Check for success indicators
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

            console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] API call result:`, {
              isSuccess,
              responseOk: response.ok,
              responseStatus: response.status,
              resultStatus: result?.status,
              resultSuccess: result?.success,
              resultMessage: responseMessage,
              isAcceptedMessage,
            })

            if (isSuccess) {
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Sent",
                  sent_at: new Date().toISOString(),
                } as never)
                .eq("id", message.id)

              await supabase
                .from("messaging_message_recipients")
                .update({
                  status: "Sent",
                  sent_at: new Date().toISOString(),
                } as never)
                .eq("message_id", message.id)

              totalSent++
              console.log(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ✅ Successfully sent birthday message`)
            } else {
              const errorMessage = result?.error?.message || result?.error || result?.message || `HTTP ${response.status}: ${response.statusText}` || "Failed to send SMS"
              
              console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] ❌ Failed to send:`, {
                phone: formattedPhone,
                error: errorMessage,
                response: result,
                status: response.status,
              })
              
              if (executionLogId) {
                await logError(
                  supabase,
                  executionLogId,
                  "api",
                  "send_failure",
                  errorMessage,
                  undefined,
                  { step: "send_sms", organization_id: orgId, member_id: memberId, message_id: message.id, phone: formattedPhone, api_response: result, http_status: response.status }
                )
              }
              
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

              errors.push({ orgId, memberId, error: errorMessage })
              totalErrors++
            }
          } catch (error) {
            const errorMsg = `Error processing birthday for member ${member.id}: ${error instanceof Error ? error.message : String(error)}`
            console.error(`[BIRTHDAY-CRON] [${orgName}] [${memberName}] FATAL ERROR:`, errorMsg, error)
            
            if (executionLogId) {
              await logError(
                supabase,
                executionLogId,
                "unknown",
                "member_processing_error",
                errorMsg,
                error instanceof Error ? error.stack : undefined,
                { step: "process_member", organization_id: orgId, member_id: member.id, member_name: memberName }
              )
            }
            
            errors.push({ orgId, memberId: member.id, error: errorMsg })
            totalErrors++
          }
        }
      } catch (error) {
        const errorMsg = `Error processing organization ${organization.id}: ${error instanceof Error ? error.message : String(error)}`
        console.error(`[BIRTHDAY-CRON] [${orgName}] FATAL ERROR:`, errorMsg, error)
        
        if (executionLogId) {
          await logError(
            supabase,
            executionLogId,
            "unknown",
            "organization_processing_error",
            errorMsg,
            error instanceof Error ? error.stack : undefined,
            { step: "process_organization", organization_id: orgId, organization_name: orgName }
          )
        }
        
        errors.push({ orgId, error: errorMsg })
        totalErrors++
      }
    }

    const executionDuration = Date.now() - executionStartTime
    const finalStatus = totalErrors > 0 && totalSent === 0 ? "failed" : totalErrors > 0 ? "partial" : "success"
    
    const result = {
      message: "Birthday messages processed",
      sent: totalSent,
      errors: totalErrors,
      processed: totalProcessed,
      date: todayDateString,
      duration_ms: executionDuration,
      status: finalStatus,
    }

    console.log("[BIRTHDAY-CRON] Execution completed:", result)

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
          error_message: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null, // Store first 10 errors
          error_details: errors.length > 0 ? { errors: errors.slice(0, 10), total_errors: errors.length } : null,
          execution_details: {
            organizations_processed: notificationSettings.length,
            date: todayDateString,
            todayMonth,
            todayDate,
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
    
    console.error("[BIRTHDAY-CRON] FATAL ERROR:", errorMsg, error)
    
    // Update execution log if it exists
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
        console.error("[BIRTHDAY-CRON] Failed to update execution log:", updateError)
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
