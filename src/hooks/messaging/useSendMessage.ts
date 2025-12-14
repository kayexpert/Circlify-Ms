"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { sendMessages, type MessageRecipient } from "@/lib/services/message-sender.service"

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
 * Refactored to use message-sender.service.ts for better maintainability
 * Reduced from ~492 lines to ~70 lines by extracting business logic to service layer
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

      // Convert recipients to MessageRecipient format
      const messageRecipients: MessageRecipient[] = options.recipients.map((r) => ({
        phone: r.phone,
        name: r.name,
        memberId: r.memberId,
      }))

      // Use message sender service
      const result = await sendMessages({
        messageName: options.messageName,
        message: options.message,
        recipients: messageRecipients,
        apiConfigId: options.apiConfigId,
        organizationId: organization.id,
        templateId: options.templateId,
        createdBy: user.id,
      })

      if (!result.success) {
        throw new Error(result.errors?.[0] || "Failed to send messages")
      }

      return {
        id: result.messageId,
        success: result.success,
        totalSent: result.totalSent,
        totalFailed: result.totalFailed,
      }
    },
    onSuccess: async (data) => {
      // Invalidate all messaging-related queries (this includes paginated queries)
      // Using a broader query key pattern to catch all message queries
      await Promise.all([
        queryClient.invalidateQueries({ 
          queryKey: ["messaging_messages"],
          exact: false // Match all queries that start with this key
        }),
        queryClient.invalidateQueries({ queryKey: ["messaging_analytics", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["messaging_balance", organization?.id] }),
      ])

      // Explicitly refetch paginated messages to ensure immediate UI update
      // This ensures the message history updates without requiring a page refresh
      await queryClient.refetchQueries({
        queryKey: ["messaging_messages", "paginated"],
        exact: false, // Match all paginated message queries regardless of page/pageSize
      })

      // Show success message with details if some failed
      if (data.totalFailed > 0) {
        toast.success(
          `Message sent: ${data.totalSent} succeeded, ${data.totalFailed} failed`
        )
      } else {
        toast.success("Message sent successfully")
      }
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
