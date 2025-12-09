"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type {
  EventType,
  EventTypeInsert,
  EventTypeUpdate,
} from "@/types/database-extension"

/**
 * Hook to fetch event types for the current organization
 * Uses selective field fetching for better performance
 */
export function useEventTypes() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["event_types", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("event_types")
        .select("id, name, description, created_at")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true })
        .limit(100)

      if (error) {
        console.error("Error fetching event types:", error)
        throw error
      }

      return (data || []) as EventType[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to create a new event type
 */
export function useCreateEventType() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (data: Omit<EventTypeInsert, "organization_id">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const insertData: EventTypeInsert = {
        ...data,
        organization_id: organization.id,
      }

      const { data: result, error } = await (supabase
        .from("event_types") as any)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("Error creating event type:", error)
        throw error
      }

      return result as EventType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types", organization?.id] })
      toast.success("Event type created successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to create event type:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to create event type"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to update an event type
 */
export function useUpdateEventType() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: EventTypeUpdate & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data: result, error } = await (supabase
        .from("event_types") as any)
        .update(data)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating event type:", error)
        throw error
      }

      return result as EventType
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types", organization?.id] })
      toast.success("Event type updated successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to update event type:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to update event type"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to delete an event type
 */
export function useDeleteEventType() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await supabase
        .from("event_types")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting event type:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types", organization?.id] })
      toast.success("Event type deleted successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to delete event type:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to delete event type"
      toast.error(errorMessage)
    },
  })
}
