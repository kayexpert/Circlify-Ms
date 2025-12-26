"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { VisitorFollowUp } from "@/app/(dashboard)/dashboard/members/types"

// Helper to convert database follow-up to component format
function convertFollowUp(followUp: any): VisitorFollowUp {
  return {
    id: followUp.id,
    visitor_id: followUp.visitor_id,
    date: followUp.date,
    method: followUp.method,
    notes: followUp.notes,
    created_at: followUp.created_at,
  }
}

/**
 * Hook to fetch all follow-ups for a visitor
 */
export function useVisitorFollowUps(visitorId: string | null) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["visitor_follow_ups", orgId, visitorId],
    queryFn: async () => {
      if (!orgId || !visitorId) return []

      const { data, error } = await (supabase
        .from("visitor_follow_ups") as any)
        .select("id, visitor_id, date, method, notes, created_at")
        .eq("organization_id", orgId)
        .eq("visitor_id", visitorId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching visitor follow-ups:", error)
        throw error
      }

      return (data || []).map(convertFollowUp)
    },
    enabled: !!orgId && !!visitorId,
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to create a new follow-up
 */
export function useCreateVisitorFollowUp() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      visitorId,
      date,
      method,
      notes,
    }: {
      visitorId: string
      date: string
      method: string
      notes: string
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("visitor_follow_ups") as any)
        .insert({
          organization_id: organization.id,
          visitor_id: visitorId,
          date,
          method,
          notes,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating follow-up:", error)
        throw error
      }

      return convertFollowUp(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["visitor_follow_ups", organization?.id, variables.visitorId] })
      toast.success("Follow-up added successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create follow-up:", error)
      toast.error(error.message || "Failed to create follow-up")
    },
  })
}

/**
 * Hook to delete a follow-up
 */
export function useDeleteVisitorFollowUp() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, visitorId }: { id: string; visitorId: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await (supabase
        .from("visitor_follow_ups") as any)
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting follow-up:", error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["visitor_follow_ups", organization?.id, variables.visitorId] })
      toast.success("Follow-up deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete follow-up:", error)
      toast.error(error.message || "Failed to delete follow-up")
    },
  })
}
