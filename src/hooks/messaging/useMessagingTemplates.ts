"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type {
  MessagingTemplate,
  MessagingTemplateInsert,
  MessagingTemplateUpdate,
} from "@/types/database-extension"
import type { Template } from "@/app/(dashboard)/dashboard/messaging/types"

/**
 * Hook to fetch all messaging templates for the current organization
 */
export function useMessagingTemplates() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_templates", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      // Optimized: Only select needed fields
      const { data, error } = await supabase
        .from("messaging_templates")
        .select("id, name, message, created_at, updated_at")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching messaging templates:", error)
        throw error
      }

      return (data || []).map((template: MessagingTemplate) => ({
        id: template.id,
        name: template.name,
        message: template.message,
        createdAt: new Date(template.created_at),
        updatedAt: new Date(template.updated_at),
      })) as Template[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 60 * 1000, // 1 minute - templates change less often
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to get a single template by ID
 * Uses selective field fetching for better performance
 */
export function useMessagingTemplate(templateId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["messaging_templates", organization?.id, templateId],
    queryFn: async () => {
      if (!organization?.id || !templateId) return null

      const { data, error } = await (supabase
        .from("messaging_templates") as any)
        .select("id, name, message, created_at, updated_at")
        .eq("id", templateId)
        .eq("organization_id", organization.id)
        .single()

      if (error) {
        console.error("Error fetching messaging template:", error)
        throw error
      }

      if (!data) return null

      const templateData = data as any
      return {
        id: templateData.id,
        name: templateData.name,
        message: templateData.message,
        createdAt: new Date(templateData.created_at),
        updatedAt: new Date(templateData.updated_at),
      } as Template
    },
    enabled: !!organization?.id && !!templateId && !orgLoading,
    staleTime: 60 * 1000, // 1 minute - templates change less often
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to create a new messaging template
 */
export function useCreateMessagingTemplate() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (templateData: Omit<Template, "id" | "createdAt" | "updatedAt">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("messaging_templates") as any)
        .insert({
          organization_id: organization.id,
          name: templateData.name,
          message: templateData.message,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating messaging template:", error)
        throw error
      }

      const templateResult = data as any
      return {
        id: templateResult.id,
        name: templateResult.name,
        message: templateResult.message,
        createdAt: new Date(templateResult.created_at),
        updatedAt: new Date(templateResult.updated_at),
      } as Template
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_templates", organization?.id] })
      toast.success("Template created successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to create template:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to create template"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to update an existing messaging template
 */
export function useUpdateMessagingTemplate() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string; name?: string; message?: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const updatePayload: MessagingTemplateUpdate = {}
      if (updateData.name !== undefined) updatePayload.name = updateData.name
      if (updateData.message !== undefined) updatePayload.message = updateData.message

      const { data, error } = await (supabase
        .from("messaging_templates") as any)
        .update(updatePayload)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating messaging template:", error)
        throw error
      }

      const templateResult = data as any
      return {
        id: templateResult.id,
        name: templateResult.name,
        message: templateResult.message,
        createdAt: new Date(templateResult.created_at),
        updatedAt: new Date(templateResult.updated_at),
      } as Template
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_templates", organization?.id] })
      toast.success("Template updated successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to update template:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to update template"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to delete a messaging template
 */
export function useDeleteMessagingTemplate() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await supabase
        .from("messaging_templates")
        .delete()
        .eq("id", templateId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting messaging template:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messaging_templates", organization?.id] })
      toast.success("Template deleted successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to delete template:", error)
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null && "message" in error
            ? String(error.message)
            : "Failed to delete template"
      toast.error(errorMessage)
    },
  })
}
