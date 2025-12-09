"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { MessagingMessage } from "@/types/database-extension"
import type { Message } from "@/app/(dashboard)/dashboard/messaging/types"

/**
 * Hook to fetch all messages for the current organization
 * @deprecated Use useMessagesPaginated for better performance with large datasets
 */
export function useMessages() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_messages", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      // Optimized: Only select needed fields and limit results
      const { data, error } = await supabase
        .from("messaging_messages")
        .select("id, message_name, message_text, recipient_type, recipient_count, status, sent_at, created_at, is_recurring, recurrence_frequency, cost, template_id")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })
        .limit(500) // Limit to prevent large queries

      if (error) {
        console.error("Error fetching messages:", error)
        throw error
      }

      return (data || []).map((message: MessagingMessage) => ({
        id: message.id,
        messageName: message.message_name,
        recipient: message.recipient_type === "all_members" ? "All Members" : message.recipient_type,
        recipientCount: message.recipient_count,
        message: message.message_text,
        date: message.sent_at ? new Date(message.sent_at) : new Date(message.created_at),
        status: message.status === "Sent" ? "Sent" : message.status === "Failed" ? "Failed" : message.status,
        isRecurring: message.is_recurring,
        recurrenceFrequency: message.recurrence_frequency || undefined,
        cost: Number(message.cost) || 0,
        templateId: message.template_id || undefined,
      })) as Message[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds - messages change frequently
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch paginated messages for the current organization
 */
export function useMessagesPaginated(page: number = 1, pageSize: number = 20) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_messages", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("messaging_messages")
          .select("id, message_name, message_text, recipient_type, recipient_count, status, sent_at, created_at, is_recurring, recurrence_frequency, cost, template_id")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("messaging_messages")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching messages:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map((message: MessagingMessage) => ({
          id: message.id,
          messageName: message.message_name,
          recipient: message.recipient_type === "all_members" ? "All Members" : message.recipient_type,
          recipientCount: message.recipient_count,
          message: message.message_text,
          date: message.sent_at ? new Date(message.sent_at) : new Date(message.created_at),
          status: message.status === "Sent" ? "Sent" : message.status === "Scheduled" ? "Scheduled" : "Failed",
          scheduledDate: message.scheduled_at ? new Date(message.scheduled_at) : undefined,
          isRecurring: message.is_recurring,
          recurrenceFrequency: message.recurrence_frequency || undefined,
          cost: Number(message.cost) || 0,
          templateId: message.template_id || undefined,
        })) as Message[],
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to get a single message by ID with recipients
 * Uses selective field fetching for better performance
 */
export function useMessage(messageId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_messages", organization?.id, messageId],
    queryFn: async () => {
      if (!organization?.id || !messageId) return null

      const { data: message, error: messageError } = await (supabase
        .from("messaging_messages") as any)
        .select("id, message_name, message_text, recipient_type, recipient_count, status, sent_at, created_at, is_recurring, recurrence_frequency, cost, template_id")
        .eq("id", messageId)
        .eq("organization_id", organization.id)
        .single()

      if (messageError) {
        console.error("Error fetching message:", messageError)
        throw messageError
      }

      if (!message) return null

      // Fetch recipients with selective fields
      const { data: recipients, error: recipientsError } = await (supabase
        .from("messaging_message_recipients") as any)
        .select("id, recipient_id, recipient_name, recipient_type, phone_number, status, sent_at, cost, error_message")
        .eq("message_id", messageId)
        .order("created_at", { ascending: true })
        .limit(1000)

      if (recipientsError) {
        console.error("Error fetching recipients:", recipientsError)
      }

      const messageData = message as any
      return {
        message: {
          id: messageData.id,
          messageName: messageData.message_name,
          recipient: messageData.recipient_type === "all_members" ? "All Members" : messageData.recipient_type,
          recipientCount: messageData.recipient_count,
          message: messageData.message_text,
          date: messageData.sent_at ? new Date(messageData.sent_at) : new Date(messageData.created_at),
          status: messageData.status === "Sent" ? "Sent" : messageData.status === "Failed" ? "Failed" : messageData.status,
          isRecurring: messageData.is_recurring,
          recurrenceFrequency: messageData.recurrence_frequency || undefined,
          cost: Number(messageData.cost) || 0,
          templateId: messageData.template_id || undefined,
        } as Message,
        recipients: recipients || [],
      }
    },
    enabled: !!organization?.id && !!messageId && !orgLoading,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to delete a message
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await supabase
        .from("messaging_messages")
        .delete()
        .eq("id", messageId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting message:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_messages", organization?.id] })
      toast.success("Message deleted successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to delete message:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to delete message"
      toast.error(errorMessage)
    },
  })
}
