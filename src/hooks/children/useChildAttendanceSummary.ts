"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"

export interface ChildAttendanceSummary {
    id: string
    organization_id: string
    date: string
    service_type: string
    expected_attendance: number
    total_attendance: number
    notes?: string
    created_at?: string
    updated_at?: string
}

/**
 * Hook to fetch all child attendance summary records
 */
export function useChildAttendanceSummaries() {
    const { organization } = useOrganization()
    const supabase = createClient()

    return useQuery({
        queryKey: ["child_attendance_summary", organization?.id],
        queryFn: async () => {
            if (!organization?.id) return []

            const { data, error } = await supabase
                .from("child_attendance_summary")
                .select("*")
                .eq("organization_id", organization.id)
                .order("date", { ascending: false })
                .order("created_at", { ascending: false })

            if (error) {
                console.error("Error fetching child attendance summaries:", error)
                throw error
            }

            return (data || []) as ChildAttendanceSummary[]
        },
        enabled: !!organization?.id,
        staleTime: 10 * 1000, // 10 seconds for faster updates
        refetchInterval: 15 * 1000, // Auto-refetch every 15 seconds
        refetchOnWindowFocus: true,
    })
}

/**
 * Hook to create a new child attendance summary
 */
export function useCreateChildAttendanceSummary() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (summaryData: Omit<ChildAttendanceSummary, "id" | "organization_id" | "created_at" | "updated_at">) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { data, error } = await (supabase
                .from("child_attendance_summary") as any)
                .insert({
                    organization_id: organization.id,
                    date: summaryData.date,
                    service_type: summaryData.service_type,
                    expected_attendance: summaryData.expected_attendance || 0,
                    total_attendance: summaryData.total_attendance || 0,
                    notes: summaryData.notes || null,
                })
                .select()
                .single()

            if (error) {
                console.error("Error creating child attendance summary:", error)
                throw error
            }

            return data as ChildAttendanceSummary
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["child_attendance_summary", organization?.id] })
            toast.success("Attendance summary created successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to create child attendance summary:", error)
            toast.error(error.message || "Failed to create attendance summary")
        },
    })
}

/**
 * Hook to update a child attendance summary
 */
export function useUpdateChildAttendanceSummary() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async ({ id, ...updateData }: Partial<ChildAttendanceSummary> & { id: string }) => {
            if (!organization?.id) throw new Error("No organization selected")

            const { data, error } = await (supabase
                .from("child_attendance_summary") as any)
                .update(updateData)
                .eq("id", id)
                .eq("organization_id", organization.id)
                .select()
                .single()

            if (error) {
                console.error("Error updating child attendance summary:", error)
                throw error
            }

            return data as ChildAttendanceSummary
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["child_attendance_summary", organization?.id] })
            queryClient.invalidateQueries({ queryKey: ["child_attendance"] })
            toast.success("Attendance summary updated successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to update child attendance summary:", error)
            toast.error(error.message || "Failed to update attendance summary")
        },
    })
}

/**
 * Hook to delete a child attendance summary
 */
export function useDeleteChildAttendanceSummary() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (summaryId: string) => {
            if (!organization?.id) throw new Error("No organization selected")

            // Get the summary to find date and service_type
            const { data: summary, error: fetchError } = await (supabase
                .from("child_attendance_summary") as any)
                .select("date, service_type")
                .eq("id", summaryId)
                .eq("organization_id", organization.id)
                .single()

            if (fetchError) {
                console.error("Error fetching child attendance summary:", fetchError)
                throw fetchError
            }

            if (!summary) {
                throw new Error("Attendance summary not found")
            }

            // Delete all associated child attendance records
            const { error: deleteChildRecordsError } = await supabase
                .from("child_attendance_records")
                .delete()
                .eq("organization_id", organization.id)
                .eq("date", summary.date)
                .eq("service_type", summary.service_type)

            if (deleteChildRecordsError) {
                console.error("Error deleting child attendance records:", deleteChildRecordsError)
                throw deleteChildRecordsError
            }

            // Delete the summary record
            const { error } = await supabase
                .from("child_attendance_summary")
                .delete()
                .eq("id", summaryId)
                .eq("organization_id", organization.id)

            if (error) {
                console.error("Error deleting child attendance summary:", error)
                throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["child_attendance_summary", organization?.id] })
            queryClient.invalidateQueries({ queryKey: ["child_attendance"] })
            toast.success("Attendance summary deleted successfully")
        },
        onError: (error: Error) => {
            console.error("Failed to delete child attendance summary:", error)
            toast.error(error.message || "Failed to delete attendance summary")
        },
    })
}

/**
 * Hook to upsert (create or update) a child attendance summary
 */
export function useUpsertChildAttendanceSummary() {
    const queryClient = useQueryClient()
    const { organization } = useOrganization()
    const supabase = createClient()

    return useMutation({
        mutationFn: async (summaryData: Omit<ChildAttendanceSummary, "id" | "organization_id" | "created_at" | "updated_at">) => {
            if (!organization?.id) throw new Error("No organization selected")

            const dataToUpsert = {
                organization_id: organization.id,
                date: summaryData.date,
                service_type: summaryData.service_type,
                expected_attendance: summaryData.expected_attendance || 0,
                total_attendance: summaryData.total_attendance || 0,
                notes: summaryData.notes || null,
            }

            const { data, error } = await (supabase
                .from("child_attendance_summary") as any)
                .upsert(dataToUpsert, {
                    onConflict: 'organization_id,date,service_type' // Specify conflict resolution
                })
                .select()
                .single()

            if (error) {
                throw error
            }

            return data as ChildAttendanceSummary
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["child_attendance_summary", organization?.id] })
            queryClient.invalidateQueries({ queryKey: ["child_attendance"] })
        },
        onError: (error: Error) => {
            console.error("Failed to upsert child attendance summary:", error)
            // Don't show toast here since this is often called silently
        },
    })
}
