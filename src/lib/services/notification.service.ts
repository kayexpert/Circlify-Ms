/**
 * Notification Service
 * Centralized service for sending notifications (contribution, birthday, etc.)
 * Extracted from embedded notification logic in hooks for better maintainability
 */

import { createClient } from "@/lib/supabase/client"
import { personalizeMessage, formatPhoneNumber, calculateSMSCost } from "@/app/(dashboard)/dashboard/messaging/utils"
import * as Sentry from "@sentry/nextjs"

export interface ContributionNotificationParams {
  organizationId: string
  memberId: string
  amount: number
  date: Date | string
  category: string
  currency?: string
  projectName?: string // Optional project name for project contributions
}

export interface NotificationResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send contribution notification to a member
 * Handles template retrieval, message personalization, and SMS sending
 */
export async function sendContributionNotification(
  params: ContributionNotificationParams
): Promise<NotificationResult> {
  const supabase = createClient()

  return await Sentry.startSpan(
    {
      op: "notification.send",
      name: "Send Contribution Notification",
    },
    async (span) => {
      span.setAttribute("organization_id", params.organizationId)
      span.setAttribute("member_id", params.memberId)
      span.setAttribute("amount", params.amount)
      span.setAttribute("category", params.category)
      
      try {
        return await executeSendContributionNotification(supabase, params, span)
      } catch (error) {
        span.setStatus({ code: 2, message: error instanceof Error ? error.message : "Unknown error" })
        span.setAttribute("error", true)
        Sentry.captureException(error, {
          tags: {
            notification_type: "contribution",
            organization_id: params.organizationId,
          },
          extra: {
            member_id: params.memberId,
            amount: params.amount,
            category: params.category,
          },
        })
        throw error
      }
    }
  )
}

async function executeSendContributionNotification(
  supabase: ReturnType<typeof createClient>,
  params: ContributionNotificationParams,
  span: any
): Promise<NotificationResult> {
  try {
    // 1. Check if the category tracks members (indicating it's a contribution)
    // For project contributions, skip this check as they're always contributions
    const isProjectContribution = !!params.projectName
    
    if (!isProjectContribution) {
      const { data: category } = await supabase
        .from("finance_categories")
        .select("track_members")
        .eq("organization_id", params.organizationId)
        .eq("name", params.category)
        .eq("type", "income")
        .maybeSingle()

      // Only send notification if category tracks members (it's a contribution)
      if (!(category as any)?.track_members) {
        return { success: false, error: "Category does not track members" }
      }
    }

    // 2. Check if contribution notifications are enabled
    const { data: notificationSettings } = await supabase
      .from("messaging_notification_settings")
      .select("contribution_notifications_enabled, contribution_template_id")
      .eq("organization_id", params.organizationId)
      .maybeSingle()

    if (!(notificationSettings as any)?.contribution_notifications_enabled) {
      return { success: false, error: "Contribution notifications disabled" }
    }

    // 3. Get active API configuration
    const { data: activeApiConfig } = await supabase
      .from("messaging_api_configurations")
      .select("id, api_key, username, sender_id")
      .eq("organization_id", params.organizationId)
      .eq("is_active", true)
      .maybeSingle()

    if (!activeApiConfig) {
      return { success: false, error: "No active API configuration found" }
    }

    // 4. Get organization and member data in parallel
    const [orgResult, memberResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("currency")
        .eq("id", params.organizationId)
        .single(),
      supabase
        .from("members")
        .select("id, first_name, last_name, phone_number")
        .eq("id", params.memberId)
        .eq("organization_id", params.organizationId)
        .maybeSingle(),
    ])

    const member = memberResult.data
    if (!member || !(member as any).phone_number) {
      return { success: false, error: "Member not found or no phone number" }
    }

    const currency = params.currency || (orgResult.data as any)?.currency || "USD"

    // 5. Get template if configured
    // Build default message based on whether this is a project contribution
    // Ensure date is properly formatted
    let formattedDate: string
    try {
      const dateObj = params.date instanceof Date ? params.date : new Date(params.date)
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid date")
      }
      formattedDate = dateObj.toLocaleDateString()
    } catch (dateError) {
      console.error("Invalid date format in contribution notification:", params.date)
      Sentry.captureException(dateError, {
        tags: { notification_type: "contribution", error_type: "date_format" },
        extra: { date_value: params.date },
      })
      formattedDate = new Date().toLocaleDateString() // Fallback to current date
    }
    
    const contributionTarget = params.projectName 
      ? `to ${params.projectName}` 
      : `on ${formattedDate}`
    
    let messageText = `Thank you for your contribution of ${params.amount.toLocaleString()} ${currency} ${contributionTarget}. We appreciate your support!`

    if ((notificationSettings as any)?.contribution_template_id) {
      const { data: template } = await supabase
        .from("messaging_templates")
        .select("message")
        .eq("id", (notificationSettings as any).contribution_template_id)
        .eq("organization_id", params.organizationId)
        .maybeSingle()

      if ((template as any)?.message) {
        messageText = (template as any).message
      }
    }

    // 6. Personalize message
    const personalizeVars: Record<string, string> = {
      FirstName: (member as any).first_name || "",
      LastName: (member as any).last_name || "",
      PhoneNumber: formatPhoneNumber((member as any).phone_number) || (member as any).phone_number,
      Amount: params.amount.toLocaleString(),
      Currency: currency,
      Date: formattedDate,
      Category: params.projectName || params.category || "",
    }
    
    // Add project name if provided
    if (params.projectName) {
      personalizeVars.ProjectName = params.projectName
    }
    
    const personalizedMessage = personalizeMessage(messageText, personalizeVars)

    // 7. Get current user for created_by
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // 8. Calculate cost
    const cost = calculateSMSCost(personalizedMessage.length, 1)

    // 9. Create message record
    const { data: message, error: messageError } = await supabase
      .from("messaging_messages")
      .insert({
        organization_id: params.organizationId,
        message_name: params.projectName 
          ? `Project Contribution Notification - ${(member as any).first_name} ${(member as any).last_name}`
          : `Contribution Notification - ${(member as any).first_name} ${(member as any).last_name}`,
        message_text: personalizedMessage,
        recipient_type: "individual",
        recipient_count: 1,
        status: "Sending",
        template_id: (notificationSettings as any)?.contribution_template_id || null,
        api_configuration_id: (activeApiConfig as any).id,
        cost: cost,
        created_by: user.id,
      } as never)
      .select()
      .single()

    if (messageError || !message) {
      return {
        success: false,
        error: `Failed to create message record: ${messageError?.message || "Unknown error"}`,
      }
    }

    // 10. Create recipient record
    const formattedPhone = formatPhoneNumber((member as any).phone_number)
    const { error: recipientError } = await supabase
      .from("messaging_message_recipients")
      .insert({
        message_id: (message as any).id,
        recipient_type: "member",
        recipient_id: (member as any).id,
        phone_number: formattedPhone || (member as any).phone_number,
        recipient_name: `${(member as any).first_name} ${(member as any).last_name}`,
        personalized_message: personalizedMessage,
        status: "Pending",
        cost: cost,
      } as never)

    if (recipientError) {
      // Cleanup message record
      await supabase.from("messaging_messages").delete().eq("id", (message as any).id)
      return {
        success: false,
        error: `Failed to create recipient record: ${recipientError.message}`,
      }
    }

    // 11. Send the message via API
    try {
      const destinations = [
        {
          phone: formattedPhone || (member as any).phone_number,
          message: personalizedMessage,
          msgid: `MSG_${(message as any).id}_${(member as any).id}_${Date.now()}`,
        },
      ]

      // Make the API call with proper error handling
      let batchResponse: Response
      try {
        console.log("Sending SMS API request:", {
          url: "/api/messaging/send-sms",
          method: "POST",
          hasCredentials: true,
          destinationCount: destinations.length,
          organizationId: params.organizationId,
          memberId: params.memberId,
        })
        
        batchResponse = await fetch("/api/messaging/send-sms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // Ensure cookies are sent with the request
          body: JSON.stringify({
            apiKey: (activeApiConfig as any).api_key,
            username: (activeApiConfig as any).username || (activeApiConfig as any).api_key,
            senderId: (activeApiConfig as any).sender_id,
            destinations,
          }),
        })
        
        console.log("SMS API response received:", {
          status: batchResponse.status,
          statusText: batchResponse.statusText,
          ok: batchResponse.ok,
          headers: Object.fromEntries(batchResponse.headers.entries()),
        })
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : "Network error when calling SMS API"
        console.error("Fetch error in notification service:", {
          error: fetchError,
          message: errorMessage,
          stack: fetchError instanceof Error ? fetchError.stack : undefined,
        })
        Sentry.captureException(fetchError, {
          tags: { notification_type: "contribution", error_type: "fetch_error" },
          extra: { organization_id: params.organizationId, member_id: params.memberId },
        })
        throw new Error(errorMessage)
      }

      if (!batchResponse.ok) {
        let errorText: string = ""
        let batchResult: any = null
        let readError: Error | null = null
        
        // Log initial response info
        console.error("SMS API call failed - initial response info:", {
          status: batchResponse.status,
          statusText: batchResponse.statusText,
          ok: batchResponse.ok,
          headers: Object.fromEntries(batchResponse.headers.entries()),
        })
        
        try {
          // Check if body is already consumed
          if (batchResponse.bodyUsed) {
            console.warn("Response body already consumed, cannot read error details")
            batchResult = { 
              error: `HTTP ${batchResponse.status}: ${batchResponse.statusText || 'Internal Server Error'}`,
              bodyConsumed: true
            }
          } else {
            // Try to get response as text first
            // Clone the response to avoid consuming it
            const clonedResponse = batchResponse.clone()
            errorText = await clonedResponse.text()
            
            console.log("Raw error response text:", errorText ? `"${errorText.substring(0, 200)}"` : "EMPTY")
            
            // Try to parse as JSON
            if (errorText && errorText.trim()) {
              const trimmedText = errorText.trim()
              if (trimmedText.startsWith('{') || trimmedText.startsWith('[')) {
                try {
                  batchResult = JSON.parse(trimmedText)
                  console.log("Parsed error response:", batchResult)
                } catch (parseError) {
                  // If JSON parsing fails, use the text as error message
                  console.warn("Failed to parse error response as JSON:", parseError)
                  batchResult = { error: trimmedText }
                }
              } else {
                // If not JSON, use the text directly
                batchResult = { error: trimmedText }
              }
            } else {
              // If no text, create a generic error based on status
              batchResult = { 
                error: `HTTP ${batchResponse.status}: ${batchResponse.statusText || 'Internal Server Error'}`,
                emptyResponse: true
              }
            }
          }
        } catch (textError) {
          // If we can't read the response at all, create a generic error
          readError = textError instanceof Error ? textError : new Error(String(textError))
          console.error("Failed to read error response:", readError)
          batchResult = { 
            error: `HTTP ${batchResponse.status}: ${batchResponse.statusText || 'Internal Server Error'}`,
            readError: readError.message,
            readErrorStack: readError.stack
          }
        }
        
        // Extract error message - handle both nested and flat error structures
        let errorMessage: string = ""
        
        if (batchResult) {
          errorMessage = batchResult.error?.message || batchResult.error
          if (!errorMessage && batchResult.details) {
            errorMessage = typeof batchResult.details === 'string' 
              ? batchResult.details 
              : JSON.stringify(batchResult.details)
          }
          if (!errorMessage && batchResult.message) {
            errorMessage = batchResult.message
          }
        }
        
        if (!errorMessage && typeof batchResult === 'string') {
          errorMessage = batchResult
        }
        
        if (!errorMessage) {
          // Fallback to status-based error message
          const statusMessages: Record<number, string> = {
            401: "Unauthorized - Please check your authentication",
            403: "Forbidden - Access denied",
            404: "Not found - API endpoint not found",
            429: "Rate limit exceeded - Please try again later",
            500: "Internal server error - Please try again later",
            502: "Bad gateway - Service temporarily unavailable",
            503: "Service unavailable - Please try again later",
          }
          errorMessage = statusMessages[batchResponse.status] || `HTTP ${batchResponse.status}: ${batchResponse.statusText || 'Internal Server Error'}`
        }
        
        // Log detailed error for debugging
        // Build error details object with all available information
        const errorDetails: Record<string, any> = {
          status: batchResponse.status,
          statusText: batchResponse.statusText,
          ok: batchResponse.ok,
          bodyUsed: batchResponse.bodyUsed,
          errorText: errorText || "No error text available",
          errorTextLength: errorText?.length || 0,
          errorMessage: errorMessage,
          organizationId: params.organizationId,
          memberId: params.memberId,
        }
        
        // Add parsed error if available
        if (batchResult !== null) {
          try {
            errorDetails.parsedError = JSON.parse(JSON.stringify(batchResult))
            errorDetails.parsedErrorType = typeof batchResult
          } catch {
            errorDetails.parsedError = String(batchResult)
            errorDetails.parsedErrorType = typeof batchResult
          }
        } else {
          errorDetails.parsedError = null
          errorDetails.parsedErrorType = "null"
        }
        
        // Add read error if available
        if (readError) {
          errorDetails.readError = {
            message: readError.message,
            name: readError.name,
            stack: readError.stack,
          }
        }
        
        // Add response headers
        try {
          errorDetails.responseHeaders = Object.fromEntries(batchResponse.headers.entries())
        } catch (headerError) {
          errorDetails.responseHeaders = "Could not read headers"
        }
        
        // Log using multiple methods to ensure visibility
        console.error("=== SMS API ERROR ===")
        console.error("Status:", errorDetails.status)
        console.error("Status Text:", errorDetails.statusText)
        console.error("Error Message:", errorDetails.errorMessage)
        console.error("Error Text:", errorDetails.errorText)
        console.error("Parsed Error:", errorDetails.parsedError)
        console.error("Full Error Details:", JSON.stringify(errorDetails, null, 2))
        console.error("====================")
        
        Sentry.captureException(new Error(`SMS API error: ${errorMessage}`), {
          tags: {
            notification_type: "contribution",
            api_status: batchResponse.status.toString(),
          },
          extra: {
            organization_id: params.organizationId,
            member_id: params.memberId,
            api_response: batchResult,
            error_text: errorText || "No error text",
            status_text: batchResponse.statusText,
            http_status: batchResponse.status,
            error_details: errorDetails,
          },
        })
        
        throw new Error(errorMessage)
      }

      const batchResult = await batchResponse.json()

      const responseMessage = batchResult.message || batchResult.error?.message || ""
      const isAcceptedMessage =
        responseMessage.toLowerCase().includes("accepted") ||
        responseMessage.toLowerCase().includes("processing")

      const isSuccess =
        batchResponse.ok &&
        (batchResult.success === true || isAcceptedMessage || (batchResult.data && !batchResult.error))

      if (isSuccess) {
        // Update message and recipient status
        await Promise.all([
          supabase
            .from("messaging_messages")
            .update({
              status: "Sent",
              sent_at: new Date().toISOString(),
            } as never)
            .eq("id", (message as any).id),
          supabase
            .from("messaging_message_recipients")
            .update({
              status: "Sent",
              sent_at: new Date().toISOString(),
            } as never)
            .eq("message_id", (message as any).id),
        ])

        return { success: true, messageId: (message as any).id }
      } else {
        const errorMessage =
          batchResult.error?.message ||
          batchResult.error ||
          (typeof batchResult.error === "string" ? batchResult.error : null) ||
          batchResult.message ||
          "Failed to send SMS"

        await Promise.all([
          supabase
            .from("messaging_messages")
            .update({
              status: "Failed",
              error_message: errorMessage,
            } as never)
            .eq("id", (message as any).id),
          supabase
            .from("messaging_message_recipients")
            .update({
              status: "Failed",
              error_message: errorMessage,
            } as never)
            .eq("message_id", (message as any).id),
        ])

        return { success: false, error: errorMessage }
      }
    } catch (sendError) {
      const errorMessage = sendError instanceof Error ? sendError.message : "Failed to send SMS"
      
      Sentry.captureException(sendError, {
        tags: {
          notification_type: "contribution",
          error_type: "send_exception",
        },
        extra: {
          organization_id: params.organizationId,
          member_id: params.memberId,
          message_id: (message as any)?.id,
        },
      })
      
      if ((message as any)?.id) {
        await supabase
          .from("messaging_messages")
          .update({
            status: "Failed",
            error_message: errorMessage,
          } as never)
          .eq("id", (message as any).id)
      }

      return { success: false, error: errorMessage }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    
    Sentry.captureException(error, {
      tags: {
        notification_type: "contribution",
        error_type: "general_exception",
      },
      extra: {
        organization_id: params.organizationId,
        member_id: params.memberId,
      },
    })
    
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Check if contribution notifications should be sent for a given record
 * Useful for conditional checks before calling sendContributionNotification
 */
export async function shouldSendContributionNotification(
  organizationId: string,
  category: string
): Promise<boolean> {
  const supabase = createClient()

  try {
    // For project contributions, skip category check and only check if notifications are enabled
    const isProjectContribution = category === "Project" || category === "Project Contribution"
    
    if (!isProjectContribution) {
      // Check if category tracks members
      const { data: categoryData } = await supabase
        .from("finance_categories")
        .select("track_members")
        .eq("organization_id", organizationId)
        .eq("name", category)
        .eq("type", "income")
        .maybeSingle()

      if (!(categoryData as any)?.track_members) {
        return false
      }
    }

    // Check if notifications are enabled
    const { data: settings } = await supabase
      .from("messaging_notification_settings")
      .select("contribution_notifications_enabled")
      .eq("organization_id", organizationId)
      .maybeSingle()

    return (settings as any)?.contribution_notifications_enabled === true
  } catch {
    return false
  }
}

