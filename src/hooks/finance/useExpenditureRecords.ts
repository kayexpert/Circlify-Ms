"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import type { FinanceExpenditureRecord, FinanceExpenditureRecordInsert, FinanceExpenditureRecordUpdate, FinanceLiability } from "@/types/database-extension"
import { convertExpenditureRecord } from "@/lib/utils/type-converters"
import type { ExpenditureRecord } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all expenditure records for the current organization
 * OPTIMIZED: Uses selective field fetching and limits
 * @deprecated Use useExpenditureRecordsPaginated for better performance with large datasets
 */
export function useExpenditureRecords(enabled: boolean = true) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_expenditure_records", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      // Select only the fields we need for display and operations
      const { data, error } = await supabase
        .from("finance_expenditure_records")
        .select("id, date, description, category, amount, method, reference, account_id, linked_liability_id, linked_liability_name, is_reconciled, reconciled_in_reconciliation")
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000) // Limit to recent records for performance

      if (error) {
        console.error("Error fetching expenditure records:", error)
        throw error
      }

      return (data || []).map(convertExpenditureRecord)
    },
    enabled: enabled && !!organization?.id && !orgLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
  })
}

/**
 * Hook to fetch paginated expenditure records for the current organization
 */
export function useExpenditureRecordsPaginated(page: number = 1, pageSize: number = 20, enabled: boolean = true) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_expenditure_records", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("finance_expenditure_records")
          .select("id, date, description, category, amount, method, reference, account_id, linked_liability_id, linked_liability_name, is_reconciled, reconciled_in_reconciliation")
          .eq("organization_id", organization.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("finance_expenditure_records")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching expenditure records:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertExpenditureRecord),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: enabled && !!organization?.id && !orgLoading,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a new expenditure record
 */
export function useCreateExpenditureRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      recordData,
      accountId,
      linkedLiabilityId,
    }: {
      recordData: Omit<ExpenditureRecord, "id">
      accountId: string
      linkedLiabilityId?: string | null
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("finance_expenditure_records") as any)
        .insert({
          organization_id: organization.id,
          account_id: accountId,
          date: recordData.date instanceof Date ? recordData.date.toISOString().split("T")[0] : recordData.date,
          description: recordData.description,
          category: recordData.category,
          amount: recordData.amount,
          method: recordData.method,
          reference: recordData.reference || null,
          linked_liability_id: linkedLiabilityId || null,
          linked_liability_name: recordData.linkedLiabilityName || null,
        } as FinanceExpenditureRecordInsert)
        .select()
        .single()

      if (error) throw error

      // Account balance is automatically updated by database trigger
      // No need to manually update balance here

      return convertExpenditureRecord(data)
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers, so we just need to refresh
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      toast.success("Expenditure record created successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create expenditure record")
    },
  })
}

/**
 * Hook to update an expenditure record
 */
export function useUpdateExpenditureRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      recordData,
      accountId,
      oldAmount,
      oldAccountId,
    }: {
      id: string
      recordData: Partial<ExpenditureRecord>
      accountId: string
      oldAmount?: number
      oldAccountId?: string
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get the old record to calculate balance changes
      const { data: oldRecord } = await supabase
        .from("finance_expenditure_records")
        .select("amount, account_id")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single()

      const oldRecordAmount = oldAmount || (oldRecord && 'amount' in oldRecord && (oldRecord as any).amount ? Number((oldRecord as any).amount) : 0)
      const oldRecordAccountId = oldAccountId || (oldRecord && 'account_id' in oldRecord ? (oldRecord as any).account_id : undefined)
      const newAmount = recordData.amount !== undefined ? Number(recordData.amount) : oldRecordAmount

      const updateData: Partial<FinanceExpenditureRecordUpdate> = {}
      if (recordData.date) updateData.date = recordData.date instanceof Date ? recordData.date.toISOString().split("T")[0] : recordData.date
      if (recordData.description) updateData.description = recordData.description
      if (recordData.category) updateData.category = recordData.category
      if (recordData.amount !== undefined) updateData.amount = recordData.amount
      if (recordData.method) updateData.method = recordData.method
      if (recordData.reference !== undefined) updateData.reference = recordData.reference || null

      const { data, error } = await (supabase
        .from("finance_expenditure_records") as any)
        .update(updateData as FinanceExpenditureRecordUpdate)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) throw error

      // Account balances are automatically updated by database trigger
      // The trigger handles account changes and amount differences automatically

      return convertExpenditureRecord(data)
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      toast.success("Expenditure record updated successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update expenditure record")
    },
  })
}

/**
 * Hook to delete an expenditure record
 */
export function useDeleteExpenditureRecord() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, accountId, amount, linkedLiabilityId }: { id: string; accountId: string; amount: number; linkedLiabilityId?: string | null }) => {
      if (!organization?.id) throw new Error("No organization selected")

      // First, get the expenditure record to check for linked liability
      const { data: recordToDelete, error: fetchRecordError } = await supabase
        .from("finance_expenditure_records")
        .select("linked_liability_id")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single()

      if (fetchRecordError) {
        console.error("Error fetching expenditure record:", fetchRecordError)
      }

      const liabilityId = linkedLiabilityId || (recordToDelete && 'linked_liability_id' in recordToDelete ? (recordToDelete as any).linked_liability_id : undefined)

      // Delete the expenditure record first to avoid any constraint issues
      const { error } = await supabase
        .from("finance_expenditure_records")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization.id)

      if (error) throw error

      // Account balance is automatically restored by database trigger when expenditure is deleted
      // No need to manually update balance here

      // After successful deletion, update the liability if this expenditure was linked to one
      // Do this after deletion to ensure the expenditure is removed even if liability update fails
      if (liabilityId) {
        try {
          // Get the liability to calculate new amountPaid
          const { data: liability, error: liabilityFetchError } = await supabase
            .from("finance_liabilities")
            .select("amount_paid, original_amount")
            .eq("id", liabilityId)
            .eq("organization_id", organization.id)
            .single()

          if (liabilityFetchError) {
            console.error("Error fetching liability for update:", liabilityFetchError)
            // Expenditure is already deleted, so just log the error
          } else if (liability && 'amount_paid' in liability) {
            // Subtract the payment amount from amountPaid
            const currentAmountPaid = Number((liability as any).amount_paid) || 0
            const newAmountPaid = Math.max(0, currentAmountPaid - amount)
            // Balance and status will be auto-calculated by database trigger
            // Just update amount_paid, trigger handles the rest
            const { error: liabilityUpdateError } = await (supabase
              .from("finance_liabilities") as any)
              .update({ amount_paid: newAmountPaid } as Partial<FinanceLiability>)
              .eq("id", liabilityId)
              .eq("organization_id", organization.id)

            if (liabilityUpdateError) {
              console.error("Error updating liability after payment deletion:", liabilityUpdateError)
              // Expenditure is already deleted, so just log the error
            }
          }
        } catch (error) {
          // Catch any unexpected errors in liability update
          console.error("Unexpected error updating liability:", error)
          // Expenditure is already deleted, so this is not critical
        }
      }
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
      ])
      toast.success("Expenditure record deleted successfully")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete expenditure record")
    },
  })
}
