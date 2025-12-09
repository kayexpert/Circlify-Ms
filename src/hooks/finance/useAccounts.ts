"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertAccount, convertAccountToDB } from "@/lib/utils/type-converters"
import type { FinanceAccount, FinanceAccountInsert, FinanceAccountUpdate } from "@/types/database-extension"
import type { Account } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all finance accounts for the current organization
 * OPTIMIZED: Uses selective field fetching instead of select("*")
 * @deprecated Use useAccountsPaginated for better performance with large datasets
 */
export function useAccounts() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_accounts", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      // Select only the fields we need for display and operations
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("id, name, account_type, balance, opening_balance, description, bank_name, bank_branch, bank_account_type, account_number, network, number, created_at")
        .eq("organization_id", organization.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching accounts:", error)
        throw error
      }

      return (data || []).map(convertAccount)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds - balances are updated by triggers, so we can cache longer
    gcTime: 5 * 60 * 1000, // Keep in garbage collection for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus to reduce unnecessary requests
    refetchOnMount: true, // Refetch when component mounts to ensure fresh data
  })
}

/**
 * Hook to fetch paginated finance accounts for the current organization
 */
export function useAccountsPaginated(page: number = 1, pageSize: number = 20) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_accounts", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("finance_accounts")
          .select("id, name, account_type, balance, opening_balance, description, bank_name, bank_branch, bank_account_type, account_number, network, number, created_at")
          .eq("organization_id", organization.id)
          .order("created_at", { ascending: false })
          .range(from, to),
        supabase
          .from("finance_accounts")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching accounts:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertAccount),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}

/**
 * Hook to create a new finance account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (accountData: Omit<Account, "id" | "createdAt">) => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      const dbData = convertAccountToDB(accountData, organization.id) as FinanceAccountInsert
      
      // Ensure required fields are present
      if (!dbData.name || !dbData.account_type) {
        throw new Error("Account name and type are required")
      }
      
      // Ensure balance is set (NOT NULL constraint)
      if (dbData.balance === undefined || dbData.balance === null) {
        dbData.balance = dbData.opening_balance ?? 0
      }
      
      console.log("Creating account with data:", dbData)

      const { data, error } = await (supabase
        .from("finance_accounts") as any)
        .insert(dbData)
        .select()
        .single()

      if (error) {
        console.error("Error creating account:", error)
        console.error("Error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        
        // Handle specific error codes
        let errorMessage = "Failed to create account"
        if (error.code === "23505") { // Unique constraint violation
          errorMessage = "An account with this name already exists for your organization"
        } else if (error.code === "23502") { // Not null violation
          errorMessage = "Required fields are missing"
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.details) {
          errorMessage = error.details
        } else if (error.hint) {
          errorMessage = error.hint
        }
        
        throw new Error(errorMessage)
      }

      return convertAccount(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success("Account created successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to create account:", error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : "Failed to create account"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to update an existing finance account
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: FinanceAccountUpdate & { id: string }) => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      const { data, error } = await (supabase
        .from("finance_accounts") as any)
        .update(updateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating account:", error)
        throw error
      }

      return convertAccount(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success("Account updated successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to update account:", error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : "Failed to update account"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to delete a finance account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (accountId: string) => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      const { error } = await supabase
        .from("finance_accounts")
        .delete()
        .eq("id", accountId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting account:", error)
        const errorMessage = error.message || error.details || JSON.stringify(error) || "Failed to delete account"
        throw new Error(errorMessage)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success("Account deleted successfully")
    },
    onError: (error: Error | unknown) => {
      console.error("Failed to delete account:", error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null && 'message' in error
        ? String(error.message)
        : "Failed to delete account"
      toast.error(errorMessage)
    },
  })
}

/**
 * Hook to get a single account by ID
 */
export function useAccount(accountId: string | null) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_accounts", organization?.id, accountId],
    queryFn: async () => {
      if (!organization?.id || !accountId) return null

      const { data, error } = await supabase
        .from("finance_accounts")
        .select("*")
        .eq("id", accountId)
        .eq("organization_id", organization.id)
        .single()

      if (error) {
        console.error("Error fetching account:", error)
        const errorMessage = error.message || error.details || JSON.stringify(error) || "Failed to fetch account"
        throw new Error(errorMessage)
      }

      return data ? convertAccount(data) : null
    },
    enabled: !!organization?.id && !!accountId && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to recalculate account balances from all transactions
 * OPTIMIZED: Uses database function instead of N+1 queries
 * This ensures balances are accurate even if they got out of sync
 */
export function useRecalculateAccountBalances() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async () => {
      if (!organization?.id) {
        throw new Error("No organization selected")
      }

      // Use the database function for efficient recalculation
      // This performs all calculations in a single SQL query
      const { data, error } = await (supabase.rpc as any)("recalculate_all_account_balances", {
        p_organization_id: organization.id,
      })

      if (error) {
        console.error("Error recalculating balances:", error)
        throw error
      }

      return { recalculated: data?.length || 0 }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] })
      await queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] })
      toast.success(`Recalculated balances for ${result.recalculated} account(s)`)
    },
    onError: (error: Error) => {
      console.error("Failed to recalculate balances:", error)
      toast.error(error.message || "Failed to recalculate account balances")
    },
  })
}
