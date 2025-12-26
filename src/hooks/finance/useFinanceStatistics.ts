"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"

export interface FinanceOverview {
  totalIncome: number
  totalExpenditure: number
  totalLiabilities: number
  netBalance: number
  accountCount: number
  incomeRecordCount: number
  expenditureRecordCount: number
  liabilityCount: number
}

export interface FinanceTrendData {
  period: string
  income: number
  expenses: number
  liabilities: number
}

export interface CategoryData {
  name: string
  value: number
  fill: string
}

// Colors for category charts
const INCOME_COLORS = [
  "#10b981", "#22c55e", "#84cc16", "#eab308", "#f59e0b",
  "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1"
]

const EXPENSE_COLORS = [
  "#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
]

/**
 * Hook to fetch finance overview statistics from the database
 * OPTIMIZED: Uses server-side aggregation instead of client-side calculations
 */
export function useFinanceOverview() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["finance_overview", orgId],
    queryFn: async (): Promise<FinanceOverview> => {
      if (!orgId) {
        return {
          totalIncome: 0,
          totalExpenditure: 0,
          totalLiabilities: 0,
          netBalance: 0,
          accountCount: 0,
          incomeRecordCount: 0,
          expenditureRecordCount: 0,
          liabilityCount: 0,
        }
      }

      const { data, error } = await (supabase.rpc as any)("get_finance_overview", {
        p_organization_id: orgId,
      })

      if (error) {
        console.error("Error fetching finance overview:", error)
        throw error
      }

      const stats = data?.[0] || {}

      return {
        totalIncome: Number(stats.total_income) || 0,
        totalExpenditure: Number(stats.total_expenditure) || 0,
        totalLiabilities: Number(stats.total_liabilities) || 0,
        netBalance: Number(stats.net_balance) || 0,
        accountCount: Number(stats.account_count) || 0,
        incomeRecordCount: Number(stats.income_record_count) || 0,
        expenditureRecordCount: Number(stats.expenditure_record_count) || 0,
        liabilityCount: Number(stats.liability_count) || 0,
      }
    },
    enabled: !!orgId && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds - for real-time updates
    gcTime: 10 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch monthly financial trends from the database
 * OPTIMIZED: Uses server-side aggregation
 */
export function useFinanceMonthlyTrends(months: number = 6) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["finance_monthly_trends", orgId, months],
    queryFn: async (): Promise<FinanceTrendData[]> => {
      if (!orgId) return []

      const { data, error } = await (supabase.rpc as any)("get_finance_monthly_trends", {
        p_organization_id: orgId,
        p_months: months,
      })

      if (error) {
        console.error("Error fetching monthly trends:", error)
        throw error
      }

      return (data || []).map((row: any) => ({
        period: row.period_label,
        income: Number(row.income) || 0,
        expenses: Number(row.expenditure) || 0,
        liabilities: Number(row.liabilities) || 0,
      }))
    },
    enabled: !!orgId && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds - for real-time updates
    gcTime: 15 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch yearly financial trends from the database
 * OPTIMIZED: Uses server-side aggregation
 */
export function useFinanceYearlyTrends(years: number = 5) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["finance_yearly_trends", orgId, years],
    queryFn: async (): Promise<FinanceTrendData[]> => {
      if (!orgId) return []

      const { data, error } = await (supabase.rpc as any)("get_finance_yearly_trends", {
        p_organization_id: orgId,
        p_years: years,
      })

      if (error) {
        console.error("Error fetching yearly trends:", error)
        throw error
      }

      return (data || []).map((row: any) => ({
        period: row.period_label,
        income: Number(row.income) || 0,
        expenses: Number(row.expenditure) || 0,
        liabilities: Number(row.liabilities) || 0,
      }))
    },
    enabled: !!orgId && !orgLoading,
    staleTime: 60 * 1000, // 1 minute - yearly data changes less frequently
    gcTime: 30 * 60 * 1000,
    refetchInterval: 120 * 1000, // Auto-refetch every 2 minutes for yearly trends
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch income grouped by category from the database
 * OPTIMIZED: Uses server-side aggregation
 */
export function useIncomeByCategory() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["finance_income_by_category", orgId],
    queryFn: async (): Promise<CategoryData[]> => {
      if (!orgId) return []

      const { data, error } = await (supabase.rpc as any)("get_income_by_category", {
        p_organization_id: orgId,
      })

      if (error) {
        console.error("Error fetching income by category:", error)
        throw error
      }

      return (data || []).map((row: any, index: number) => ({
        name: row.category,
        value: Number(row.total) || 0,
        fill: INCOME_COLORS[index % INCOME_COLORS.length],
      }))
    },
    enabled: !!orgId && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds - for real-time updates
    gcTime: 15 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch expenditure grouped by category from the database
 * OPTIMIZED: Uses server-side aggregation
 */
export function useExpenditureByCategory() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["finance_expenditure_by_category", orgId],
    queryFn: async (): Promise<CategoryData[]> => {
      if (!orgId) return []

      const { data, error } = await (supabase.rpc as any)("get_expenditure_by_category", {
        p_organization_id: orgId,
      })

      if (error) {
        console.error("Error fetching expenditure by category:", error)
        throw error
      }

      return (data || []).map((row: any, index: number) => ({
        name: row.category,
        value: Number(row.total) || 0,
        fill: EXPENSE_COLORS[index % EXPENSE_COLORS.length],
      }))
    },
    enabled: !!orgId && !orgLoading,
    staleTime: 30 * 1000, // 30 seconds - for real-time updates
    gcTime: 15 * 60 * 1000,
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

