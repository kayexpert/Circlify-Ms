"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { personalizeMessage, formatPhoneNumber, calculateSMSCost } from "@/app/(dashboard)/dashboard/messaging/utils"
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

      const { data, error } = await supabase
        .from("project_income")
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
      if (variables.member_id && organization?.id) {
        try {
          // Check if contribution notifications are enabled
          const { data: notificationSettings } = await supabase
            .from("messaging_notification_settings")
            .select("contribution_notifications_enabled, contribution_template_id")
            .eq("organization_id", organization.id)
            .maybeSingle()

          if ((notificationSettings as any)?.contribution_notifications_enabled) {
            // Get active API configuration
            const { data: activeApiConfig } = await supabase
              .from("messaging_api_configurations")
              .select("*")
              .eq("organization_id", organization.id)
              .eq("is_active", true)
              .maybeSingle()

            if (!activeApiConfig) {
              if (process.env.NODE_ENV === "development") {
                console.log("No active API configuration found for project contribution notification")
              }
              return
            }

            // Get member data including phone number
            const { data: member } = await supabase
              .from("members")
              .select("id, first_name, last_name, phone_number")
              .eq("id", variables.member_id)
              .eq("organization_id", organization.id)
              .maybeSingle()

            if (!member || !(member as any).phone_number) {
              if (process.env.NODE_ENV === "development") {
                console.log("Member not found or no phone number for project contribution notification")
              }
              return
            }

            // Get project name for the message
            const { data: projectData } = await supabase
              .from("projects")
              .select("name")
              .eq("id", data.project_id)
              .maybeSingle()

            const projectName = (projectData as any)?.name || "the project"

            // Get template if configured
            let messageText = `Thank you for your contribution of ${variables.amount?.toLocaleString() || 0} ${organization.currency || "GHS"} to ${projectName} on ${new Date(variables.date).toLocaleDateString()}. We appreciate your support!`
            
            if ((notificationSettings as any).contribution_template_id) {
              const { data: template } = await supabase
                .from("messaging_templates")
                .select("message")
                .eq("id", (notificationSettings as any).contribution_template_id)
                .eq("organization_id", organization.id)
                .maybeSingle()

              if ((template as any)?.message) {
                messageText = personalizeMessage((template as any).message, {
                  FirstName: (member as any).first_name || "",
                  LastName: (member as any).last_name || "",
                  PhoneNumber: formatPhoneNumber((member as any).phone_number) || (member as any).phone_number,
                  Amount: (variables.amount || 0).toLocaleString(),
                  Currency: organization.currency || "GHS",
                  Date: new Date(variables.date).toLocaleDateString(),
                  Category: projectName, // Use project name instead of category for project contributions
                  ProjectName: projectName,
                })
              }
            } else {
              // Personalize default message
              messageText = personalizeMessage(messageText, {
                FirstName: (member as any).first_name || "",
                LastName: (member as any).last_name || "",
                PhoneNumber: formatPhoneNumber((member as any).phone_number) || (member as any).phone_number,
                Amount: (variables.amount || 0).toLocaleString(),
                Currency: organization.currency || "GHS",
                Date: new Date(variables.date).toLocaleDateString(),
                Category: projectName, // Use project name instead of category for project contributions
                ProjectName: projectName,
              })
            }

            // Get current user for created_by
            const {
              data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
              if (process.env.NODE_ENV === "development") {
                console.log("User not authenticated for project contribution notification")
              }
              return
            }

            // Calculate cost
            const cost = calculateSMSCost(messageText.length, 1)

            // Create message record
            const { data: message, error: messageError } = await supabase
              .from("messaging_messages")
              .insert({
                organization_id: organization.id,
                message_name: `Project Contribution Notification - ${(member as any).first_name} ${(member as any).last_name}`,
                message_text: messageText,
                recipient_type: "individual",
                recipient_count: 1,
                status: "Sending",
                template_id: (notificationSettings as any).contribution_template_id || null,
                api_configuration_id: (activeApiConfig as any).id,
                cost: cost,
                created_by: user.id,
              } as never)
              .select()
              .single()

            if (messageError) {
              console.error("Error creating project contribution notification message:", messageError)
              return
            }

            // Create recipient record
            const formattedPhone = formatPhoneNumber((member as any).phone_number)
            const { data: recipient, error: recipientError } = await supabase
              .from("messaging_message_recipients")
              .insert({
                message_id: (message as any).id,
                recipient_type: "member",
                recipient_id: (member as any).id,
                phone_number: formattedPhone || (member as any).phone_number,
                recipient_name: `${(member as any).first_name} ${(member as any).last_name}`,
                personalized_message: messageText,
                status: "Pending",
                cost: cost,
              } as never)
              .select()
              .single()

            if (recipientError) {
              console.error("Error creating recipient record:", recipientError)
              // Update message status to Failed
              await supabase
                .from("messaging_messages")
                .update({ status: "Failed", error_message: "Failed to create recipient record" } as never)
                .eq("id", (message as any).id)
              return
            }

            // Actually send the SMS via API
            try {
              const { formatPhoneForWigal } = await import("@/lib/services/wigal-sms.service")
              
              const sendResponse = await fetch("/api/messaging/send-sms", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  apiKey: (activeApiConfig as any).api_key,
                  username: (activeApiConfig as any).username || (activeApiConfig as any).api_key,
                  senderId: (activeApiConfig as any).sender_id,
                  destinations: [{
                    phone: formattedPhone || (member as any).phone_number,
                    message: messageText,
                    msgid: `MSG_${(message as any).id}_${(member as any).id}_${Date.now()}`,
                  }],
                }),
              })

              const sendResult = await sendResponse.json()

              if (sendResult.success || sendResponse.ok) {
                // Update message and recipient status to Sent
                await supabase
                  .from("messaging_messages")
                  .update({
                    status: "Sent",
                    sent_at: new Date().toISOString(),
                  } as never)
                  .eq("id", (message as any).id)

                await supabase
                  .from("messaging_message_recipients")
                  .update({
                    status: "Sent",
                    sent_at: new Date().toISOString(),
                  } as never)
                  .eq("id", (recipient as any).id)
              } else {
                // Update message and recipient status to Failed
                const errorMsg = sendResult.error?.message || sendResult.message || "Failed to send SMS"
                await supabase
                  .from("messaging_messages")
                  .update({
                    status: "Failed",
                    error_message: errorMsg,
                  } as never)
                  .eq("id", (message as any).id)

                await supabase
                  .from("messaging_message_recipients")
                  .update({
                    status: "Failed",
                    error_message: errorMsg,
                  } as never)
                  .eq("id", (recipient as any).id)
              }
            } catch (sendError) {
              console.error("Error sending SMS via API:", sendError)
              // Update message and recipient status to Failed
              const errorMsg = sendError instanceof Error ? sendError.message : "Failed to send SMS"
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Failed",
                  error_message: errorMsg,
                } as never)
                .eq("id", (message as any).id)

              if (recipient) {
                await supabase
                  .from("messaging_message_recipients")
                  .update({
                    status: "Failed",
                    error_message: errorMsg,
                  } as never)
                  .eq("id", (recipient as any).id)
              }
            }
          }
        } catch (error) {
          console.error("Error sending project contribution notification:", error)
          // Don't throw - SMS failure shouldn't block the income record creation
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

      const { data, error } = await supabase
        .from("project_income")
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

      return incomeData.project_id
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

