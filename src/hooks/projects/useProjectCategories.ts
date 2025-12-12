"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { ProjectCategory, ProjectCategoryInsert, ProjectCategoryUpdate } from "@/types/database-extension"

export function useProjectCategories() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["project_categories", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("project_categories")
        .select("*")
        .eq("organization_id", organization.id)
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching project categories:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        throw new Error(error.message || "Failed to fetch project categories")
      }

      return (data || []) as ProjectCategory[]
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (categories change less frequently)
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  })
}

export function useCreateProjectCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (categoryData: Omit<ProjectCategoryInsert, "organization_id">) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      const { data, error } = await supabase
        .from("project_categories")
        .insert({
          ...categoryData,
          organization_id: organization.id,
        } as ProjectCategoryInsert)
        .select()
        .single()

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error creating project category:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }

      return data as ProjectCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_categories", organization?.id] })
      toast.success("Category created successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`)
    },
  })
}

export function useUpdateProjectCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & ProjectCategoryUpdate) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      const { data, error } = await supabase
        .from("project_categories")
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
          console.error("Error updating project category:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }

      return data as ProjectCategory
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_categories", organization?.id] })
      toast.success("Category updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update category: ${error.message}`)
    },
  })
}

export function useDeleteProjectCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      const { error } = await supabase
        .from("project_categories")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error deleting project category:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_categories", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      toast.success("Category deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete category: ${error.message}`)
    },
  })
}

