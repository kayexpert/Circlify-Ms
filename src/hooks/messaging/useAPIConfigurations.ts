"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type {
  MessagingAPIConfiguration,
  MessagingAPIConfigurationInsert,
  MessagingAPIConfigurationUpdate,
} from "@/types/database-extension"
import type { APIConfiguration } from "@/app/(dashboard)/dashboard/messaging/types"

/**
 * Hook to fetch all API configurations for the current organization
 */
export function useAPIConfigurations() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_api_configurations", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      // Optimized: Only select needed fields (exclude sensitive api_key unless needed)
      const { data, error } = await supabase
        .from("messaging_api_configurations")
        .select("id, name, api_key, username, sender_id, is_active, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching API configurations:", error)
        throw error
      }

      return (data || []).map((config: MessagingAPIConfiguration) => ({
        id: config.id,
        name: config.name,
        apiKey: config.api_key,
        username: config.username,
        senderId: config.sender_id,
        isActive: config.is_active,
        createdAt: new Date(config.created_at),
      })) as APIConfiguration[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to get the active API configuration
 * Uses selective field fetching for better performance
 */
export function useActiveAPIConfiguration() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_api_configurations", organization?.id, "active"],
    queryFn: async () => {
      if (!organization?.id) return null

      const { data, error } = await supabase
        .from("messaging_api_configurations")
        .select("id, name, api_key, username, sender_id, is_active, created_at")
        .eq("organization_id", organization.id)
        .eq("is_active", true)
        .maybeSingle()

      if (error) {
        console.error("Error fetching active API configuration:", error)
        throw error
      }

      if (!data) return null

      const config = data as MessagingAPIConfiguration
      return {
        id: config.id,
        name: config.name,
        apiKey: config.api_key,
        username: config.username,
        senderId: config.sender_id,
        isActive: config.is_active,
        createdAt: new Date(config.created_at),
      } as APIConfiguration
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000, // 15 minutes
  })
}

/**
 * Hook to create a new API configuration
 */
export function useCreateAPIConfiguration() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (configData: Omit<APIConfiguration, "id" | "createdAt">) => {
      if (!organization?.id) throw new Error("No organization selected")

      // If this is set as active, deactivate all other configurations
      if (configData.isActive) {
        await (supabase
          .from("messaging_api_configurations") as any)
          .update({ is_active: false })
          .eq("organization_id", organization.id)
          .eq("is_active", true)
      }

      const { data, error } = await (supabase
        .from("messaging_api_configurations") as any)
        .insert({
          organization_id: organization.id,
          name: configData.name,
          api_key: configData.apiKey,
          username: configData.username,
          sender_id: configData.senderId,
          is_active: configData.isActive || false,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating API configuration:", error)
        throw error
      }

      return {
        id: data.id,
        name: data.name,
        apiKey: data.api_key,
        username: data.username,
        senderId: data.sender_id,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
      } as APIConfiguration
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_api_configurations", organization?.id] })
      toast.success("API configuration created successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to create API configuration:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to create API configuration"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to update an existing API configuration
 */
export function useUpdateAPIConfiguration() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updateData
    }: {
      id: string
      name?: string
      apiKey?: string
      username?: string
      senderId?: string
      isActive?: boolean
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      // If setting this as active, deactivate all other configurations
      if (updateData.isActive === true) {
        await (supabase
          .from("messaging_api_configurations") as any)
          .update({ is_active: false })
          .eq("organization_id", organization.id)
          .eq("is_active", true)
          .neq("id", id)
      }

      const updatePayload: MessagingAPIConfigurationUpdate = {}
      if (updateData.name !== undefined) updatePayload.name = updateData.name
      if (updateData.apiKey !== undefined) updatePayload.api_key = updateData.apiKey
      if (updateData.username !== undefined) updatePayload.username = updateData.username
      if (updateData.senderId !== undefined) updatePayload.sender_id = updateData.senderId
      if (updateData.isActive !== undefined) updatePayload.is_active = updateData.isActive

      const { data, error } = await (supabase
        .from("messaging_api_configurations") as any)
        .update(updatePayload)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating API configuration:", error)
        throw error
      }

      return {
        id: data.id,
        name: data.name,
        apiKey: data.api_key,
        username: data.username,
        senderId: data.sender_id,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
      } as APIConfiguration
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_api_configurations", organization?.id] })
      toast.success("API configuration updated successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to update API configuration:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to update API configuration"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to delete an API configuration
 */
export function useDeleteAPIConfiguration() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (configId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await supabase
        .from("messaging_api_configurations")
        .delete()
        .eq("id", configId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting API configuration:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_api_configurations", organization?.id] })
      toast.success("API configuration deleted successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to delete API configuration:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Failed to delete API configuration"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to test API connection
 */
export function useTestAPIConnection() {
  return useMutation({
    mutationFn: async ({
      apiKey,
      username,
      senderId,
      testPhoneNumber,
    }: {
      apiKey: string
      username: string
      senderId: string
      testPhoneNumber: string
    }) => {
      const response = await fetch("/api/messaging/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKey,
          username,
          senderId,
          testPhoneNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Connection test failed")
      }

      return data
    },
    onSuccess: () => {
      toast.success("Connection test successful!")
    },
    onError: (error: Error | unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Connection test failed"
      toast.error(errorMessage)
    },
  })
}
