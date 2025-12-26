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
        .select("id, date, category, description, creditor, original_amount, amount_paid, balance, status, is_loan, linked_income_record_id, interest_rate, loan_start_date, loan_end_date, loan_duration_days, amount_received, created_at")
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
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch paginated liabilities for the current organization
 * @param isLoan - Optional filter: true for loans only, false for regular liabilities only, undefined for all
 */
export function useLiabilitiesPaginated(page: number = 1, pageSize: number = 20, enabled: boolean = true, isLoan?: boolean) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_liabilities", "paginated", organization?.id, page, pageSize, isLoan],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Build query with optional is_loan filter
      // Note: We try to select is_loan and linked_income_record_id, but if migration hasn't run,
      // these columns won't exist. We'll handle that gracefully.
      let dataQuery = supabase
        .from("finance_liabilities")
        .select("id, date, category, description, creditor, original_amount, amount_paid, balance, status, is_loan, linked_income_record_id, interest_rate, loan_start_date, loan_end_date, loan_duration_days, amount_received, created_at")
        .eq("organization_id", organization.id)

      let countQuery = supabase
        .from("finance_liabilities")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organization.id)

      // Apply is_loan filter if specified
      // Only apply filter if isLoan is explicitly true or false (not undefined)
      if (isLoan !== undefined) {
        dataQuery = dataQuery.eq("is_loan", isLoan)
        countQuery = countQuery.eq("is_loan", isLoan)
      }

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        dataQuery
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(from, to),
        countQuery
      ])

      if (dataResult.error) {
        console.error("Error fetching liabilities:", dataResult.error)
        // If error is about missing column, try without the new columns
        const errorMessage = dataResult.error.message || ""
        const errorCode = (dataResult.error as any).code || ""
        if (errorCode === "42703" || errorMessage.includes("column") || errorMessage.includes("does not exist") || errorMessage.includes("is_loan")) {
          console.warn("Loan columns not found, fetching without them. Please run migration: 20240204000000_add_loan_support_to_liabilities.sql")
          // Retry without the new columns
          let fallbackQuery = supabase
            .from("finance_liabilities")
            .select("id, date, category, description, creditor, original_amount, amount_paid, balance, status, created_at")
            .eq("organization_id", organization.id)

          if (isLoan !== undefined) {
            // Can't filter by is_loan if column doesn't exist, so return all
            console.warn("Cannot filter by is_loan - column does not exist. Returning all liabilities.")
          }

          const fallbackResult = await fallbackQuery
            .order("date", { ascending: false })
            .order("created_at", { ascending: false })
            .range(from, to)

          if (fallbackResult.error) {
            throw fallbackResult.error
          }

          // Also retry count query without the filter
          let fallbackCountQuery = supabase
            .from("finance_liabilities")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", organization.id)

          const fallbackCountResult = await fallbackCountQuery
          if (fallbackCountResult.error) {
            console.error("Error fetching count:", fallbackCountResult.error)
            // If count also fails, use data length as fallback
            const total = fallbackResult.data?.length || 0
            const totalPages = Math.ceil(total / pageSize)

            return {
              data: (fallbackResult.data || []).map(convertLiability),
              total,
              page,
              pageSize,
              totalPages,
            }
          }

          const total = fallbackCountResult.count || 0
          const totalPages = Math.ceil(total / pageSize)

          return {
            data: (fallbackResult.data || []).map(convertLiability),
            total,
            page,
            pageSize,
            totalPages,
          }
        }
        throw dataResult.error
      }

      // Also check count query error
      if (countResult.error) {
        console.error("Error fetching liabilities count:", countResult.error)
        // If count fails but data succeeded, use data length as fallback
        const total = dataResult.data?.length || 0
        const totalPages = Math.ceil(total / pageSize)

        return {
          data: (dataResult.data || []).map(convertLiability),
          total,
          page,
          pageSize,
          totalPages,
        }
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
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    gcTime: 10 * 60 * 1000,
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
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
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      // Force immediate refetch of all queries to ensure UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
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
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      // Force immediate refetch of all queries to ensure UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
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
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      // Force immediate refetch of all queries to ensure UI updates
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_expenditure_records", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
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
        .select("id, organization_id, date, category, description, creditor, original_amount, amount_paid, balance, status, is_loan, linked_income_record_id, interest_rate, loan_start_date, loan_end_date, loan_duration_days, amount_received, created_at, updated_at")
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
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
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
    staleTime: 10 * 1000, // 10 seconds - for real-time updates
    refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to create a loan/overdraft (creates both income and liability records atomically)
 */
export function useCreateLoan() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      loanData,
      accountId,
    }: {
      loanData: {
        date: Date | string
        category: string
        description: string
        lender: string // creditor for liability
        amountReceived: number // Amount received (goes to income)
        amountPayable: number // Total amount to be paid back (liability amount)
        interestRate?: number | null
        startDate?: Date | string | null
        endDate?: Date | string | null
        durationDays?: number | null
        accountName: string
      }
      accountId: string
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dateStr = loanData.date instanceof Date
        ? loanData.date.toISOString().split("T")[0]
        : loanData.date

      const startDateStr = loanData.startDate
        ? (loanData.startDate instanceof Date ? loanData.startDate.toISOString().split("T")[0] : loanData.startDate)
        : null

      const endDateStr = loanData.endDate
        ? (loanData.endDate instanceof Date ? loanData.endDate.toISOString().split("T")[0] : loanData.endDate)
        : null

      // Use a transaction-like approach: create income first, then liability
      // If liability creation fails, we'll need to clean up the income record

      // Step 1: Create income record (money received - amountReceived)
      const { data: incomeRecord, error: incomeError } = await supabase
        .from("finance_income_records")
        .insert({
          organization_id: organization.id,
          account_id: accountId,
          date: dateStr,
          source: loanData.category,
          category: loanData.category,
          amount: loanData.amountReceived, // Use amount received for income
          method: loanData.accountName,
          reference: `Loan: ${loanData.description}`,
          is_reconciled: false,
        } as never)
        .select()
        .single()

      if (incomeError) {
        console.error("Error creating income record for loan:", incomeError)
        throw new Error(`Failed to create income record: ${incomeError.message}`)
      }

      if (!incomeRecord) {
        throw new Error("Failed to create income record: No data returned")
      }

      const incomeRecordId = (incomeRecord as any).id

      // Step 2: Create liability record (amount payable - amountPayable)
      const { data: liabilityRecord, error: liabilityError } = await supabase
        .from("finance_liabilities")
        .insert({
          organization_id: organization.id,
          date: dateStr,
          category: loanData.category,
          description: loanData.description,
          creditor: loanData.lender,
          original_amount: loanData.amountPayable, // Use amount payable for liability
          amount_paid: 0,
          balance: loanData.amountPayable,
          status: "Not Paid",
          is_loan: true,
          linked_income_record_id: incomeRecordId,
          interest_rate: loanData.interestRate ?? null,
          loan_start_date: startDateStr,
          loan_end_date: endDateStr,
          loan_duration_days: loanData.durationDays ?? null,
          amount_received: loanData.amountReceived,
        } as never)
        .select()
        .single()

      if (liabilityError) {
        console.error("Error creating liability record for loan:", liabilityError)
        // Clean up: delete the income record we just created
        await supabase
          .from("finance_income_records")
          .delete()
          .eq("id", incomeRecordId)
          .eq("organization_id", organization.id)
        throw new Error(`Failed to create liability record: ${liabilityError.message}`)
      }

      if (!liabilityRecord) {
        // Clean up: delete the income record we just created
        await supabase
          .from("finance_income_records")
          .delete()
          .eq("id", incomeRecordId)
          .eq("organization_id", organization.id)
        throw new Error("Failed to create liability record: No data returned")
      }

      const liabilityId = (liabilityRecord as any).id

      // Step 3: Update income record with linked_liability_id for reverse lookup
      const { error: updateIncomeError } = await supabase
        .from("finance_income_records")
        .update({ linked_liability_id: liabilityId } as never)
        .eq("id", incomeRecordId)
        .eq("organization_id", organization.id)

      if (updateIncomeError) {
        console.error("Error linking income to liability:", updateIncomeError)
        // This is not critical, but log it
        // The loan will still work, just without reverse lookup
      }

      return {
        income: incomeRecord,
        liability: convertLiability(liabilityRecord),
      }
    },
    onSuccess: async () => {
      // Invalidate all related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      // Force immediate refetch
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_liabilities", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_accounts", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_overview", organization?.id] }),
        queryClient.refetchQueries({ queryKey: ["finance_monthly_trends", organization?.id] }),
      ])
      toast.success("Loan created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create loan:", error)
      toast.error(error.message || "Failed to create loan")
    },
  })
}
