"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { personalizeMessage, formatPhoneNumber, calculateSMSCost } from "@/app/(dashboard)/dashboard/messaging/utils"
import type {
  MessagingMessageInsert,
  MessagingMessageRecipientInsert,
} from "@/types/database-extension"
import type { IndividualMessageForm, GroupMessageForm } from "@/app/(dashboard)/dashboard/messaging/types"

interface SendMessageOptions {
  messageName: string
  message: string
  recipients: Array<{
    phone: string
    name?: string
    memberId?: string
  }>
  apiConfigId: string
  templateId?: string
}

/**
 * Hook to send SMS messages
 * Handles creating message record, recipients, and sending via Wigal API
 */
export function useSendMessage() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (options: SendMessageOptions) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Get API configuration - only select needed fields
      const { data: apiConfig, error: apiConfigError } = await (supabase
        .from("messaging_api_configurations") as any)
        .select("id, api_key, username, sender_id, is_active, organization_id")
        .eq("id", options.apiConfigId)
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .single()

      if (apiConfigError || !apiConfig) {
        throw new Error("Active API configuration not found")
      }

      // Calculate cost
      const cost = calculateSMSCost(options.message.length, options.recipients.length)

      // Create message record
      const messageData: MessagingMessageInsert = {
        organization_id: organization.id,
        message_name: options.messageName,
        message_text: options.message,
        recipient_type: options.recipients.length === 1 ? "individual" : "group",
        recipient_count: options.recipients.length,
        status: "Draft",
        scheduled_at: null,
        is_recurring: false,
        recurrence_frequency: null,
        recurrence_end_date: null,
        template_id: options.templateId || null,
        api_configuration_id: options.apiConfigId,
        cost: cost,
        created_by: user.id,
      }

      const { data: message, error: messageError } = await (supabase
        .from("messaging_messages") as any)
        .insert(messageData)
        .select()
        .single()

      if (messageError) {
        console.error("Error creating message:", messageError)
        throw messageError
      }

      // Create recipient records
      const recipientInserts: MessagingMessageRecipientInsert[] = options.recipients
        .filter((recipient) => {
          // Filter out recipients without phone numbers
          if (!recipient.phone) {
            console.warn("Skipping recipient without phone number:", recipient)
            return false
          }
          return true
        })
        .map((recipient) => {
          const formattedPhone = formatPhoneNumber(recipient.phone)
          if (!formattedPhone) {
            console.warn("Failed to format phone number:", recipient.phone)
          }
          return {
            message_id: message.id,
            recipient_type: recipient.memberId ? "member" : "phone_number",
            recipient_id: recipient.memberId || null,
            phone_number: formattedPhone || recipient.phone || null, // Ensure we have a phone number
            recipient_name: recipient.name || recipient.phone || "Unknown",
            personalized_message: (() => {
              // Personalize message for this recipient if we have member data
              // For now, store the template - will be personalized when sending
              return options.message
            })(),
            status: "Pending" as const,
            cost: calculateSMSCost(options.message.length, 1),
          }
        })

      // Only insert if we have valid recipients
      if (recipientInserts.length > 0) {
        try {
          const { data: insertedRecipients, error: recipientsError } = await (supabase
            .from("messaging_message_recipients") as any)
            .insert(recipientInserts)
            .select()

          // Check if we actually got data back (insert might have succeeded despite error object)
          if (insertedRecipients && insertedRecipients.length > 0) {
            console.log(`Successfully created ${insertedRecipients.length} recipient records`)
          } else if (recipientsError) {
            // Only log error if we didn't get any data back
            // Sometimes Supabase returns an error object even when the insert succeeds
            // Try to extract meaningful error information
            const errorObj = recipientsError as any
            
            // Check if this is a real error or just an empty error object
            const hasRealError = 
              errorObj?.message || 
              errorObj?.code || 
              errorObj?.details || 
              errorObj?.hint ||
              (typeof errorObj === 'object' && Object.keys(errorObj).length > 0)
            
            if (hasRealError) {
              const errorInfo = {
                message: errorObj?.message || errorObj?.error_description || errorObj?.error || "Unknown error",
                code: errorObj?.code || errorObj?.statusCode || null,
                details: errorObj?.details || null,
                hint: errorObj?.hint || null,
                recipientCount: recipientInserts.length,
                messageId: message.id,
              }
              
              console.warn("Error creating recipients (message will still be sent):", errorInfo)
            } else {
              // Empty error object - likely a false positive, verify by checking if recipients exist
              console.log("Received empty error object, verifying recipient creation...")
              
              // Try to verify if recipients were actually created
              const { data: verifyRecipients } = await supabase
                .from("messaging_message_recipients")
                .select("id")
                .eq("message_id", message.id)
                .limit(1)
              
              if (verifyRecipients && verifyRecipients.length > 0) {
                console.log("Recipients were actually created despite error object")
              } else {
                console.warn("Recipients were not created - this may affect recipient tracking")
              }
            }
          } else {
            console.log(`Successfully created ${insertedRecipients?.length || 0} recipient records`)
          }
        } catch (insertError) {
          // Catch any unexpected errors during the insert operation
          console.error("Unexpected error during recipient insert:", insertError)
          // Continue anyway - message is created
        }
      } else {
        console.warn("No valid recipients to insert after filtering")
      }

      // Send immediately
      try {
          // Update status to Sending
          await supabase
            .from("messaging_messages")
            .update({ status: "Sending" } as never)
            .eq("id", message.id)

          // Optimize: Batch sending for large groups (send in chunks of 100)
          const BATCH_SIZE = 100
          const batches: Array<typeof options.recipients> = []
          
          for (let i = 0; i < options.recipients.length; i += BATCH_SIZE) {
            batches.push(options.recipients.slice(i, i + BATCH_SIZE))
          }

          let allSucceeded = true
          let lastError: string | null = null
          let totalSent = 0
          let totalFailed = 0

          // Fetch member data for personalization if needed
          // Check if message contains personalization placeholders
          const hasPlaceholders = /\{[a-zA-Z_]+\}/gi.test(options.message)
          
          // If personalization is needed, fetch member data
          let memberDataMap: Map<string, { first_name?: string; last_name?: string }> = new Map()
          if (hasPlaceholders) {
            const memberIds = options.recipients
              .map(r => r.memberId)
              .filter((id): id is string => !!id)
            
            if (memberIds.length > 0) {
              const { data: members } = await (supabase
                .from("members") as any)
                .select("id, first_name, last_name")
                .in("id", memberIds)
                .eq("organization_id", organization.id)
              
              if (members) {
                (members as any[]).forEach((member: any) => {
                  memberDataMap.set(member.id, {
                    first_name: member.first_name || "",
                    last_name: member.last_name || "",
                  })
                })
              }
            }
          }

          // Send batches sequentially to avoid overwhelming the API
          for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex]
            const destinations = batch.map((recipient, idx) => {
              // Personalize message for each recipient
              let personalizedMessage = options.message
              
              if (hasPlaceholders && recipient.memberId) {
                const memberData = memberDataMap.get(recipient.memberId)
                if (memberData) {
                  personalizedMessage = personalizeMessage(options.message, {
                    FirstName: memberData.first_name || "",
                    LastName: memberData.last_name || "",
                    PhoneNumber: formatPhoneNumber(recipient.phone),
                  })
                } else {
                  // Fallback: try to parse name if available
                  if (recipient.name) {
                    const nameParts = recipient.name.split(" ")
                    const firstName = nameParts[0] || ""
                    const lastName = nameParts.slice(1).join(" ") || ""
                    personalizedMessage = personalizeMessage(options.message, {
                      FirstName: firstName,
                      LastName: lastName,
                      PhoneNumber: formatPhoneNumber(recipient.phone),
                    })
                  }
                }
              } else if (hasPlaceholders && recipient.name) {
                // For non-member recipients, try to parse name
                const nameParts = recipient.name.split(" ")
                const firstName = nameParts[0] || ""
                const lastName = nameParts.slice(1).join(" ") || ""
                personalizedMessage = personalizeMessage(options.message, {
                  FirstName: firstName,
                  LastName: lastName,
                  PhoneNumber: formatPhoneNumber(recipient.phone),
                })
              }
              
              return {
                phone: recipient.phone,
                message: personalizedMessage,
                msgid: `MSG_${message.id}_${recipient.memberId || idx}_${Date.now()}`,
              }
            })

            try {
              const batchResponse = await fetch("/api/messaging/send-sms", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  apiKey: (apiConfig as any).api_key,
                  username: (apiConfig as any).username || (apiConfig as any).api_key, // Fallback for backward compatibility
                  senderId: (apiConfig as any).sender_id,
                  destinations,
                }),
              })

              const batchResult = await batchResponse.json()

              // Log the response for debugging
              if (process.env.NODE_ENV === "development") {
                console.log("Batch send response:", {
                  ok: batchResponse.ok,
                  success: batchResult.success,
                  message: batchResult.message,
                  error: batchResult.error,
                })
              }

              // Check if the response indicates success
              // Handle "Message Accepted For Processing" as success (Wigal sometimes returns this)
              const responseMessage = batchResult.message || batchResult.error?.message || ""
              const isAcceptedMessage = responseMessage.toLowerCase().includes("accepted") || 
                                       responseMessage.toLowerCase().includes("processing")
              
              const isSuccess = batchResponse.ok && (
                batchResult.success === true || 
                isAcceptedMessage ||
                (batchResult.data && !batchResult.error)
              )

              if (!isSuccess) {
                // Extract error message properly
                const errorMessage = 
                  batchResult.error?.message || 
                  batchResult.error || 
                  (typeof batchResult.error === "string" ? batchResult.error : null) ||
                  batchResult.message ||
                  "Failed to send SMS"

                // Update failed recipients in this batch
                const batchRecipientIds = batch
                  .map((r) => r.memberId)
                  .filter((id): id is string => !!id)

                if (batchRecipientIds.length > 0) {
                  await supabase
                    .from("messaging_message_recipients")
                    .update({
                      status: "Failed",
                      error_message: errorMessage,
                    } as never)
                    .eq("message_id", message.id)
                    .in("recipient_id", batchRecipientIds)
                }

                allSucceeded = false
                lastError = errorMessage
                totalFailed += batch.length
                
                // Continue with next batch even if this one failed
                continue
              }

              // Update successful recipients in this batch
              const batchRecipientIds = batch
                .map((r) => r.memberId)
                .filter((id): id is string => !!id)

              if (batchRecipientIds.length > 0) {
                await supabase
                  .from("messaging_message_recipients")
                  .update({
                    status: "Sent",
                    sent_at: new Date().toISOString(),
                  } as never)
                  .eq("message_id", message.id)
                  .in("recipient_id", batchRecipientIds)
              } else {
                // If no member IDs, update by phone number (for non-member recipients)
                const batchPhones = batch.map(r => formatPhoneNumber(r.phone))
                if (batchPhones.length > 0) {
                  await supabase
                    .from("messaging_message_recipients")
                    .update({
                      status: "Sent",
                      sent_at: new Date().toISOString(),
                    } as never)
                    .eq("message_id", message.id)
                    .in("phone_number", batchPhones)
                }
              }

              totalSent += batch.length

              // Small delay between batches to avoid rate limiting
              if (batchIndex < batches.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500))
              }
            } catch (batchError) {
              console.error(`Error sending batch ${batchIndex + 1}:`, batchError)
              allSucceeded = false
              lastError = batchError instanceof Error ? batchError.message : "Failed to send SMS"
              totalFailed += batch.length
              
              // Mark this batch as failed
              const batchRecipientIds = batch
                .map((r) => r.memberId)
                .filter((id): id is string => !!id)

              if (batchRecipientIds.length > 0) {
                await supabase
                  .from("messaging_message_recipients")
                  .update({
                    status: "Failed",
                    error_message: lastError,
                  } as never)
                  .eq("message_id", message.id)
                  .in("recipient_id", batchRecipientIds)
              }
            }
          }

          // Update message status based on batch results
          if (!allSucceeded) {
            // Some batches failed - check if any succeeded
            if (totalSent > 0) {
              // Partial success - message is partially sent
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Sent", // Mark as sent since some succeeded
                  sent_at: new Date().toISOString(),
                  error_message: `${totalFailed} recipients failed: ${lastError}`,
                } as never)
                .eq("id", message.id)
            } else {
              // All batches failed
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Failed",
                  error_message: lastError || "Failed to send SMS",
                } as never)
                .eq("id", message.id)

              throw new Error(lastError || "Failed to send SMS")
            }
          } else {
            // All batches succeeded
            await supabase
              .from("messaging_messages")
              .update({
                status: "Sent",
                sent_at: new Date().toISOString(),
              } as never)
              .eq("id", message.id)
          }
        } catch (error) {
          console.error("Error sending SMS:", error)
          // Message record is already created, just mark as failed
          await supabase
            .from("messaging_messages")
            .update({
              status: "Failed",
              error_message: error instanceof Error ? error.message : "Failed to send SMS",
            } as never)
            .eq("id", message.id)

          throw error
        }

      return message
    },
    onSuccess: async () => {
      // Invalidate and refetch all related queries to refresh the UI immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["messaging_messages", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["messaging_analytics", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["messaging_balance", organization?.id] }),
      ])
      
      // Refetch queries immediately to update the stats cards
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["messaging_messages", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["messaging_analytics", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["messaging_balance", organization?.id] }),
      ])
      
      toast.success("Message sent successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to send message:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to send message"
      toast.error(errorMessage)
    },
  })
}
