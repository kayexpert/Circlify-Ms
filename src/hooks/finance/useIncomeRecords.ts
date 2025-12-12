"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { personalizeMessage, formatPhoneNumber, calculateSMSCost } from "@/app/(dashboard)/dashboard/messaging/utils"
import type { FinanceIncomeRecord, FinanceIncomeRecordInsert, FinanceIncomeRecordUpdate } from "@/types/database-extension"
import type { IncomeRecord } from "@/app/(dashboard)/dashboard/finance/types"

// Helper to convert database IncomeRecord to component IncomeRecord format
function convertIncomeRecord(record: FinanceIncomeRecord): IncomeRecord {
  return {
    id: parseInt(record.id.split("-")[0], 16) || 0, // Temporary conversion for compatibility
    date: new Date(record.date),
    source: record.source,
    category: record.category,
    amount: Number(record.amount),
    method: record.method,
    reference: record.reference || "",
    memberId: record.member_id ? parseInt(record.member_id.split("-")[0], 16) : undefined,
    memberName: record.member_name || undefined,
    linkedAssetId: record.linked_asset_id ? parseInt(record.linked_asset_id.split("-")[0], 16) : undefined,
    reconciledInReconciliation: record.reconciled_in_reconciliation ? parseInt(record.reconciled_in_reconciliation.split("-")[0], 16) : null,
    isReconciled: record.is_reconciled || false,
  }
}

// Helper to convert component IncomeRecord to database format
function convertToDatabaseFormat(
  record: Partial<IncomeRecord>, 
  organizationId: string, 
  accountId: string,
  memberId?: string | null
): Partial<FinanceIncomeRecordInsert> {
  return {
    organization_id: organizationId,
    account_id: accountId,
    date: record.date instanceof Date ? record.date.toISOString().split("T")[0] : record.date || new Date().toISOString().split("T")[0],
    source: record.source || "",
    category: record.category || "",
    amount: record.amount || 0,
    method: record.method || "",
    reference: record.reference || null,
    member_id: memberId || null,
    member_name: record.memberName || null,
    linked_asset_id: record.linkedAssetId ? undefined : null, // Will need UUID conversion if needed
    is_reconciled: record.isReconciled || false,
  }
}

/**
 * Hook to fetch all income records for the current organization
 * @param enabled - Optional flag to conditionally enable/disable the query (default: true)
 * @deprecated Use useIncomeRecordsPaginated for better performance with large datasets
 */
export function useIncomeRecords(enabled: boolean = true) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_income_records", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_income_records")
        .select("id, date, source, category, amount, method, reference, member_id, member_name, linked_asset_id, reconciled_in_reconciliation, is_reconciled")
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500) // Limit to recent records

      if (error) {
        console.error("Error fetching income records:", error)
        throw error
      }

      return (data || []).map(convertIncomeRecord)
    },
    enabled: enabled && !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes - increase cache time
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Hook to fetch paginated income records for the current organization
 */
export function useIncomeRecordsPaginated(page: number = 1, pageSize: number = 20, enabled: boolean = true) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_income_records", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("finance_income_records")
          .select("id, date, source, category, amount, method, reference, member_id, member_name, linked_asset_id, reconciled_in_reconciliation, is_reconciled")
          .eq("organization_id", organization.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("finance_income_records")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching income records:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertIncomeRecord),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: enabled && !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Hook to create a new income record
 */
export function useCreateIncomeRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      recordData,
      accountId,
      memberId,
    }: {
      recordData: Omit<IncomeRecord, "id">
      accountId: string
      memberId?: string | null
    }) => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      const dbData = convertToDatabaseFormat(recordData, organization.id, accountId, memberId) as FinanceIncomeRecordInsert

      const { data, error } = await (supabase
        .from("finance_income_records") as any)
        .insert(dbData)
        .select()
        .single()

      if (error) {
        console.error("Error creating income record:", error)
        throw error
      }

      // Account balance is automatically updated by database trigger
      // The trigger excludes opening balance records automatically
      // No need to manually update balance here

      return convertIncomeRecord(data)
    },
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["finance_income_records", organization?.id] })
      const previous = queryClient.getQueryData<IncomeRecord[]>(["finance_income_records", organization?.id])
      
      const optimisticRecord: IncomeRecord = {
        ...variables.recordData,
        id: Date.now(), // Temporary ID
      }
      
      queryClient.setQueryData<IncomeRecord[]>(["finance_income_records", organization?.id], (old = []) => [
        optimisticRecord,
        ...old,
      ])

      return { previous }
    },
    onError: (err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["finance_income_records", organization?.id], context.previous)
      }
      toast.error(err.message || "Failed to create income record")
    },
    onSuccess: async (createdRecord, variables) => {
      // Invalidate and refetch accounts to ensure balance is updated
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      // Force refetch accounts immediately
      await queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success("Income record created successfully")

      // Send contribution notification if enabled and record has a member
      if (variables.memberId && organization?.id) {
        try {
          // Check if the category tracks members (indicating it's a contribution)
          const { data: category } = await supabase
            .from("finance_categories")
            .select("track_members")
            .eq("organization_id", organization.id)
            .eq("name", variables.recordData.category)
            .eq("type", "income")
            .maybeSingle()

          // Only send notification if category tracks members (it's a contribution)
          if (!(category as any)?.track_members) {
            return
          }

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
              console.log("No active API configuration found for contribution notification")
              return
            }

            // Get member data including phone number
            const { data: member } = await supabase
              .from("members")
              .select("id, first_name, last_name, phone_number")
              .eq("id", variables.memberId)
              .eq("organization_id", organization.id)
              .maybeSingle()

            if (!member || !(member as any).phone_number) {
              console.log("Member not found or no phone number for contribution notification")
              return
            }

            // Get template if configured
            let messageText = `Thank you for your contribution of ${variables.recordData.amount?.toLocaleString() || 0} ${organization.currency || "USD"} on ${new Date(variables.recordData.date).toLocaleDateString()}. We appreciate your support!`
            
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
                  Amount: (variables.recordData.amount || 0).toLocaleString(),
                  Currency: organization.currency || "USD",
                  Date: new Date(variables.recordData.date).toLocaleDateString(),
                  Category: variables.recordData.category || "",
                })
              }
            } else {
              // Personalize default message
              messageText = personalizeMessage(messageText, {
                FirstName: (member as any).first_name || "",
                LastName: (member as any).last_name || "",
                PhoneNumber: formatPhoneNumber((member as any).phone_number) || (member as any).phone_number,
                Amount: (variables.recordData.amount || 0).toLocaleString(),
                Currency: organization.currency || "GHS",
                Date: new Date(variables.recordData.date).toLocaleDateString(),
                Category: variables.recordData.category || "",
              })
            }

            // Get current user for created_by
            const {
              data: { user },
            } = await supabase.auth.getUser()
            if (!user) {
              console.log("User not authenticated for contribution notification")
              return
            }

            // Calculate cost
            const cost = calculateSMSCost(messageText.length, 1)

            // Create message record
            const { data: message, error: messageError } = await supabase
              .from("messaging_messages")
              .insert({
                organization_id: organization.id,
                message_name: `Contribution Notification - ${(member as any).first_name} ${(member as any).last_name}`,
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
              console.error("Error creating contribution notification message:", messageError)
              return
            }

            // Create recipient record
            const formattedPhone = formatPhoneNumber((member as any).phone_number)
            const { error: recipientError } = await supabase
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

            if (recipientError) {
              console.error("Error creating recipient record:", recipientError)
            }

            // Send the message
            try {
              const destinations = [{
                phone: formattedPhone || (member as any).phone_number,
                message: messageText,
                msgid: `MSG_${(message as any).id}_${(member as any).id}_${Date.now()}`,
              }]

              const batchResponse = await fetch("/api/messaging/send-sms", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  apiKey: (activeApiConfig as any).api_key,
                  username: (activeApiConfig as any).username || (activeApiConfig as any).api_key,
                  senderId: (activeApiConfig as any).sender_id,
                  destinations,
                }),
              })

              const batchResult = await batchResponse.json()

              const responseMessage = batchResult.message || batchResult.error?.message || ""
              const isAcceptedMessage = responseMessage.toLowerCase().includes("accepted") || 
                                       responseMessage.toLowerCase().includes("processing")
              
              const isSuccess = batchResponse.ok && (
                batchResult.success === true || 
                isAcceptedMessage ||
                (batchResult.data && !batchResult.error)
              )

              if (isSuccess) {
                // Update message and recipient status
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
                  .eq("message_id", (message as any).id)

                // Invalidate messaging queries
                await queryClient.invalidateQueries({ queryKey: ["messaging_messages", organization.id] })
                await queryClient.invalidateQueries({ queryKey: ["messaging_analytics", organization.id] })
                await queryClient.invalidateQueries({ queryKey: ["messaging_balance", organization.id] })
              } else {
                const errorMessage = 
                  batchResult.error?.message || 
                  batchResult.error || 
                  (typeof batchResult.error === "string" ? batchResult.error : null) ||
                  batchResult.message ||
                  "Failed to send SMS"

                await supabase
                  .from("messaging_messages")
                  .update({
                    status: "Failed",
                    error_message: errorMessage,
                  } as never)
                  .eq("id", (message as any).id)

                await supabase
                  .from("messaging_message_recipients")
                  .update({
                    status: "Failed",
                    error_message: errorMessage,
                  } as never)
                  .eq("message_id", (message as any).id)

                console.error("Failed to send contribution notification:", errorMessage)
              }
            } catch (sendError) {
              console.error("Error sending contribution notification:", sendError)
              await supabase
                .from("messaging_messages")
                .update({
                  status: "Failed",
                  error_message: sendError instanceof Error ? sendError.message : "Failed to send SMS",
                } as never)
                .eq("id", (message as any).id)
            }
          }
        } catch (error) {
          // Don't fail the income record creation if notification fails
          console.error("Error sending contribution notification:", error)
        }
      }
    },
  })
}

/**
 * Hook to update an income record
 */
export function useUpdateIncomeRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      recordData,
      accountId,
      memberId,
      oldAmount,
      oldAccountId,
    }: {
      id: string
      recordData: Partial<IncomeRecord>
      accountId: string
      memberId?: string | null
      oldAmount?: number
      oldAccountId?: string
    }) => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      // Get the old record to calculate balance changes
      const { data: oldRecord } = await supabase
        .from("finance_income_records")
        .select("amount, account_id, category, reference")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single()

      const oldRecordAmount = oldAmount || ((oldRecord as any)?.amount ? Number((oldRecord as any).amount) : 0)
      const oldRecordAccountId = oldAccountId || (oldRecord as any)?.account_id
      
      // Check if old record is an opening balance record
      const oldIsOpeningBalance = 
        (oldRecord as any)?.category === "Opening Balance" ||
        ((oldRecord as any)?.reference && (oldRecord as any).reference.toLowerCase().includes("opening balance"))

      const updateData = convertToDatabaseFormat(recordData, organization.id, accountId, memberId)
      const newAmount = recordData.amount ? Number(recordData.amount) : oldRecordAmount
      
      // Check if new record is an opening balance record
      const newIsOpeningBalance = 
        recordData.category === "Opening Balance" ||
        (recordData.reference && recordData.reference.toLowerCase().includes("opening balance"))

      // Update the record
      const { data, error } = await supabase
        .from("finance_income_records")
        .update(updateData as never)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating income record:", error)
        throw error
      }

      // Account balances are automatically updated by database trigger
      // The trigger handles opening balance exclusion and account changes automatically
      // No need to manually update balance here

      return convertIncomeRecord(data)
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      toast.success("Income record updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update income record:", error)
      toast.error(error.message || "Failed to update income record")
    },
  })
}

/**
 * Hook to delete an income record
 */
export function useDeleteIncomeRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, accountId, amount }: { id: string; accountId: string; amount: number }) => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      const { error } = await supabase
        .from("finance_income_records")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting income record:", error)
        throw error
      }

      // Account balance is automatically updated by database trigger
      // The trigger excludes opening balance records automatically
      // No need to manually update balance here
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      toast.success("Income record deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete income record:", error)
      toast.error(error.message || "Failed to delete income record")
    },
  })
}
