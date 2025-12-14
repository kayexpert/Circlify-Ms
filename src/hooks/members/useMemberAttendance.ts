"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"

export interface MemberAttendanceRecord {
  id: string
  member_id: string
  date: string
  service_type: string
  event_id?: string | null
  checked_in_at: string
  notes?: string | null
  status?: 'present' | 'absent'
  created_at: string
  updated_at: string
}

export interface MemberAttendanceRecordInsert {
  member_id: string
  date: string
  service_type: string
  event_id?: string | null
  notes?: string | null
  status?: 'present' | 'absent'
}

export interface MemberAttendanceRecordUpdate {
  date?: string
  service_type?: string
  event_id?: string | null
  notes?: string | null
}

/**
 * Hook to fetch all attendance records for a member
 */
export function useMemberAttendanceRecords(memberId: string | null) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["member_attendance_records", orgId, memberId],
    queryFn: async () => {
      if (!orgId || !memberId) return []

      const { data, error } = await (supabase
        .from("member_attendance_records") as any)
        .select("id, member_id, date, service_type, event_id, checked_in_at, notes, status, created_at, updated_at")
        .eq("organization_id", orgId)
        .eq("member_id", memberId)
        .order("date", { ascending: false })
        .order("checked_in_at", { ascending: false })

      if (error) {
        console.error("Error fetching member attendance records:", error)
        throw error
      }

      return (data || []) as MemberAttendanceRecord[]
    },
    enabled: !!orgId && !!memberId,
    staleTime: 0, // Always consider data stale to allow immediate refetch on invalidation
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

/**
 * Hook to create a new member attendance record
 */
export function useCreateMemberAttendanceRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (attendanceData: MemberAttendanceRecordInsert) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("member_attendance_records") as any)
        .insert({
          organization_id: organization.id,
          member_id: attendanceData.member_id,
          date: attendanceData.date,
          service_type: attendanceData.service_type,
          event_id: attendanceData.event_id || null,
          notes: attendanceData.notes || null,
          status: attendanceData.status || 'present',
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating member attendance record:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        // Create a more descriptive error
        const errorMessage = error.message || error.details || error.hint || "Failed to create member attendance record"
        throw new Error(errorMessage)
      }

      return data as MemberAttendanceRecord
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific member's attendance records
      queryClient.invalidateQueries({ queryKey: ["member_attendance_records", organization?.id, variables.member_id] })
      // Also invalidate all member attendance records to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["member_attendance_records", organization?.id] })
      toast.success("Attendance recorded successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create member attendance record:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fullError: error
      })
      const errorMessage = error.message || "Failed to record attendance. This member may already be checked in for this event."
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to delete a member attendance record
 */
export function useDeleteMemberAttendanceRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await (supabase
        .from("member_attendance_records") as any)
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting member attendance record:", error)
        throw error
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific member's attendance records
      queryClient.invalidateQueries({ 
        queryKey: ["member_attendance_records", organization?.id, variables.memberId],
        refetchType: 'active'
      })
      // Also invalidate all member attendance records to ensure consistency
      queryClient.invalidateQueries({ 
        queryKey: ["member_attendance_records", organization?.id],
        refetchType: 'active'
      })
      // Force refetch to ensure immediate update
      queryClient.refetchQueries({ 
        queryKey: ["member_attendance_records", organization?.id],
        type: 'active'
      })
      toast.success("Attendance record deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete member attendance record:", error)
      toast.error(error.message || "Failed to delete attendance record")
    },
  })
}
