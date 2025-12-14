"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { sendContributionNotification, shouldSendContributionNotification } from "@/lib/services/notification.service"
import type { ProjectIncome, ProjectIncomeInsert, ProjectIncomeUpdate } from "@/types/database-extension"

export function useProjectIncome(projectId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["project_income", projectId, organization?.id],
    queryFn: async () => {
      if (!organization?.id || !projectId) return []

      const { data, error } = await supabase
        .from("project_income")
        .select(`
          *,
          members (
            id,
            first_name,
            last_name
          )
        `)
        .eq("project_id", projectId)
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching project income:", error)
        throw error
      }

      return (data || []) as (ProjectIncome & { members: { id: string; first_name: string; last_name: string } | null })[]
    },
    enabled: !!organization?.id && !!projectId && !orgLoading,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  })
}

export function useCreateProjectIncome() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ projectId, ...incomeData }: { projectId: string } & Omit<ProjectIncomeInsert, "organization_id" | "project_id">) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      // Validate required fields
      if (!incomeData.date || !incomeData.amount || !incomeData.account_id) {
        throw new Error("Missing required fields: date, amount, or account_id")
      }

      // Validate amount
      if (isNaN(incomeData.amount) || incomeData.amount <= 0) {
        throw new Error("Amount must be greater than 0")
      }

      // CRITICAL: Validate account_id is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(incomeData.account_id)) {
        throw new Error(`Invalid account_id format. Expected UUID, got: ${incomeData.account_id} (type: ${typeof incomeData.account_id})`)
      }

      // CRITICAL: Validate member_id is a valid UUID format if provided
      if (incomeData.member_id && !uuidRegex.test(incomeData.member_id)) {
        throw new Error(`Invalid member_id format. Expected UUID, got: ${incomeData.member_id} (type: ${typeof incomeData.member_id})`)
      }

      const { data, error } = await (supabase
        .from("project_income") as any)
        .insert({
          ...incomeData,
          project_id: projectId,
          organization_id: organization.id,
        } as ProjectIncomeInsert)
        .select()
        .single()

      if (error) {
        // Log error details for debugging (only in development)
        if (process.env.NODE_ENV === "development") {
          console.error("Error creating project income:", {
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
          (error?.code ? `Database error (code: ${error.code})` : "Failed to create project income")
        
        throw new Error(errorMessage)
      }

      return data as ProjectIncome
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["project_income", data.project_id, organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["project_totals", organization?.id] })
      toast.success("Income record added successfully")

      // Send contribution notification if enabled and record has a member
      // Use notification service for better maintainability
      if (variables.member_id && organization?.id && variables.amount) {
        try {
          // Check if contribution notifications are enabled (optimized early exit)
          // Use "Project" category to match shouldSendContributionNotification logic
          const shouldSend = await shouldSendContributionNotification(organization.id, "Project")
          
          if (shouldSend) {
            // Get project name for the notification
            const { data: projectData } = await supabase
              .from("projects")
              .select("name")
              .eq("id", data.project_id)
              .maybeSingle()
            
            const projectName = (projectData as any)?.name || "the project"

            // Send notification asynchronously - don't block the UI
            sendContributionNotification({
              organizationId: organization.id,
              memberId: variables.member_id as string,
              amount: variables.amount,
              date: variables.date,
              category: "Project Contribution",
              currency: organization.currency,
              projectName: projectName, // Include project name for project contributions
            })
              .then((result) => {
                if (result.success) {
                  // Invalidate messaging queries on success
                  queryClient.invalidateQueries({ queryKey: ["messaging_messages", organization.id] })
                  queryClient.invalidateQueries({ queryKey: ["messaging_analytics", organization.id] })
                  queryClient.invalidateQueries({ queryKey: ["messaging_balance", organization.id] })
                } else {
                  // Log error but don't show toast - notification is optional
                  console.warn("Failed to send project contribution notification:", {
                    error: result.error,
                    organizationId: organization.id,
                    memberId: variables.member_id,
                    amount: variables.amount,
                    projectName: projectName,
                  })
                }
              })
              .catch((error) => {
                // Log error but don't fail the income record creation
                console.error("Error sending project contribution notification:", {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                  organizationId: organization.id,
                  memberId: variables.member_id,
                  amount: variables.amount,
                })
              })
          }
        } catch (error) {
          // Don't fail the income record creation if notification check fails
          console.error("Error checking project contribution notification:", {
            error: error instanceof Error ? error.message : String(error),
            organizationId: organization.id,
            memberId: variables.member_id,
          })
        }
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to add income record: ${error.message}`)
    },
  })
}

export function useUpdateProjectIncome() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: { id: string } & ProjectIncomeUpdate) => {
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

      // Validate member_id if provided
      if (updateData.member_id !== undefined) {
        if (updateData.member_id !== null) {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          if (!uuidRegex.test(updateData.member_id)) {
            throw new Error(`Invalid member_id format. Expected UUID, got: ${updateData.member_id}`)
          }
        }
      }

      // Validate amount if provided
      if (updateData.amount !== undefined && (isNaN(updateData.amount) || updateData.amount <= 0)) {
        throw new Error("Amount must be greater than 0")
      }

      const { data, error } = await (supabase
        .from("project_income") as any)
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        } as ProjectIncomeUpdate)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating project income:", {
          message: error.message,
          details: error.details,
          code: error.code,
          hint: error.hint,
          error,
        })
        throw error
      }

      return data as ProjectIncome
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project_income", data.project_id, organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["project_totals", organization?.id] })
      toast.success("Income record updated successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to update income record: ${error.message}`)
    },
  })
}

export function useDeleteProjectIncome() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) {
        throw new Error("Organization not found")
      }

      // First get the project_id before deleting
      const { data: incomeData, error: fetchError } = await supabase
        .from("project_income")
        .select("project_id")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single()

      if (fetchError) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error fetching project income before delete:", {
            message: fetchError.message,
            details: fetchError.details,
            code: fetchError.code,
            hint: fetchError.hint,
          })
        }
        
        const errorMessage = 
          fetchError.message || 
          fetchError.details || 
          fetchError.hint || 
          (fetchError.code ? `Database error (code: ${fetchError.code})` : "Failed to fetch project income record")
        
        throw new Error(errorMessage)
      }

      if (!incomeData) {
        throw new Error("Project income record not found")
      }

      const { data: deleteData, error } = await supabase
        .from("project_income")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()

      if (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Error deleting project income:", {
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
          (error?.code ? `Database error (code: ${error.code})` : "Failed to delete project income")
        
        throw new Error(errorMessage)
      }

      // Check if anything was actually deleted
      if (!deleteData || deleteData.length === 0 && process.env.NODE_ENV === "development") {
        console.warn("Delete operation completed but no rows were deleted for ID:", id)
      }

      return (incomeData as any).project_id
    },
    onSuccess: (projectId) => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ["project_income", projectId, organization?.id] })
      }
      queryClient.invalidateQueries({ queryKey: ["projects", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success("Income record deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete income record: ${error.message}`)
    },
  })
}

