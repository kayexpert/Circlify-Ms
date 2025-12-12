"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { ProjectExpenditure, ProjectExpenditureInsert, ProjectExpenditureUpdate } from "@/types/database-extension"

export function useProjectExpenditure(projectId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["project_expenditure", projectId, organization?.id],
    queryFn: async () => {
      if (!organization?.id || !projectId) return []

      const { data, error } = await supabase
        .from("project_expenditure")
        .select("*")
        .eq("project_id", projectId)
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching project expenditure:", error)
        throw error
      }

      return (data || []) as ProjectExpenditure[]
    },
    enabled: !!organization?.id && !!projectId && !orgLoading,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  })
}

export function useCreateProjectExpenditure() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ projectId, ...expenditureData }: { projectId: string } & Omit<ProjectExpenditureInsert, "organization_id" | "project_id">) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      // Validate required fields
      if (!expenditureData.date || !expenditureData.amount || !expenditureData.account_id) {
        throw new Error("Missing required fields: date, amount, or account_id")
      }

      // Validate amount
      if (isNaN(expenditureData.amount) || expenditureData.amount <= 0) {
        throw new Error("Amount must be greater than 0")
      }

      // CRITICAL: Validate account_id is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(expenditureData.account_id)) {
        throw new Error(`Invalid account_id format. Expected UUID, got: ${expenditureData.account_id} (type: ${typeof expenditureData.account_id})`)
      }

      const { data, error } = await supabase
        .from("project_expenditure")
        .insert({
          ...expenditureData,
          project_id: projectId,
          organization_id: organization.id,
        } as ProjectExpenditureInsert)
        .select()
        .single()

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error creating project expenditure:", {
            message: error?.message,
            details: error?.details,
            code: error?.code,
            hint: error?.hint,
          })
        }
        
        // Create a more descriptive error message
        const errorMessage = 
          error?.message || 
          error?.details || 
          error?.hint || 
          (error?.code ? `Database error (code: ${error.code})` : "Failed to create project expenditure")
        
        throw new Error(errorMessage)
      }

      return data as ProjectExpenditure
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project_expenditure", data.project_id, organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["project_totals", organization?.id] })
      toast.success("Expenditure record added successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to add expenditure record: ${error.message}`)
    },
  })
}

export function useUpdateProjectExpenditure() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & ProjectExpenditureUpdate) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      // Validate account_id if provided
      if (updateData.account_id) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(updateData.account_id)) {
          throw new Error(`Invalid account_id format. Expected UUID, got: ${updateData.account_id}`)
        }
      }

      // Validate amount if provided
      if (updateData.amount !== undefined && (isNaN(updateData.amount) || updateData.amount <= 0)) {
        throw new Error("Amount must be greater than 0")
      }

      const { data, error } = await supabase
        .from("project_expenditure")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        } as ProjectExpenditureUpdate)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating project expenditure:", {
          message: error.message,
          details: error.details,
          code: error.code,
          hint: error.hint,
          error,
        })
        throw error
      }

      return data as ProjectExpenditure
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project_expenditure", data.project_id, organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["project_totals", organization?.id] })
      toast.success("Expenditure record updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update expenditure record: ${error.message}`)
    },
  })
}

export function useDeleteProjectExpenditure() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      // First get the project_id before deleting
      const { data: expenditureData } = await supabase
        .from("project_expenditure")
        .select("project_id")
        .eq("id", id)
        .single()

      const { error } = await supabase
        .from("project_expenditure")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error deleting project expenditure:", {
            message: error.message,
            details: error.details,
            code: error.code,
          })
        }
        throw error
      }

      return expenditureData?.project_id
    },
    onSuccess: (projectId) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project_expenditure", projectId, organization?.id] })
      }
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["project_totals", organization?.id] })
      toast.success("Expenditure record deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete expenditure record: ${error.message}`)
    },
  })
}

