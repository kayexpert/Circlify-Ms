"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { Project, ProjectInsert, ProjectUpdate } from "@/types/database-extension"

export function useProjects() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["projects", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching projects:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        throw new Error(error.message || "Failed to fetch projects")
      }

      return (data || []) as Project[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (projectData: Omit<ProjectInsert, "organization_id">) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...projectData,
          organization_id: organization.id,
        } as ProjectInsert)
        .select()
        .single()

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error creating project:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }

      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      toast.success("Project created successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to create project: ${error.message}`)
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & ProjectUpdate) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      const { data, error } = await supabase
        .from("projects")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error updating project:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }

      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      toast.success("Project updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update project: ${error.message}`)
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error deleting project:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      toast.success("Project deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete project: ${error.message}`)
    },
  })
}

