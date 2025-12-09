"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertBudget } from "@/lib/utils/type-converters"
import type { FinanceBudget, FinanceBudgetInsert, FinanceBudgetUpdate } from "@/types/database-extension"
import type { Budget } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all budgets for the current organization
 */
export function useBudgets() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_budgets", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_budgets")
        .select("*")
        .eq("organization_id", organization.id)
        .order("period", { ascending: false })
        .order("category", { ascending: true })

      if (error) {
        console.error("Error fetching budgets:", error)
        throw error
      }

      return (data || []).map(convertBudget)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch budgets for a specific period
 */
export function useBudgetsByPeriod(period: string) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_budgets", organization?.id, period],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_budgets")
        .select("*")
        .eq("organization_id", organization.id)
        .eq("period", period)
        .order("category", { ascending: true })

      if (error) {
        console.error("Error fetching budgets by period:", error)
        throw error
      }

      return (data || []).map(convertBudget)
    },
    enabled: !!organization?.id && !orgLoading && !!period,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to create a new budget
 */
export function useCreateBudget() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (budgetData: Omit<Budget, "id">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("finance_budgets") as any)
        .insert({
          organization_id: organization.id,
          category: budgetData.category,
          budgeted: budgetData.budgeted,
          spent: budgetData.spent || 0,
          period: budgetData.period,
        } as FinanceBudgetInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating budget:", error)
        throw error
      }

      return convertBudget(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id, data.period] })
      toast.success("Budget created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create budget:", error)
      toast.error(error.message || "Failed to create budget")
    },
  })
}

/**
 * Hook to update a budget
 */
export function useUpdateBudget() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Partial<Budget> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<FinanceBudgetUpdate> = {}

      if (updateData.category) dbUpdateData.category = updateData.category
      if (updateData.budgeted !== undefined) dbUpdateData.budgeted = updateData.budgeted
      if (updateData.spent !== undefined) dbUpdateData.spent = updateData.spent
      if (updateData.period) dbUpdateData.period = updateData.period

      const { data, error } = await (supabase
        .from("finance_budgets") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating budget:", error)
        throw error
      }

      return convertBudget(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id, data.period] })
      toast.success("Budget updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update budget:", error)
      toast.error(error.message || "Failed to update budget")
    },
  })
}

/**
 * Hook to delete a budget
 */
export function useDeleteBudget() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (budgetId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { error } = await supabase
        .from("finance_budgets")
        .delete()
        .eq("id", budgetId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting budget:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id] })
      toast.success("Budget deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete budget:", error)
      toast.error(error.message || "Failed to delete budget")
    },
  })
}

/**
 * Hook to update spent amount in budgets based on expenditure records
 * This should be called when expenditure records are created/updated/deleted
 */
export function useUpdateBudgetSpent() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ period, category }: { period: string; category: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Calculate total spent for this category in this period
      const startDate = period.endsWith("Q1")
        ? `${period.split("-")[0]}-01-01`
        : period.endsWith("Q2")
        ? `${period.split("-")[0]}-04-01`
        : period.endsWith("Q3")
        ? `${period.split("-")[0]}-07-01`
        : period.endsWith("Q4")
        ? `${period.split("-")[0]}-10-01`
        : period.length === 7
        ? `${period}-01`
        : `${period}-01-01`

      const endDate = period.endsWith("Q1")
        ? `${period.split("-")[0]}-03-31`
        : period.endsWith("Q2")
        ? `${period.split("-")[0]}-06-30`
        : period.endsWith("Q3")
        ? `${period.split("-")[0]}-09-30`
        : period.endsWith("Q4")
        ? `${period.split("-")[0]}-12-31`
        : period.length === 7
        ? `${period}-31`
        : `${period}-12-31`

      const { data: expenditures } = await supabase
        .from("finance_expenditure_records")
        .select("amount")
        .eq("organization_id", organization.id)
        .eq("category", category)
        .gte("date", startDate)
        .lte("date", endDate)

      const totalSpent =
        expenditures?.reduce((sum, exp: any) => sum + Number(exp.amount || 0), 0) || 0

      // Update budget spent amount
      const { data: budget } = await supabase
        .from("finance_budgets")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("period", period)
        .eq("category", category)
        .single()

      if (budget) {
        await (supabase
          .from("finance_budgets") as any)
          .update({ spent: totalSpent })
          .eq("id", (budget as any).id)
      }

      return totalSpent
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_budgets", organization?.id, variables.period] })
    },
    onError: (error: Error) => {
      console.error("Failed to update budget spent:", error)
    },
  })
}
