"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"

export interface MessagingAnalytics {
  totalMessages: number
  sentMessages: number
  failedMessages: number
  totalCost: number
  totalRecipients: number
  averageCostPerMessage: number
  messagesByStatus: {
    Sent: number
    Failed: number
    Draft: number
  }
  messagesByMonth: Array<{
    month: string
    count: number
    cost: number
  }>
  topTemplates: Array<{
    templateId: string
    templateName: string
    usageCount: number
  }>
}

/**
 * Hook to fetch messaging analytics for the current organization
 */
export function useMessagingAnalytics(dateRange?: { start: Date; end: Date }) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_analytics", organization?.id, dateRange],
    queryFn: async () => {
      if (!organization?.id) return null

      const startDate = dateRange?.start.toISOString().split("T")[0]
      const endDate = dateRange?.end.toISOString().split("T")[0]

      // Build query with optional date filter and selective fields
      let query = supabase
        .from("messaging_messages")
        .select("id, status, recipient_count, cost, created_at, template_id")
        .eq("organization_id", organization.id)

      if (startDate && endDate) {
        query = query.gte("created_at", startDate).lte("created_at", endDate)
      }

      const { data: messages, error } = await query.limit(1000)

      if (error) {
        console.error("Error fetching messaging analytics:", error)
        throw error
      }

      const messagesData = (messages || []) as any[]

      if (!messagesData || messagesData.length === 0) {
      return {
        totalMessages: 0,
        sentMessages: 0,
        failedMessages: 0,
        totalCost: 0,
        totalRecipients: 0,
        averageCostPerMessage: 0,
        messagesByStatus: {
          Sent: 0,
          Failed: 0,
          Draft: 0,
        },
        messagesByMonth: [],
        topTemplates: [],
      } as MessagingAnalytics
      }

      // Calculate statistics
      const totalMessages = messagesData.length
      const sentMessages = messagesData.filter((m) => m.status === "Sent").length
      const failedMessages = messagesData.filter((m) => m.status === "Failed").length
      const totalCost = messagesData.reduce((sum, m) => sum + (Number(m.cost) || 0), 0)
      const totalRecipients = messagesData.reduce((sum, m) => sum + (m.recipient_count || 0), 0)
      const averageCostPerMessage = sentMessages > 0 ? totalCost / sentMessages : 0

      // Messages by status
      const messagesByStatus = {
        Sent: sentMessages,
        Failed: failedMessages,
        Draft: messagesData.filter((m) => m.status === "Draft").length,
      }

      // Messages by month
      const messagesByMonthMap = new Map<string, { count: number; cost: number }>()
      messagesData.forEach((message) => {
        const date = new Date(message.created_at)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const existing = messagesByMonthMap.get(monthKey) || { count: 0, cost: 0 }
        messagesByMonthMap.set(monthKey, {
          count: existing.count + 1,
          cost: existing.cost + (Number(message.cost) || 0),
        })
      })

      const messagesByMonth = Array.from(messagesByMonthMap.entries())
        .map(([month, data]) => ({
          month,
          count: data.count,
          cost: data.cost,
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      // Top templates
      const templateUsageMap = new Map<string, { name: string; count: number }>()
      messagesData.forEach((message) => {
        if (message.template_id) {
          const existing = templateUsageMap.get(message.template_id) || { name: "Unknown", count: 0 }
          templateUsageMap.set(message.template_id, {
            name: existing.name,
            count: existing.count + 1,
          })
        }
      })

      // Fetch template names
      const templateIds = Array.from(templateUsageMap.keys())
      if (templateIds.length > 0) {
        const { data: templates } = await (supabase
          .from("messaging_templates") as any)
          .select("id, name")
          .in("id", templateIds)

        if (templates) {
          (templates as any[]).forEach((template) => {
            const usage = templateUsageMap.get(template.id)
            if (usage) {
              templateUsageMap.set(template.id, {
                name: template.name,
                count: usage.count,
              })
            }
          })
        }
      }

      const topTemplates = Array.from(templateUsageMap.entries())
        .map(([templateId, data]) => ({
          templateId,
          templateName: data.name,
          usageCount: data.count,
        }))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5)

      return {
        totalMessages,
        sentMessages,
        failedMessages,
        totalCost,
        totalRecipients,
        averageCostPerMessage,
        messagesByStatus,
        messagesByMonth,
        topTemplates,
      } as MessagingAnalytics
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to fetch balance from active API configuration
 */
export function useMessagingBalance() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_balance", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return null

      // Get active API configuration
      const { data: apiConfig } = await (supabase
        .from("messaging_api_configurations") as any)
        .select("id")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .maybeSingle()

      if (!apiConfig) {
        // Return null if no active config (don't throw error)
        return null
      }

      const apiConfigData = apiConfig as { id: string }
      try {
        // Fetch balance
        const response = await fetch(`/api/messaging/balance?apiConfigId=${apiConfigData.id}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          // Extract error message from different possible formats
          let errorMessage = "Unknown error"
          if (typeof data.error === "string") {
            errorMessage = data.error
          } else if (data.error && typeof data.error === "object") {
            errorMessage = data.error.message || data.error.error || JSON.stringify(data.error)
          } else if (data.message) {
            errorMessage = data.message
          }
          
          // Log detailed error for debugging
          console.error("Failed to fetch balance:", {
            status: response.status,
            error: errorMessage,
            code: data.code,
            fullResponse: data,
          })
          
          // If it's an authorization error, the API key might be invalid
          const errorMessageLower = errorMessage.toLowerCase()
          if (response.status === 401 || 
              errorMessageLower.includes("unauthorized") || 
              errorMessageLower.includes("not authorized") ||
              errorMessageLower.includes("authorization")) {
            console.warn("Wigal API authorization failed. Please check your API key and sender ID in the Configuration tab.")
          }
          
          // Return null instead of throwing to allow UI to show appropriate message
          return null
        }

        return data.data
      } catch (error) {
        console.error("Error fetching balance:", error)
        // Return null on error instead of throwing
        return null
      }
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes - balance changes frequently
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    retry: 1, // Only retry once on failure
  })
}
