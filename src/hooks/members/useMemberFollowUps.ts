"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"

export interface MemberFollowUp {
  id: string
  member_id: string
  date: string
  method: string
  notes: string
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface MemberFollowUpInsert {
  member_id: string
  date: string
  method: string
  notes: string
}

export interface MemberFollowUpUpdate {
  date?: string
  method?: string
  notes?: string
}

/**
 * Hook to fetch all follow-ups for a member
 */
export function useMemberFollowUps(memberId: string | null) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["member_follow_ups", orgId, memberId],
    queryFn: async () => {
      if (!orgId || !memberId) return []

      const { data, error } = await (supabase
        .from("member_follow_ups") as any)
        .select("id, member_id, date, method, notes, created_by, created_at, updated_at")
        .eq("organization_id", orgId)
        .eq("member_id", memberId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching member follow-ups:", error)
        throw error
      }

      return (data || []) as MemberFollowUp[]
    },
    enabled: !!orgId && !!memberId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Hook to create a new member follow-up
 */
export function useCreateMemberFollowUp() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (followUpData: MemberFollowUpInsert) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await (supabase
        .from("member_follow_ups") as any)
        .insert({
          organization_id: organization.id,
          member_id: followUpData.member_id,
          date: followUpData.date,
          method: followUpData.method,
          notes: followUpData.notes,
          created_by: user?.id || null,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating member follow-up:", error)
        throw error
      }

      return data as MemberFollowUp
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member_follow_ups", organization?.id, variables.member_id] })
      toast.success("Follow-up added successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create member follow-up:", error)
      toast.error(error.message || "Failed to create follow-up")
    },
  })
}

/**
 * Hook to update a member follow-up
 */
export function useUpdateMemberFollowUp() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, memberId, ...updateData }: Partial<MemberFollowUpUpdate> & { id: string; memberId: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<MemberFollowUpUpdate> = {}
      if (updateData.date) dbUpdateData.date = updateData.date
      if (updateData.method) dbUpdateData.method = updateData.method
      if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes

      const { data, error } = await (supabase
        .from("member_follow_ups") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating member follow-up:", error)
        throw error
      }

      return data as MemberFollowUp
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member_follow_ups", organization?.id, variables.memberId] })
      toast.success("Follow-up updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update member follow-up:", error)
      toast.error(error.message || "Failed to update follow-up")
    },
  })
}

/**
 * Hook to delete a member follow-up
 */
export function useDeleteMemberFollowUp() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await (supabase
        .from("member_follow_ups") as any)
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting member follow-up:", error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["member_follow_ups", organization?.id, variables.memberId] })
      toast.success("Follow-up deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete member follow-up:", error)
      toast.error(error.message || "Failed to delete follow-up")
    },
  })
}
