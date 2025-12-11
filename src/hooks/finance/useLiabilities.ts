"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertLiability } from "@/lib/utils/type-converters"
import type { FinanceLiability, FinanceLiabilityInsert, FinanceLiabilityUpdate } from "@/types/database-extension"
import type { Liability } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all liabilities for the current organization
 * OPTIMIZED: Uses selective field fetching and limits
 * @deprecated Use useLiabilitiesPaginated for better performance with large datasets
 */
export function useLiabilities(enabled: boolean = true) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_liabilities", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      // Select only the fields we need for display and operations
      const { data, error } = await supabase
        .from("finance_liabilities")
        .select("id, date, category, description, creditor, original_amount, amount_paid, balance, status, created_at")
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500) // Limit to recent records for performance

      if (error) {
        console.error("Error fetching liabilities:", error)
        throw error
      }

      return (data || []).map(convertLiability)
    },
    enabled: enabled && !!organization?.id && !orgLoading,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false, // Reduce unnecessary refetches
  })
}

/**
 * Hook to fetch paginated liabilities for the current organization
 */
export function useLiabilitiesPaginated(page: number = 1, pageSize: number = 20, enabled: boolean = true) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_liabilities", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("finance_liabilities")
          .select("id, date, category, description, creditor, original_amount, amount_paid, balance, status, created_at")
          .eq("organization_id", organization.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("finance_liabilities")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching liabilities:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertLiability),
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
 * Hook to create a new liability
 */
export function useCreateLiability() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (liabilityData: Omit<Liability, "id" | "createdAt">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await supabase
        .from("finance_liabilities")
        .insert({
          organization_id: organization.id,
          date: liabilityData.date instanceof Date ? liabilityData.date.toISOString().split("T")[0] : liabilityData.date,
          category: liabilityData.category,
          description: liabilityData.description,
          creditor: liabilityData.creditor,
          original_amount: liabilityData.originalAmount,
          amount_paid: liabilityData.amountPaid || 0,
          // Balance and status will be calculated by trigger
        } as never)
        .select()
        .single()

      if (error) {
        console.error("Error creating liability:", error)
        throw error
      }

      return convertLiability(data)
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
      ])
      toast.success("Liability created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create liability:", error)
      toast.error(error.message || "Failed to create liability")
    },
  })
}

/**
 * Hook to update an existing liability
 */
export function useUpdateLiability() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Liability> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<FinanceLiabilityUpdate> = {}
      
      if (updateData.date) {
        dbUpdateData.date = updateData.date instanceof Date 
          ? updateData.date.toISOString().split("T")[0] 
          : updateData.date
      }
      if (updateData.category) dbUpdateData.category = updateData.category
      if (updateData.description) dbUpdateData.description = updateData.description
      if (updateData.creditor) dbUpdateData.creditor = updateData.creditor
      if (updateData.originalAmount !== undefined) dbUpdateData.original_amount = updateData.originalAmount
      if (updateData.amountPaid !== undefined) dbUpdateData.amount_paid = updateData.amountPaid
      // Balance and status are auto-calculated by trigger

      const { data, error } = await supabase
        .from("finance_liabilities")
        .update(dbUpdateData as never)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating liability:", error)
        throw error
      }

      return convertLiability(data)
    },
    onSuccess: async () => {
      // Invalidate both main and paginated queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
      ])
      toast.success("Liability updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update liability:", error)
      toast.error(error.message || "Failed to update liability")
    },
  })
}

/**
 * Hook to delete a liability
 */
export function useDeleteLiability() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (liabilityId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Check if liability has payment records and delete them first (cascade delete)
      const { data: payments, error: checkError } = await supabase
        .from("finance_expenditure_records")
        .select("id, amount, account_id")
        .eq("linked_liability_id", liabilityId)
        .eq("organization_id", organization.id)

      if (checkError) {
        console.error("Error checking liability payments:", checkError)
        throw checkError
      }

      // If there are payment records, delete them first and restore account balances
      if (payments && payments.length > 0) {
        // Delete each payment record and restore account balances
        for (const payment of payments) {
          const paymentAmount = Number((payment as any).amount) || 0
          const accountId = (payment as any).account_id

          // Delete the payment record
          const { error: deletePaymentError } = await supabase
            .from("finance_expenditure_records")
            .delete()
            .eq("id", (payment as any).id)
            .eq("organization_id", organization.id)

          if (deletePaymentError) {
            console.error(`Error deleting payment ${(payment as any).id}:`, deletePaymentError)
            // Continue with other payments even if one fails
            continue
          }

          // Restore account balance if account_id exists
          if (accountId) {
            const { data: account, error: fetchAccountError } = await supabase
              .from("finance_accounts")
              .select("balance")
              .eq("id", accountId)
              .single()

            if (!fetchAccountError && account) {
              const newBalance = (Number((account as any).balance) || 0) + paymentAmount
              await supabase
                .from("finance_accounts")
                .update({ balance: newBalance } as never)
                .eq("id", accountId)
            }
          }
        }
      }

      // Now delete the liability
      const { error } = await supabase
        .from("finance_liabilities")
        .delete()
        .eq("id", liabilityId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting liability:", error)
        throw error
      }
    },
    onSuccess: async () => {
      // Invalidate all related queries (both main and paginated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      // Force refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
      await queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success("Liability and related payments deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete liability:", error)
      toast.error(error.message || "Failed to delete liability")
    },
  })
}

/**
 * Hook to get a single liability by ID
 */
export function useLiability(liabilityId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_liabilities", organization?.id, liabilityId],
    queryFn: async () => {
      if (!organization?.id || !liabilityId) return null

      const { data, error } = await supabase
        .from("finance_liabilities")
        .select("id, organization_id, date, category, description, creditor, original_amount, amount_paid, balance, status, created_at, updated_at")
        .eq("id", liabilityId)
        .eq("organization_id", organization.id)
        .single()

      if (error) {
        console.error("Error fetching liability:", error)
        throw error
      }

      return data ? convertLiability(data) : null
    },
    enabled: !!organization?.id && !!liabilityId && !orgLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to get payment history for a liability (expenditure records linked to this liability)
 */
export function useLiabilityPayments(liabilityId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_liability_payments", organization?.id, liabilityId],
    queryFn: async () => {
      if (!organization?.id || !liabilityId) return []

      const { data, error } = await supabase
        .from("finance_expenditure_records")
        .select("id, date, description, category, amount, method, reference, account_id, linked_liability_id, linked_liability_name, is_reconciled, reconciled_in_reconciliation, created_at")
        .eq("linked_liability_id", liabilityId)
        .eq("organization_id", organization.id)
        .order("date", { ascending: false })

      if (error) {
        console.error("Error fetching liability payments:", error)
        throw error
      }

      return (data || []).map((record) => ({
        id: (record as any).id,
        date: new Date((record as any).date + "T00:00:00"),
        amount: Number((record as any).amount),
        description: (record as any).description,
        account: (record as any).method,
      }))
    },
    enabled: !!organization?.id && !!liabilityId && !orgLoading,
    staleTime: 2 * 60 * 1000,
  })
}
