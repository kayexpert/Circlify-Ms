"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { AttendanceRecord as DBAttendanceRecord, AttendanceRecordInsert, AttendanceRecordUpdate } from "@/types/database-extension"
import type { AttendanceRecord } from "@/app/(dashboard)/dashboard/members/types"

// Helper to convert database AttendanceRecord to component format
function convertAttendanceRecord(record: DBAttendanceRecord): AttendanceRecord {
  return {
    id: parseInt(record.id.replace(/-/g, "").substring(0, 8), 16) || 0,
    date: record.date,
    service_type: record.service_type,
    expected_attendance: (record as any).expected_attendance || 0,
    total_attendance: record.total_attendance,
    men: record.men,
    women: record.women,
    children: record.children,
    first_timers: record.first_timers,
    notes: record.notes || undefined,
  }
}

/**
 * Hook to fetch all attendance records for the current organization
 * @deprecated Use useAttendanceRecordsPaginated for better performance with large datasets
 */
export function useAttendanceRecords() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["attendance_records", orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .from("attendance_records")
        .select("id, date, service_type, expected_attendance, total_attendance, men, women, children, first_timers, notes")
        .eq("organization_id", orgId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500) // Increased limit for large organizations

      if (error) {
        console.error("Error fetching attendance records:", error)
        throw error
      }

      return (data || []).map(convertAttendanceRecord)
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnReconnect: true,
  })
}

/**
 * Hook to fetch paginated attendance records for the current organization
 */
export function useAttendanceRecordsPaginated(page: number = 1, pageSize: number = 20) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["attendance_records", "paginated", orgId, page, pageSize],
    queryFn: async () => {
      if (!orgId) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("attendance_records")
          .select("id, date, service_type, expected_attendance, total_attendance, men, women, children, first_timers, notes")
          .eq("organization_id", orgId)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("attendance_records")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgId)
      ])

      if (dataResult.error) {
        console.error("Error fetching attendance records:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertAttendanceRecord),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  })
}

/**
 * Hook to create a new attendance record
 */
export function useCreateAttendanceRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (attendanceData: Omit<AttendanceRecord, "id">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("attendance_records") as any)
        .insert({
          organization_id: organization.id,
          date: attendanceData.date,
          service_type: attendanceData.service_type,
          expected_attendance: (attendanceData as any).expected_attendance || 0,
          total_attendance: attendanceData.total_attendance,
          men: attendanceData.men || 0,
          women: attendanceData.women || 0,
          children: attendanceData.children || 0,
          first_timers: attendanceData.first_timers || 0,
          notes: attendanceData.notes || null,
        } as AttendanceRecordInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating attendance record:", error)
        throw error
      }

      return convertAttendanceRecord(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records", organization?.id] })
      toast.success("Attendance record created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create attendance record:", error)
      toast.error(error.message || "Failed to create attendance record")
    },
  })
}

/**
 * Hook to update an attendance record
 */
export function useUpdateAttendanceRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<AttendanceRecord> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<AttendanceRecordUpdate> = {}

      if (updateData.date) dbUpdateData.date = updateData.date
      if (updateData.service_type) dbUpdateData.service_type = updateData.service_type
      if ((updateData as any).expected_attendance !== undefined) (dbUpdateData as any).expected_attendance = (updateData as any).expected_attendance
      if (updateData.total_attendance !== undefined) dbUpdateData.total_attendance = updateData.total_attendance
      if (updateData.men !== undefined) dbUpdateData.men = updateData.men
      if (updateData.women !== undefined) dbUpdateData.women = updateData.women
      if (updateData.children !== undefined) dbUpdateData.children = updateData.children
      if (updateData.first_timers !== undefined) dbUpdateData.first_timers = updateData.first_timers
      if (updateData.notes !== undefined) dbUpdateData.notes = updateData.notes || null

      const { data, error } = await (supabase
        .from("attendance_records") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating attendance record:", error)
        throw error
      }

      return convertAttendanceRecord(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records", organization?.id] })
      toast.success("Attendance record updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update attendance record:", error)
      toast.error(error.message || "Failed to update attendance record")
    },
  })
}

/**
 * Hook to delete an attendance record
 */
export function useDeleteAttendanceRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // First, get the attendance record to get date and service_type
      const { data: record, error: fetchError } = await supabase
        .from("attendance_records")
        .select("date, service_type")
        .eq("id", recordId)
        .eq("organization_id", organization.id)
        .single()

      if (fetchError) {
        console.error("Error fetching attendance record:", fetchError)
        throw fetchError
      }

      if (!record) {
        throw new Error("Attendance record not found")
      }

      // Type assertion for the selected fields
      const recordData = record as { date: string; service_type: string }

      // Delete all associated member attendance records with matching date and service_type
      const { data: deletedMemberRecords, error: deleteMemberError } = await supabase
        .from("member_attendance_records")
        .delete()
        .eq("organization_id", organization.id)
        .eq("date", recordData.date)
        .eq("service_type", recordData.service_type)
        .select()

      if (deleteMemberError) {
        console.error("Error deleting member attendance records:", deleteMemberError)
        throw deleteMemberError
      }

      console.log(`Deleted ${deletedMemberRecords?.length || 0} member attendance records for date ${recordData.date} and service ${recordData.service_type}`)

      // Now delete the attendance record itself
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", recordId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting attendance record:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records", organization?.id] })
      // Invalidate and refetch all member attendance records since we deleted all associated records
      queryClient.invalidateQueries({ 
        queryKey: ["member_attendance_records", organization?.id],
        refetchType: 'active' // Force refetch of active queries
      })
      // Also explicitly refetch all member attendance queries to ensure immediate update
      queryClient.refetchQueries({ 
        queryKey: ["member_attendance_records", organization?.id],
        type: 'active'
      })
      toast.success("Attendance record deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete attendance record:", error)
      toast.error(error.message || "Failed to delete attendance record")
    },
  })
}
