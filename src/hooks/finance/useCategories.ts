"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertCategory } from "@/lib/utils/type-converters"
import type { FinanceCategory, FinanceCategoryInsert, FinanceCategoryUpdate } from "@/types/database-extension"
import type { Category } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all finance categories for the current organization
 * @deprecated Use useCategoriesPaginated for better performance with large datasets
 */
export function useCategories() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_categories", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_categories")
        .select("id, organization_id, name, description, type, track_members, created_at, updated_at")
        .eq("organization_id", organization.id)
        .order("type", { ascending: true })
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching categories:", error)
        throw error
      }

      return (data || []).map(convertCategory)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 60 * 1000, // 1 minute - categories change less often
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch paginated finance categories for the current organization
 */
export function useCategoriesPaginated(page: number = 1, pageSize: number = 20) {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_categories", "paginated", organization?.id, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) return { data: [], total: 0, page, pageSize, totalPages: 0 }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Fetch data and count in parallel
      const [dataResult, countResult] = await Promise.all([
        supabase
          .from("finance_categories")
          .select("id, organization_id, name, description, type, track_members, created_at, updated_at")
          .eq("organization_id", organization.id)
          .order("type", { ascending: true })
          .order("name", { ascending: true })
          .range(from, to),
        supabase
          .from("finance_categories")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organization.id)
      ])

      if (dataResult.error) {
        console.error("Error fetching categories:", dataResult.error)
        throw dataResult.error
      }

      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: (dataResult.data || []).map(convertCategory),
        total,
        page,
        pageSize,
        totalPages,
      }
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 60 * 1000, // 1 minute - categories change less often
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to fetch categories by type (income, expense, liability)
 */
export function useCategoriesByType(type: "income" | "expense" | "liability") {
  const { organization, isLoading: orgLoading } = useOrganization()
  const supabase = createClient()

  return useQuery({
    queryKey: ["finance_categories", organization?.id, type],
    queryFn: async () => {
      if (!organization?.id) return []

      const { data, error } = await supabase
        .from("finance_categories")
        .select("id, organization_id, name, description, type, track_members, created_at, updated_at")
        .eq("organization_id", organization.id)
        .eq("type", type)
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching categories by type:", error)
        throw error
      }

      return (data || []).map(convertCategory)
    },
    enabled: !!organization?.id && !orgLoading,
    staleTime: 60 * 1000, // 1 minute - categories change less often
    refetchInterval: 60 * 1000, // Auto-refetch every 60 seconds
    refetchOnWindowFocus: true, // Refetch on window focus
  })
}

/**
 * Hook to create a new category
 */
export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (categoryData: Omit<Category, "id" | "createdAt">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("finance_categories") as any)
        .insert({
          organization_id: organization.id,
          name: categoryData.name,
          description: categoryData.description || null,
          type: categoryData.type,
          track_members: categoryData.trackMembers || false,
        } as FinanceCategoryInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating category:", error)
        throw error
      }

      return convertCategory(data)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finance_categories", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_categories", organization?.id, variables.type] })
      toast.success("Category created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create category:", error)
      toast.error(error.message || "Failed to create category")
    },
  })
}

/**
 * Hook to update a category
 */
export function useUpdateCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Omit<Partial<Category>, 'id'> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<FinanceCategoryUpdate> = {}

      // First, get the category to check if it's a default category
      const { data: existingCategory, error: fetchError } = await supabase
        .from("finance_categories")
        .select("name, type")
        .eq("id", id)
        .eq("organization_id", organization.id)
        .single()

      if (fetchError || !existingCategory) {
        throw new Error("Category not found")
      }

      // Prevent editing default system categories
      const defaultCategories: Record<"income" | "expense" | "liability", string[]> = {
        income: ["Asset Disposal", "Opening Balance"],
        expense: [],
        liability: ["Liabilities"],
      }

      const categoryType = (existingCategory as any).type as "income" | "expense" | "liability"
      if (defaultCategories[categoryType]?.includes((existingCategory as any).name)) {
        throw new Error("Default system categories cannot be edited")
      }

      if (updateData.name) dbUpdateData.name = updateData.name
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description || null
      if (updateData.type) dbUpdateData.type = updateData.type
      if (updateData.trackMembers !== undefined) dbUpdateData.track_members = updateData.trackMembers

      const { data, error } = await (supabase
        .from("finance_categories") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating category:", error)
        throw error
      }

      return convertCategory(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["finance_categories", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_categories", organization?.id, data.type] })
      toast.success("Category updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update category:", error)
      toast.error(error.message || "Failed to update category")
    },
  })
}

/**
 * Hook to delete a category
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // First, get the category to check if it's a default category
      const { data: category, error: fetchError } = await supabase
        .from("finance_categories")
        .select("name, type")
        .eq("id", categoryId)
        .eq("organization_id", organization.id)
        .single()

      if (fetchError || !category) {
        throw new Error("Category not found")
      }

      const categoryType = (category as any).type as "income" | "expense" | "liability"
      const categoryName = (category as any).name

      // Check if this is a default category
      const defaultCategories: Record<"income" | "expense" | "liability", string[]> = {
        income: ["Asset Disposal", "Opening Balance"],
        expense: [],
        liability: ["Liabilities"],
      }
      const isDefaultCategory = defaultCategories[categoryType]?.includes(categoryName)

      // For default categories, delete all related records first (cascade delete)
      if (isDefaultCategory) {
        // For "Asset Disposal" category, first get all linked income records to find asset disposal records
        if (categoryName === "Asset Disposal" && categoryType === "income") {
          // Get all income records with this category to find their IDs
          const { data: incomeRecords, error: incomeFetchError } = await supabase
            .from("finance_income_records")
            .select("id")
            .eq("organization_id", organization.id)
            .eq("category", categoryName)

          if (incomeFetchError) {
            console.error("Error fetching related income records:", incomeFetchError)
            throw new Error("Failed to fetch related income records")
          }

          // Delete all asset disposal records linked to these income records
          if (incomeRecords && incomeRecords.length > 0) {
            const incomeIds = incomeRecords.map((r: { id: string }) => r.id)
            const { error: disposalDeleteError } = await supabase
              .from("asset_disposals")
              .delete()
              .eq("organization_id", organization.id)
              .in("linked_income_id", incomeIds)

            if (disposalDeleteError) {
              console.error("Error deleting related asset disposal records:", disposalDeleteError)
              throw new Error("Failed to delete related asset disposal records")
            }
          }
        }

        // Delete all income records with this category
        const { error: incomeDeleteError } = await supabase
          .from("finance_income_records")
          .delete()
          .eq("organization_id", organization.id)
          .eq("category", categoryName)

        if (incomeDeleteError) {
          console.error("Error deleting related income records:", incomeDeleteError)
          throw new Error("Failed to delete related income records")
        }

        // Delete all expenditure records with this category
        const { error: expenseDeleteError } = await supabase
          .from("finance_expenditure_records")
          .delete()
          .eq("organization_id", organization.id)
          .eq("category", categoryName)

        if (expenseDeleteError) {
          console.error("Error deleting related expenditure records:", expenseDeleteError)
          throw new Error("Failed to delete related expenditure records")
        }

        // Delete all liability records with this category
        const { error: liabilityDeleteError } = await supabase
          .from("finance_liabilities")
          .delete()
          .eq("organization_id", organization.id)
          .eq("category", categoryName)

        if (liabilityDeleteError) {
          console.error("Error deleting related liability records:", liabilityDeleteError)
          throw new Error("Failed to delete related liability records")
        }
      } else {
        // For non-default categories, check if category is in use and prevent deletion
        const { data: incomeRecords } = await supabase
          .from("finance_income_records")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("category", categoryName)
          .limit(1)

        const { data: expenseRecords } = await supabase
          .from("finance_expenditure_records")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("category", categoryName)
          .limit(1)

        const { data: liabilityRecords } = await supabase
          .from("finance_liabilities")
          .select("id")
          .eq("organization_id", organization.id)
          .eq("category", categoryName)
          .limit(1)

        if (incomeRecords && incomeRecords.length > 0) {
          throw new Error("Cannot delete category that is in use by income records")
        }

        if (expenseRecords && expenseRecords.length > 0) {
          throw new Error("Cannot delete category that is in use by expenditure records")
        }

        if (liabilityRecords && liabilityRecords.length > 0) {
          throw new Error("Cannot delete category that is in use by liability records")
        }
      }

      const { error } = await supabase
        .from("finance_categories")
        .delete()
        .eq("id", categoryId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting category:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance_categories", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_expenditure_records", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_liabilities", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["asset_disposals", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["assets", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_overview", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["finance_monthly_trends", organization?.id] })
      toast.success("Category and all related records deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete category:", error)
      toast.error(error.message || "Failed to delete category")
    },
  })
}
