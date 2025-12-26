"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertTransfer } from "@/lib/utils/type-converters"
import type { FinanceTransfer, FinanceTransferInsert, FinanceAccount } from "@/types/database-extension"
import type { TransferRecord } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all transfer records for the current organization
 */
export function useTransfers() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_transfers", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_transfers")
        .select("id, organization_id, date, from_account_id, from_account_name, to_account_id, to_account_name, amount, description, created_at, updated_at")
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching transfers:", error)
        throw error
      }

      return (data || []).map(convertTransfer)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to create a new transfer between accounts
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      transferData,
      fromAccountId,
      toAccountId,
      fromAccountName,
      toAccountName,
    }: {
      transferData: Omit<TransferRecord, "id" | "fromAccountId" | "toAccountId" | "fromAccountName" | "toAccountName">
      fromAccountId: string
      toAccountId: string
      fromAccountName: string
      toAccountName: string
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      if (fromAccountId === toAccountId) {
        throw new Error("Cannot transfer to the same account")
      }

      // Check if from account has sufficient balance
      const { data: fromAccount, error: fromAccountError } = await (supabase
        .from("finance_accounts") as any)
        .select("balance")
        .eq("id", fromAccountId)
        .eq("organization_id", organization.id)
        .single()

      if (fromAccountError) {
        throw new Error("Failed to fetch source account")
      }

      const account = fromAccount as Pick<FinanceAccount, "balance">
      if ((account.balance || 0) < transferData.amount) {
        throw new Error("Insufficient balance in source account")
      }

      // Create transfer record
      const { data, error } = await (supabase
        .from("finance_transfers") as any)
        .insert({
          organization_id: organization.id,
          date: transferData.date instanceof Date ? transferData.date.toISOString().split("T")[0] : transferData.date,
          from_account_id: fromAccountId,
          from_account_name: fromAccountName,
          to_account_id: toAccountId,
          to_account_name: toAccountName,
          amount: transferData.amount,
          description: transferData.description || null,
        } as FinanceTransferInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating transfer:", error)
        throw error
      }

      // Account balances are automatically updated by database trigger
      // Transfers are NOT income or expenditure - they're just balance movements between accounts
      // The trigger handles both accounts correctly
      // No need to manually update balance here

      return convertTransfer(data)
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
      ])
      // Force immediate refetch of all queries (not just active) to ensure account statements and all related data update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      toast.success("Transfer completed successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create transfer:", error)
      toast.error(error.message || "Failed to complete transfer")
    },
  })
}

/**
 * Hook to delete a transfer (reverses the transfer)
 */
export function useDeleteTransfer() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (transferId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get transfer details first
      const { data: transfer, error: fetchError } = await (supabase
        .from("finance_transfers") as any)
        .select("id, organization_id, date, from_account_id, from_account_name, to_account_id, to_account_name, amount, description")
        .eq("id", transferId)
        .eq("organization_id", organization.id)
        .single()

      if (fetchError || !transfer) {
        throw new Error("Transfer not found")
      }

      // Delete the transfer record
      const { error } = await (supabase
        .from("finance_transfers") as any)
        .delete()
        .eq("id", transferId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting transfer:", error)
        throw error
      }

      // Account balances are automatically restored by database trigger when transfer is deleted
      // Transfers are NOT income or expenditure - they're just balance movements
      // The trigger handles both accounts correctly
      // No need to manually update balance here
    },
    onSuccess: async () => {
      // Invalidate queries - balances are updated by triggers
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
      ])
      // Force immediate refetch of all queries (not just active) to ensure account statements and all related data update
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_transfers", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      toast.success("Transfer deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete transfer:", error)
      toast.error(error.message || "Failed to delete transfer")
    },
  })
}
