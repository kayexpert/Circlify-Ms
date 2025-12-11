"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertReconciliation } from "@/lib/utils/type-converters"
import type {
  FinanceReconciliationRecord,
  FinanceReconciliationRecordInsert,
  FinanceReconciliationRecordUpdate,
  FinanceIncomeRecordUpdate,
  FinanceExpenditureRecordUpdate,
} from "@/types/database-extension"
import type { ReconciliationRecord } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all reconciliation records for the current organization
 * @deprecated Use useReconciliationRecordsPaginated for better performance with large datasets
 */
export function useReconciliationRecords() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_reconciliation_records", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_reconciliation_records")
        .select("id, organization_id, account_id, date, account_name, book_balance, bank_balance, difference, status, reconciled_income_entries, reconciled_expenditure_entries, added_income_entries, added_expenditure_entries, notes, created_at, updated_at")
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching reconciliation records:", error)
        throw error
      }

      return (data || []).map(convertReconciliation)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch paginated reconciliation records for the current organization
 */
export function useReconciliationRecordsPaginated(page: number = 1, pageSize: number = 20) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_reconciliation_records", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("finance_reconciliation_records")
          .select("id, organization_id, account_id, date, account_name, book_balance, bank_balance, difference, status, reconciled_income_entries, reconciled_expenditure_entries, added_income_entries, added_expenditure_entries, notes, created_at, updated_at")
          .eq("organization_id", organization.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("finance_reconciliation_records")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching reconciliation records:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertReconciliation),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch reconciliation records for a specific account
 */
export function useReconciliationByAccount(accountId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_reconciliation_records", organization?.id, accountId],
    queryFn: async () => {
      if (!organization?.id || !accountId) return []

      const { data, error } = await supabase
        .from("finance_reconciliation_records")
        .select("id, organization_id, account_id, date, account_name, book_balance, bank_balance, difference, status, reconciled_income_entries, reconciled_expenditure_entries, added_income_entries, added_expenditure_entries, notes, created_at, updated_at")
        .eq("organization_id", organization.id)
        .eq("account_id", accountId)
        .order("date", { ascending: false })

      if (error) {
        console.error("Error fetching reconciliation by account:", error)
        throw error
      }

      return (data || []).map(convertReconciliation)
    },
    enabled: !!organization?.id && !!accountId && !orgLoading,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create a new reconciliation record
 */
export function useCreateReconciliation() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      reconciliationData,
      accountId,
      reconciledIncomeEntryUUIDs = [],
      reconciledExpenditureEntryUUIDs = [],
      addedIncomeEntryUUIDs = [],
      addedExpenditureEntryUUIDs = [],
    }: {
      reconciliationData: Omit<ReconciliationRecord, "id" | "createdAt" | "accountId" | "reconciledIncomeEntries" | "reconciledExpenditureEntries" | "addedIncomeEntries" | "addedExpenditureEntries">
      accountId: string
      reconciledIncomeEntryUUIDs?: string[]
      reconciledExpenditureEntryUUIDs?: string[]
      addedIncomeEntryUUIDs?: string[]
      addedExpenditureEntryUUIDs?: string[]
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("finance_reconciliation_records") as any)
        .insert({
          organization_id: organization.id,
          date: reconciliationData.date instanceof Date
            ? reconciliationData.date.toISOString().split("T")[0]
            : reconciliationData.date,
          account_id: accountId,
          account_name: reconciliationData.accountName,
          book_balance: reconciliationData.bookBalance,
          bank_balance: reconciliationData.bankBalance,
          difference: reconciliationData.difference,
          status: reconciliationData.status,
          notes: reconciliationData.notes || null,
          reconciled_income_entries: reconciledIncomeEntryUUIDs,
          reconciled_expenditure_entries: reconciledExpenditureEntryUUIDs,
          added_income_entries: addedIncomeEntryUUIDs,
          added_expenditure_entries: addedExpenditureEntryUUIDs,
        } as FinanceReconciliationRecordInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating reconciliation:", error)
        throw error
      }

      // Update income and expenditure records to mark them as reconciled
      if (reconciledIncomeEntryUUIDs.length > 0 && data) {
        await (supabase
          .from("finance_income_records") as any)
          .update({
            is_reconciled: true,
            reconciled_in_reconciliation: (data as FinanceReconciliationRecord).id,
          } as FinanceIncomeRecordUpdate)
          .in("id", reconciledIncomeEntryUUIDs)
      }

      if (reconciledExpenditureEntryUUIDs.length > 0 && data) {
        await (supabase
          .from("finance_expenditure_records") as any)
          .update({
            is_reconciled: true,
            reconciled_in_reconciliation: (data as FinanceReconciliationRecord).id,
          } as FinanceExpenditureRecordUpdate)
          .in("id", reconciledExpenditureEntryUUIDs)
      }

      return convertReconciliation(data)
    },
    onSuccess: async () => {
      // Invalidate all related queries (both main and paginated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_reconciliation_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_reconciliation_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
      ])
      toast.success("Reconciliation record created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create reconciliation:", error)
      toast.error(error.message || "Failed to create reconciliation record")
    },
  })
}

/**
 * Hook to update a reconciliation record
 */
export function useUpdateReconciliation() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      id,
      reconciliationData,
      reconciledIncomeEntryUUIDs,
      reconciledExpenditureEntryUUIDs,
      addedIncomeEntryUUIDs,
      addedExpenditureEntryUUIDs,
      markEntriesAsReconciled = true,
    }: {
      id: string
      reconciliationData?: Partial<Omit<ReconciliationRecord, "id" | "createdAt" | "reconciledIncomeEntries" | "reconciledExpenditureEntries" | "addedIncomeEntries" | "addedExpenditureEntries">>
      reconciledIncomeEntryUUIDs?: string[]
      reconciledExpenditureEntryUUIDs?: string[]
      addedIncomeEntryUUIDs?: string[]
      addedExpenditureEntryUUIDs?: string[]
      markEntriesAsReconciled?: boolean
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<FinanceReconciliationRecordUpdate> = {}

      if (reconciliationData) {
        if (reconciliationData.date) {
          dbUpdateData.date = reconciliationData.date instanceof Date
            ? reconciliationData.date.toISOString().split("T")[0]
            : reconciliationData.date
        }
        if (reconciliationData.bookBalance !== undefined) dbUpdateData.book_balance = reconciliationData.bookBalance
        if (reconciliationData.bankBalance !== undefined) dbUpdateData.bank_balance = reconciliationData.bankBalance
        if (reconciliationData.difference !== undefined) dbUpdateData.difference = reconciliationData.difference
        if (reconciliationData.status) dbUpdateData.status = reconciliationData.status
        if (reconciliationData.notes !== undefined) dbUpdateData.notes = reconciliationData.notes || null
      }

      // Update entry arrays if provided
      if (reconciledIncomeEntryUUIDs !== undefined) {
        dbUpdateData.reconciled_income_entries = reconciledIncomeEntryUUIDs
      }
      if (reconciledExpenditureEntryUUIDs !== undefined) {
        dbUpdateData.reconciled_expenditure_entries = reconciledExpenditureEntryUUIDs
      }
      if (addedIncomeEntryUUIDs !== undefined) {
        dbUpdateData.added_income_entries = addedIncomeEntryUUIDs
      }
      if (addedExpenditureEntryUUIDs !== undefined) {
        dbUpdateData.added_expenditure_entries = addedExpenditureEntryUUIDs
      }

      // Get current reconciliation to find entries that need to be unmarked
      const { data: currentReconciliation } = await (supabase
        .from("finance_reconciliation_records") as any)
        .select("reconciled_income_entries, reconciled_expenditure_entries")
        .eq("id", id)
        .single()

      // Unmark entries that are no longer in the reconciled list
      if (currentReconciliation && reconciledIncomeEntryUUIDs !== undefined && markEntriesAsReconciled) {
        const previousIncomeEntries = ((currentReconciliation as FinanceReconciliationRecord).reconciled_income_entries || []) as string[]
        const entriesToUnmark = previousIncomeEntries.filter((entryId) => !reconciledIncomeEntryUUIDs.includes(entryId))
        
        if (entriesToUnmark.length > 0) {
          await (supabase
            .from("finance_income_records") as any)
            .update({
              is_reconciled: false,
              reconciled_in_reconciliation: null,
            } as FinanceIncomeRecordUpdate)
            .in("id", entriesToUnmark)
        }
      }

      if (currentReconciliation && reconciledExpenditureEntryUUIDs !== undefined && markEntriesAsReconciled) {
        const previousExpenditureEntries = ((currentReconciliation as FinanceReconciliationRecord).reconciled_expenditure_entries || []) as string[]
        const entriesToUnmark = previousExpenditureEntries.filter((entryId) => !reconciledExpenditureEntryUUIDs.includes(entryId))
        
        if (entriesToUnmark.length > 0) {
          await (supabase
            .from("finance_expenditure_records") as any)
            .update({
              is_reconciled: false,
              reconciled_in_reconciliation: null,
            } as FinanceExpenditureRecordUpdate)
            .in("id", entriesToUnmark)
        }
      }

      // Update reconciliation record
      const { data, error } = await (supabase
        .from("finance_reconciliation_records") as any)
        .update(dbUpdateData as FinanceReconciliationRecordUpdate)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating reconciliation:", error)
        throw error
      }

      // Mark entries as reconciled if requested
      if (markEntriesAsReconciled) {
        if (reconciledIncomeEntryUUIDs && reconciledIncomeEntryUUIDs.length > 0) {
          await (supabase
            .from("finance_income_records") as any)
            .update({
              is_reconciled: true,
              reconciled_in_reconciliation: id,
            } as FinanceIncomeRecordUpdate)
            .in("id", reconciledIncomeEntryUUIDs)
        }

        if (reconciledExpenditureEntryUUIDs && reconciledExpenditureEntryUUIDs.length > 0) {
          await (supabase
            .from("finance_expenditure_records") as any)
            .update({
              is_reconciled: true,
              reconciled_in_reconciliation: id,
            } as FinanceExpenditureRecordUpdate)
            .in("id", reconciledExpenditureEntryUUIDs)
        }
      }

      return convertReconciliation(data)
    },
    onSuccess: async () => {
      // Invalidate all related queries (both main and paginated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_reconciliation_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_reconciliation_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
      ])
      toast.success("Reconciliation record updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update reconciliation:", error)
      toast.error(error.message || "Failed to update reconciliation record")
    },
  })
}

/**
 * Hook to delete a reconciliation record
 */
export function useDeleteReconciliation() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (reconciliationId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get reconciliation details first to unmark entries
      const { data: reconciliation } = await (supabase
        .from("finance_reconciliation_records") as any)
        .select("*")
        .eq("id", reconciliationId)
        .eq("organization_id", organization.id)
        .single()

      // Unmark income records
      if (reconciliation) {
        const reconciliationRecord = reconciliation as FinanceReconciliationRecord
        if (reconciliationRecord.reconciled_income_entries && reconciliationRecord.reconciled_income_entries.length > 0) {
          await (supabase
            .from("finance_income_records") as any)
            .update({
              is_reconciled: false,
              reconciled_in_reconciliation: null,
            } as FinanceIncomeRecordUpdate)
            .in("id", reconciliationRecord.reconciled_income_entries)
        }

        // Unmark expenditure records
        if (reconciliationRecord.reconciled_expenditure_entries && reconciliationRecord.reconciled_expenditure_entries.length > 0) {
          await (supabase
            .from("finance_expenditure_records") as any)
            .update({
              is_reconciled: false,
              reconciled_in_reconciliation: null,
            } as FinanceExpenditureRecordUpdate)
            .in("id", reconciliationRecord.reconciled_expenditure_entries)
        }
      }

      const { error } = await supabase
        .from("finance_reconciliation_records")
        .delete()
        .eq("id", reconciliationId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting reconciliation:", error)
        throw error
      }
    },
    onSuccess: async () => {
      // Invalidate all related queries (both main and paginated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_reconciliation_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_reconciliation_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
      ])
      toast.success("Reconciliation record deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete reconciliation:", error)
      toast.error(error.message || "Failed to delete reconciliation record")
    },
  })
}
