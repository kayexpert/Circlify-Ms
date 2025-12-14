/**
 * Message Sender Service
 * Extracted from useSendMessage hook for better maintainability and testability
 */

import { createClient } from "@/lib/supabase/client"
import { personalizeMessage, formatPhoneNumber, calculateSMSCost } from "@/app/(dashboard)/dashboard/messaging/utils"

/**
 * Validate if a string is a valid UUID format
 */
function isValidUUID(value: string | undefined | null): boolean {
  if (!value) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

export interface MessageRecipient {
  phone: string
  name?: string
  memberId?: string
}

export interface SendMessageOptions {
  messageName: string
  message: string
  recipients: MessageRecipient[]
  apiConfigId: string
  organizationId: string
  templateId?: string
  createdBy?: string
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  totalSent: number
  totalFailed: number
  errors?: string[]
}

/**
 * Create message and recipient records in database
 */
async function createMessageRecords(
  supabase: any,
  options: SendMessageOptions
): Promise<{ messageId: string; error?: string }> {
  // Get API configuration
  const { data: apiConfig, error: apiConfigError } = await supabase
    .from("messaging_api_configurations")
    .select("id, api_key, username, sender_id, is_active, organization_id")
    .eq("id", options.apiConfigId)
    .eq("organization_id", options.organizationId)
    .eq("is_active", true)
    .single()

  if (apiConfigError || !apiConfig) {
    return { messageId: "", error: "Active API configuration not found" }
  }

  // Filter valid recipients
  const validRecipients = options.recipients.filter((r) => {
    if (!r.phone) {
      console.warn("Skipping recipient without phone number:", r)
      return false
    }
    return true
  })

  if (validRecipients.length === 0) {
    return { messageId: "", error: "No valid recipients" }
  }

  // Calculate cost
  const cost = calculateSMSCost(options.message.length, validRecipients.length)

  // Create message record
  const messageData = {
    organization_id: options.organizationId,
    message_name: options.messageName,
    message_text: options.message,
    recipient_type: validRecipients.length === 1 ? "individual" : "group",
    recipient_count: validRecipients.length,
    status: "Draft" as const,
    scheduled_at: null,
    is_recurring: false,
    recurrence_frequency: null,
    recurrence_end_date: null,
    template_id: options.templateId || null,
    api_configuration_id: options.apiConfigId,
    cost: cost,
    created_by: options.createdBy || null,
  }

  const { data: message, error: messageError } = await supabase
    .from("messaging_messages")
    .insert(messageData)
    .select()
    .single()

  if (messageError || !message) {
    return { messageId: "", error: `Failed to create message record: ${messageError?.message || "Unknown error"}` }
  }

  // Create recipient records
  const recipientInserts = validRecipients.map((recipient) => {
    const formattedPhone = formatPhoneNumber(recipient.phone)
    // Validate memberId is a valid UUID before using it
    const validMemberId = recipient.memberId && isValidUUID(recipient.memberId) ? recipient.memberId : null
    return {
      message_id: message.id,
      recipient_type: validMemberId ? ("member" as const) : ("phone_number" as const),
      recipient_id: validMemberId,
      phone_number: formattedPhone || recipient.phone || null,
      recipient_name: recipient.name || recipient.phone || "Unknown",
      personalized_message: options.message, // Will be personalized when sending
      status: "Pending" as const,
      cost: calculateSMSCost(options.message.length, 1),
    }
  })

  const { error: recipientsError } = await supabase
    .from("messaging_message_recipients")
    .insert(recipientInserts)

  if (recipientsError) {
    // Cleanup message record
    await supabase.from("messaging_messages").delete().eq("id", message.id)
    return { messageId: "", error: `Failed to create recipient records: ${recipientsError.message}` }
  }

  return { messageId: message.id }
}

/**
 * Personalize messages for recipients
 */
async function personalizeMessages(
  supabase: any,
  message: string,
  recipients: MessageRecipient[],
  organizationId: string
): Promise<Map<string, string>> {
  const personalizedMap = new Map<string, string>()

  // Check if message contains personalization placeholders
  const hasPlaceholders = /\{[a-zA-Z_]+\}/gi.test(message)

  if (!hasPlaceholders) {
    // No personalization needed
    recipients.forEach((r) => personalizedMap.set(r.phone, message))
    return personalizedMap
  }

  // Fetch member data for personalization
  // Filter out invalid UUIDs to prevent database errors
  const memberIds = recipients
    .map((r) => r.memberId)
    .filter((id): id is string => !!id && isValidUUID(id))

  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from("members")
      .select("id, first_name, last_name, phone_number")
      .in("id", memberIds)
      .eq("organization_id", organizationId)

    const memberDataMap = new Map<string, { first_name?: string; last_name?: string }>()
    if (members) {
      members.forEach((member: any) => {
        memberDataMap.set(member.id, {
          first_name: member.first_name || "",
          last_name: member.last_name || "",
        })
      })
    }

    // Personalize messages
    recipients.forEach((recipient) => {
      let personalizedMessage = message

      if (recipient.memberId) {
        const memberData = memberDataMap.get(recipient.memberId)
        if (memberData) {
          personalizedMessage = personalizeMessage(message, {
            FirstName: memberData.first_name || "",
            LastName: memberData.last_name || "",
            PhoneNumber: formatPhoneNumber(recipient.phone),
          })
        } else if (recipient.name) {
          // Fallback: parse name
          const nameParts = recipient.name.split(" ")
          const firstName = nameParts[0] || ""
          const lastName = nameParts.slice(1).join(" ") || ""
          personalizedMessage = personalizeMessage(message, {
            FirstName: firstName,
            LastName: lastName,
            PhoneNumber: formatPhoneNumber(recipient.phone),
          })
        }
      } else if (recipient.name) {
        // For non-member recipients, try to parse name
        const nameParts = recipient.name.split(" ")
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""
        personalizedMessage = personalizeMessage(message, {
          FirstName: firstName,
          LastName: lastName,
          PhoneNumber: formatPhoneNumber(recipient.phone),
        })
      }

      personalizedMap.set(recipient.phone, personalizedMessage)
    })
  } else {
    // No member IDs, but still check for placeholders in names
    recipients.forEach((recipient) => {
      let personalizedMessage = message
      if (recipient.name) {
        const nameParts = recipient.name.split(" ")
        const firstName = nameParts[0] || ""
        const lastName = nameParts.slice(1).join(" ") || ""
        personalizedMessage = personalizeMessage(message, {
          FirstName: firstName,
          LastName: lastName,
          PhoneNumber: formatPhoneNumber(recipient.phone),
        })
      }
      personalizedMap.set(recipient.phone, personalizedMessage)
    })
  }

  return personalizedMap
}

/**
 * Send message batches via API
 */
async function sendBatches(
  supabase: any,
  messageId: string,
  apiConfig: any,
  recipients: MessageRecipient[],
  personalizedMessages: Map<string, string>,
  batchSize: number = 100
): Promise<{ totalSent: number; totalFailed: number; errors: string[] }> {
  let totalSent = 0
  let totalFailed = 0
  const errors: string[] = []

  // Create batches
  const batches: MessageRecipient[][] = []
  for (let i = 0; i < recipients.length; i += batchSize) {
    batches.push(recipients.slice(i, i + batchSize))
  }

  // Send batches sequentially
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const destinations = batch.map((recipient, idx) => ({
      phone: recipient.phone,
      message: personalizedMessages.get(recipient.phone) || recipient.phone,
      msgid: `MSG_${messageId}_${recipient.memberId || idx}_${Date.now()}`,
    }))

    try {
      const batchResponse = await fetch("/api/messaging/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey: apiConfig.api_key,
          username: apiConfig.username || apiConfig.api_key,
          senderId: apiConfig.sender_id,
          destinations,
        }),
      })

      const batchResult = await batchResponse.json()

      const responseMessage = batchResult.message || batchResult.error?.message || ""
      const isAcceptedMessage =
        responseMessage.toLowerCase().includes("accepted") ||
        responseMessage.toLowerCase().includes("processing")

      const isSuccess =
        batchResponse.ok &&
        (batchResult.success === true || isAcceptedMessage || (batchResult.data && !batchResult.error))

      if (isSuccess) {
        // Update successful recipients
        const batchPhones = batch.map((r) => formatPhoneNumber(r.phone)).filter(Boolean)
        if (batchPhones.length > 0) {
          await supabase
            .from("messaging_message_recipients")
            .update({
              status: "Sent",
              sent_at: new Date().toISOString(),
            } as never)
            .eq("message_id", messageId)
            .in("phone_number", batchPhones)
        }

        totalSent += batch.length
      } else {
        const errorMessage =
          batchResult.error?.message ||
          batchResult.error ||
          (typeof batchResult.error === "string" ? batchResult.error : null) ||
          batchResult.message ||
          "Failed to send SMS"

        // Update failed recipients
        const batchPhones = batch.map((r) => formatPhoneNumber(r.phone)).filter(Boolean)
        if (batchPhones.length > 0) {
          await supabase
            .from("messaging_message_recipients")
            .update({
              status: "Failed",
              error_message: errorMessage,
            } as never)
            .eq("message_id", messageId)
            .in("phone_number", batchPhones)
        }

        errors.push(errorMessage)
        totalFailed += batch.length
      }

      // Small delay between batches to avoid rate limiting
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    } catch (batchError) {
      const errorMessage = batchError instanceof Error ? batchError.message : "Failed to send SMS"
      errors.push(errorMessage)
      totalFailed += batch.length

      // Mark batch as failed
      const batchPhones = batch.map((r) => formatPhoneNumber(r.phone)).filter(Boolean)
      if (batchPhones.length > 0) {
        await supabase
          .from("messaging_message_recipients")
          .update({
            status: "Failed",
            error_message: errorMessage,
          } as never)
          .eq("message_id", messageId)
          .in("phone_number", batchPhones)
      }
    }
  }

  return { totalSent, totalFailed, errors }
}

/**
 * Main function to send messages
 */
export async function sendMessages(options: SendMessageOptions): Promise<SendMessageResult> {
  const supabase = createClient()

  try {
    // 1. Create message and recipient records
    const { messageId, error: createError } = await createMessageRecords(supabase, options)
    if (createError || !messageId) {
      return {
        success: false,
        totalSent: 0,
        totalFailed: 0,
        errors: [createError || "Failed to create message records"],
      }
    }

    // 2. Update status to Sending
    await supabase.from("messaging_messages").update({ status: "Sending" } as never).eq("id", messageId)

    // 3. Get API config for sending
    const { data: apiConfig } = await supabase
      .from("messaging_api_configurations")
      .select("api_key, username, sender_id")
      .eq("id", options.apiConfigId)
      .single()

    if (!apiConfig) {
      await supabase
        .from("messaging_messages")
        .update({ status: "Failed", error_message: "API configuration not found" } as never)
        .eq("id", messageId)
      return {
        success: false,
        totalSent: 0,
        totalFailed: options.recipients.length,
        errors: ["API configuration not found"],
      }
    }

    // 4. Personalize messages
    const personalizedMessages = await personalizeMessages(
      supabase,
      options.message,
      options.recipients,
      options.organizationId
    )

    // 5. Send batches
    const { totalSent, totalFailed, errors } = await sendBatches(
      supabase,
      messageId,
      apiConfig,
      options.recipients,
      personalizedMessages
    )

    // 6. Update message status
    if (totalFailed === 0) {
      await supabase
        .from("messaging_messages")
        .update({
          status: "Sent",
          sent_at: new Date().toISOString(),
        } as never)
        .eq("id", messageId)
    } else if (totalSent > 0) {
      await supabase
        .from("messaging_messages")
        .update({
          status: "Sent",
          sent_at: new Date().toISOString(),
          error_message: `${totalFailed} recipients failed: ${errors[0]}`,
        } as never)
        .eq("id", messageId)
    } else {
      await supabase
        .from("messaging_messages")
        .update({
          status: "Failed",
          error_message: errors[0] || "Failed to send SMS",
        } as never)
        .eq("id", messageId)
    }

    return {
      success: totalFailed === 0,
      messageId,
      totalSent,
      totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    return {
      success: false,
      totalSent: 0,
      totalFailed: options.recipients.length,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    }
  }
}

