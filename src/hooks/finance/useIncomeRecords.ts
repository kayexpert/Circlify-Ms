"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { sendContributionNotification, shouldSendContributionNotification } from "@/lib/services/notification.service"
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
    linkedLiabilityId: record.linked_liability_id ? parseInt(record.linked_liability_id.split("-")[0], 16) : undefined,
    reconciledInReconciliation: record.reconciled_in_reconciliation ? parseInt(record.reconciled_in_reconciliation.split("-")[0], 16) : null,
    isReconciled: record.is_reconciled || false,
  }
}

// Helper to convert component IncomeRecord to database format
function convertToDatabaseFormat(
  record: Partial<IncomeRecord>,
  organizationId: string,
  accountId: string,
  memberId?: string | null,
  linkedLiabilityId?: string | null
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
    linked_liability_id: linkedLiabilityId || null,
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
        .select("id, date, source, category, amount, method, reference, member_id, member_name, linked_asset_id, linked_liability_id, reconciled_in_reconciliation, is_reconciled")
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
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 15 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
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
          .select("id, date, source, category, amount, method, reference, member_id, member_name, linked_asset_id, linked_liability_id, reconciled_in_reconciliation, is_reconciled")
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
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 15 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
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

      const dbData = convertToDatabaseFormat(recordData, organization.id, accountId, memberId, recordData.linkedLiabilityId ? undefined : null) as FinanceIncomeRecordInsert

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
      // Invalidate and refetch all related queries to ensure immediate updates
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
      ])
      // Force immediate refetch of all queries (not just active) to ensure account statements and all related data update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      toast.success("Income record created successfully")

      // Send contribution notification if enabled and record has a member
      // Use notification service for better maintainability and error handling
      if (variables.memberId && organization?.id && variables.recordData.category) {
        try {
          // Check if notification should be sent (optimized early exit)
          const shouldSend = await shouldSendContributionNotification(
            organization.id,
            variables.recordData.category
          )

          if (shouldSend && variables.recordData.amount) {
            // Ensure date is properly formatted
            let notificationDate: Date | string = variables.recordData.date
            if (!notificationDate) {
              notificationDate = new Date()
            } else if (typeof notificationDate === 'string') {
              // Validate date string
              const dateObj = new Date(notificationDate)
              if (isNaN(dateObj.getTime())) {
                console.warn("Invalid date format for contribution notification, using current date")
                notificationDate = new Date()
              } else {
                notificationDate = dateObj
              }
            }

            // Send notification asynchronously - don't block the UI
            sendContributionNotification({
              organizationId: organization.id,
              memberId: variables.memberId,
              amount: Number(variables.recordData.amount),
              date: notificationDate,
              category: variables.recordData.category,
              currency: organization.currency,
            })
              .then((result) => {
                if (result.success) {
                  // Invalidate messaging queries on success
                  queryClient.invalidateQueries({ queryKey: ["messaging_messages", organization.id] })
                  queryClient.invalidateQueries({ queryKey: ["messaging_analytics", organization.id] })
                  queryClient.invalidateQueries({ queryKey: ["messaging_balance", organization.id] })
                } else {
                  // Log error with more details
                  console.warn("Failed to send contribution notification:", {
                    error: result.error,
                    organizationId: organization.id,
                    memberId: variables.memberId,
                    amount: variables.recordData.amount,
                  })
                }
              })
              .catch((error) => {
                // Log error but don't fail the income record creation
                console.error("Error sending contribution notification:", {
                  error: error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                  organizationId: organization.id,
                  memberId: variables.memberId,
                })
              })
          }
        } catch (error) {
          // Don't fail the income record creation if notification check fails
          console.error("Error checking contribution notification:", error)
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
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
      ])
      // Force immediate refetch of all queries (not just active) to ensure account statements and all related data update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
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
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
      ])
      // Force immediate refetch of all queries (not just active) to ensure account statements and all related data update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      toast.success("Income record deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete income record:", error)
      toast.error(error.message || "Failed to delete income record")
    },
  })
}
