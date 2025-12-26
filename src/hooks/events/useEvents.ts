"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type {
  Event,
  EventInsert,
  EventUpdate,
} from "@/types/database-extension"

/**
 * Hook to fetch events for the current organization
 * Uses selective field fetching for better performance
 */
export function useEvents() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["events", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          name,
          description,
          event_date,
          end_date,
          event_time,
          location,
          track_attendance,
          is_recurring,
          recurrence_frequency,
          reminder_enabled,
          reminder_send_time,
          reminder_recipient_type,
          reminder_recipient_ids,
          reminder_template_id,
          reminder_message_text,
          color,
          created_at,
          event_types (
            id,
            name
          )
        `)
        .eq("organization_id", organization.id)
        .order("event_date", { ascending: true })
        .limit(500)

      if (error) {
        console.error("Error fetching events:", error)
        throw error
      }

      return (data || []) as (Event & { event_types?: { id: string; name: string } | null })[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to create a new event
 */
export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (data: Omit<EventInsert, "organization_id" | "created_by">) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const insertData: EventInsert = {
        ...data,
        organization_id: organization.id,
        created_by: user.id,
      }

      const { data: result, error } = await (supabase
        .from("events") as any)
        .insert(insertData)
        .select(`
          *,
          event_types (
            id,
            name
          )
        `)
        .single()

      if (error) {
        console.error("Error creating event:", error)
        throw error
      }

      return result as Event & { event_types?: { id: string; name: string } | null }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", organization?.id] })
      toast.success("Event created successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to create event:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to create event"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to update an event
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: EventUpdate & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data: result, error } = await (supabase
        .from("events") as any)
        .update(data)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select(`
          *,
          event_types (
            id,
            name
          )
        `)
        .single()

      if (error) {
        console.error("Error updating event:", error)
        throw error
      }

      return result as Event & { event_types?: { id: string; name: string } | null }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", organization?.id] })
      toast.success("Event updated successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to update event:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to update event"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to fetch upcoming events for notifications (next 7 days)
 */
export function useUpcomingEvents(daysAhead: number = 7) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["upcoming_events", organization?.id, daysAhead],
    queryFn: async () => {
      if (!organization?.id) return []

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + daysAhead)
      endDate.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          name,
          description,
          event_date,
          end_date,
          event_time,
          location,
          color,
          event_types (
            id,
            name
          )
        `)
        .eq("organization_id", organization.id)
        .gte("event_date", today.toISOString().split("T")[0])
        .lte("event_date", endDate.toISOString().split("T")[0])
        .order("event_date", { ascending: true })
        .order("event_time", { ascending: true })
        .limit(50)

      if (error) {
        console.error("Error fetching upcoming events:", error)
        throw error
      }

      return (data || []) as (Event & { event_types?: { id: string; name: string } | null })[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to delete an event
 */
export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting event:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events", organization?.id] })
      toast.success("Event deleted successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to delete event:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to delete event"
      toast.error(errorMessage)
    },
  })
}
