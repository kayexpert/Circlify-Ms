"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { ChildAttendanceRecord } from "@/app/(dashboard)/dashboard/children/types"

// Helper to get typed table reference (bypasses TypeScript since table not in generated types yet)
function getAttendanceTable(supabase: ReturnType<typeof createClient>) {
    return supabase.from("child_attendance_records" as any) as any
}

// Helper function to convert database row to ChildAttendanceRecord type
function convertAttendanceRecord(data: any): ChildAttendanceRecord {
    const rawNotes = data.notes || ""
    const isAbsent = rawNotes.includes("[ABSENT]")
    const cleanNotes = rawNotes.replace("[ABSENT]", "").trim()

    return {
        id: data.id,
        child_id: data.child_id,
        date: data.date,
        service_type: data.service_type,
        checked_in_at: data.checked_in_at,
        checked_out_at: data.checked_out_at,
        checked_in_by: data.checked_in_by,
        notes: cleanNotes || null,
        status: isAbsent ? "absent" : "present",
    }
}

/**
 * Hook to fetch attendance records for a specific child
 */
export function useChildAttendance(childId: string | null) {
    const { organization } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["child_attendance", organization?.id, childId],
        queryFn: async () => {
            if (!organization?.id || !childId) return []

            const { data, error } = await getAttendanceTable(supabase)
                .select("*")
                .eq("organization_id", organization.id)
                .eq("child_id", childId)
                .order("date", { ascending: false })
                .order("checked_in_at", { ascending: false })
                .limit(100)

            if (error) {
                console.error("Error fetching child attendance:", error)
                throw error
            }

            return (data || []).map(convertAttendanceRecord)
        },
        enabled: !!organization?.id && !!childId,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 15 * 1000, // Auto-refetch every 15 seconds
    })
}

/**
 * Hook to fetch attendance records by date
 */
export function useAttendanceByDate(date: string, serviceType?: string) {
    const { organization } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["child_attendance", "by_date", organization?.id, date, serviceType],
        queryFn: async () => {
            if (!organization?.id || !date) return []

            let query = getAttendanceTable(supabase)
                .select("*")
                .eq("organization_id", organization.id)
                .eq("date", date)

            if (serviceType) {
                query = query.eq("service_type", serviceType)
            }

            const { data, error } = await query.order("checked_in_at", { ascending: true })

            if (error) {
                console.error("Error fetching attendance by date:", error)
                throw error
            }

            return (data || []).map(convertAttendanceRecord)
        },
        enabled: !!organization?.id && !!date,
        staleTime: 30 * 1000, // 30 seconds
        refetchInterval: 15 * 1000, // Refetch every 15 seconds for live updates
    })
}

/**
 * Hook to fetch all attendance records for the organization
 */
export function useAllAttendanceRecords() {
    const { organization } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["child_attendance", organization?.id],
        queryFn: async () => {
            if (!organization?.id) return []

            const { data, error } = await getAttendanceTable(supabase)
                .select("*")
                .eq("organization_id", organization.id)
                .order("date", { ascending: false })
                .order("checked_in_at", { ascending: false })

            if (error) {
                console.error("Error fetching all attendance records:", error)
                throw error
            }

            return (data || []).map(convertAttendanceRecord)
        },
        enabled: !!organization?.id,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 15 * 1000, // Auto-refetch every 15 seconds
        refetchOnWindowFocus: true,
    })
}

/**
 * Hook to check in a child
 */
export function useCheckInChild() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({ childId, date, serviceType, notes, status }: {
            childId: string
            date: string
            serviceType: string
            notes?: string
            status?: "present" | "absent"
        }) => {
            if (!organization?.id) throw new Error("No organization selected")

            // Get current user
            const { data: { user } } = await supabase.auth.getUser()

            const { data, error } = await getAttendanceTable(supabase)
                .insert({
                    organization_id: organization.id,
                    child_id: childId,
                    date,
                    service_type: serviceType,
                    checked_in_at: new Date().toISOString(),
                    checked_in_by: user?.id ?? null,
                    notes: status === "absent" ? `[ABSENT] ${notes || ""}`.trim() : (notes ?? null),
                })
                .select()
                .single()

            if (error) {
                console.error("Error checking in child:", error)
                throw error
            }

            return convertAttendanceRecord(data)
        },
        onSuccess: async (_, variables) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_attendance", organization?.id, variables.childId] }),
                queryClient.invalidateQueries({ queryKey: ["child_attendance", "by_date", organization?.id, variables.date] }),
                queryClient.invalidateQueries({ queryKey: ["child_attendance", "today_summary", organization?.id] }),
            ])
            toast.success("Child checked in successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to check in child:", error)
            toast.error(error.message || "Failed to check in child")
        },
    })
}

/**
 * Hook to check out a child
 */
export function useCheckOutChild() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (attendanceId: string) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { data, error } = await getAttendanceTable(supabase)
                .update({ checked_out_at: new Date().toISOString() })
                .eq("id", attendanceId)
                .eq("organization_id", organization.id)
                .select()
                .single()

            if (error) {
                console.error("Error checking out child:", error)
                throw error
            }

            return convertAttendanceRecord(data)
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_attendance"] }),
                queryClient.invalidateQueries({ queryKey: ["child_attendance", "today_summary", organization?.id] }),
            ])
            toast.success("Child checked out successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to check out child:", error)
            toast.error(error.message || "Failed to check out child")
        },
    })
}

/**
 * Hook to update an attendance record
 */
export function useUpdateAttendance() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({ id, ...updateData }: Partial<ChildAttendanceRecord> & { id: string }) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { data, error } = await getAttendanceTable(supabase)
                .update(updateData)
                .eq("id", id)
                .eq("organization_id", organization.id)
                .select()
                .single()

            if (error) {
                console.error("Error updating attendance:", error)
                throw error
            }

            return convertAttendanceRecord(data)
        },
        onSuccess: async (data: ChildAttendanceRecord) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_attendance", organization?.id, data.child_id] }),
                queryClient.invalidateQueries({ queryKey: ["child_attendance", "by_date", organization?.id, data.date] }),
                // Invalidate specific date if changed? Data has the updated date.
                // If date changed, we should invalidate old date too, but we don't have it easily here.
                // Just invalidating summary might be enough if we don't rely heavily on by_date in the profile view.
                queryClient.invalidateQueries({ queryKey: ["child_attendance", "today_summary", organization?.id] }),
            ])
            toast.success("Attendance updated successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to update attendance:", error)
            toast.error(error.message || "Failed to update attendance")
        },
    })
}

/**
 * Hook to delete an attendance record
 */
export function useDeleteChildAttendance() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (attendanceId: string) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { error } = await getAttendanceTable(supabase)
                .delete()
                .eq("id", attendanceId)
                .eq("organization_id", organization.id)

            if (error) {
                console.error("Error deleting attendance record:", error)
                throw error
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["child_attendance"] })
            toast.success("Attendance record deleted")
        },
        onError: (error: Error) => {
            console.error("Failed to delete attendance record:", error)
            toast.error(error.message || "Failed to delete attendance record")
        },
    })
}

/**
 * Hook to get today's attendance summary
 */
export function useTodayAttendanceSummary() {
    const { organization } = useOrganization()
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    return useQuery({
        queryKey: ["child_attendance", "today_summary", organization?.id],
        queryFn: async () => {
            if (!organization?.id) return { checked_in: 0, checked_out: 0, still_here: 0 }

            const { data, error } = await getAttendanceTable(supabase)
                .select("id, checked_out_at")
                .eq("organization_id", organization.id)
                .eq("date", today)

            if (error) {
                console.error("Error fetching today's attendance summary:", error)
                throw error
            }

            const records = data || []
            const checkedIn = records.length
            const checkedOut = records.filter((r: any) => r.checked_out_at != null).length
            const stillHere = checkedIn - checkedOut

            return {
                checked_in: checkedIn,
                checked_out: checkedOut,
                still_here: stillHere,
            }
        },
        enabled: !!organization?.id,
        staleTime: 60 * 1000,
        refetchInterval: 30 * 1000,
    })
}
/**
 * Hook to bulk upsert attendance records
 */
export function useBulkUpsertAttendance() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (records: {
            id?: string // Include ID for updates
            childId: string
            date: string
            serviceType: string
            notes?: string
            status: "present" | "absent"
        }[]) => {
            if (!organization?.id) throw new Error("No organization selected")
            if (records.length === 0) return []

            const { data: { user } } = await supabase.auth.getUser()

            const rowsToUpsert = records.map(r => {
                const row: Record<string, any> = {
                    organization_id: organization.id,
                    child_id: r.childId,
                    date: r.date,
                    service_type: r.serviceType,
                    checked_in_at: new Date().toISOString(),
                    checked_in_by: user?.id ?? null,
                    notes: r.status === "absent" ? `[ABSENT] ${r.notes || ""}`.trim() : (r.notes ?? null),
                }
                // Only include id if it exists (for updates), omit for new inserts
                if (r.id) {
                    row.id = r.id
                }
                return row
            })

            const { data, error } = await getAttendanceTable(supabase)
                .upsert(rowsToUpsert)
                .select()

            if (error) {
                console.error("Error bulk upserting attendance:", JSON.stringify(error, null, 2))
                throw error
            }

            return (data || []).map(convertAttendanceRecord)
        },
        onSuccess: async (_, variables) => {
            // Invalidate all child_attendance queries for immediate refresh
            await queryClient.invalidateQueries({ queryKey: ["child_attendance"] })
            toast.success(`Successfully saved ${variables.length} records`)
        },
        onError: (error: Error) => {
            console.error("Failed to bulk save attendance:", error)
            toast.error(error.message || "Failed to save attendance")
        },
    })
}

/**
 * Hook to bulk delete attendance records
 */
export function useBulkDeleteAttendance() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (attendanceIds: string[]) => {
            if (!organization?.id) throw new Error("No organization selected")
            if (attendanceIds.length === 0) return

            const { error } = await getAttendanceTable(supabase)
                .delete()
                .in("id", attendanceIds)
                .eq("organization_id", organization.id)

            if (error) {
                console.error("Error bulk deleting attendance:", error)
                throw error
            }
        },
        onSuccess: async (_, variables) => {
            // Invalidate all child_attendance queries for immediate refresh
            await queryClient.invalidateQueries({ queryKey: ["child_attendance"] })
            toast.success(`Removed ${variables.length} records`)
        },
        onError: (error: Error) => {
            console.error("Failed to bulk delete attendance:", error)
            toast.error(error.message || "Failed to remove attendance records")
        },
    })
}

/**
 * Hook to delete all attendance records for a specific session (date + service)
 * Also deletes the matching child_attendance_summary record if it exists
 */
export function useDeleteAttendanceSession() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({ date, serviceType }: { date: string, serviceType: string }) => {
            if (!organization?.id) throw new Error("No organization selected")

            // Delete child attendance records
            const { error: recordsError } = await getAttendanceTable(supabase)
                .delete()
                .eq("organization_id", organization.id)
                .eq("date", date)
                .eq("service_type", serviceType)

            if (recordsError) {
                throw recordsError
            }

            // Also delete matching summary record (if any exists)
            const { error: summaryError } = await supabase
                .from("child_attendance_summary")
                .delete()
                .eq("organization_id", organization.id)
                .eq("date", date)
                .eq("service_type", serviceType)

            // Ignore summary deletion errors (record may not exist)
            if (summaryError) {
                console.warn("No matching summary record to delete:", summaryError.message)
            }

            // Return the organization ID for use in onSuccess
            return { organizationId: organization.id }
        },
        onSuccess: async () => {
            // Invalidate all relevant queries to refresh the data
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["child_attendance"] }),
                queryClient.invalidateQueries({ queryKey: ["child_attendance_summary"] }),
            ])
            toast.success("Session deleted successfully")
        },
        onError: (error: Error) => {
            toast.error(error.message || "Failed to delete session")
        },
    })
}
