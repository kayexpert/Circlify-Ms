"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertAssetCategory } from "@/lib/utils/type-converters"
import type { AssetCategory, AssetCategoryInsert, AssetCategoryUpdate } from "@/types/database-extension"
import type { AssetCategory as ComponentAssetCategory } from "@/app/(dashboard)/dashboard/asset-management/types"

/**
 * Hook to fetch all asset categories for the current organization
 * Uses server-side aggregation for asset counts
 */
export function useAssetCategories() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["asset_categories", orgId],
    queryFn: async () => {
      if (!orgId) return []

      // Fetch categories with selective fields
      const { data: categories, error: categoriesError } = await supabase
        .from("asset_categories")
        .select("id, name, description, created_at")
        .eq("organization_id", orgId)
        .order("name", { ascending: true })

      if (categoriesError) {
        console.error("Error fetching asset categories:", categoriesError)
        throw categoriesError
      }

      // Get asset counts using optimized server-side RPC function
      const { data: countsData, error: countsError } = await (supabase.rpc as any)('get_asset_category_counts', {
        p_organization_id: orgId,
      })

      if (countsError) {
        console.error("Error fetching asset category counts:", countsError)
        // Don't throw - just use empty counts
      }

      // Build counts map from RPC result
      const categoryCounts = new Map<string, number>()
      ;(countsData || []).forEach((item: { category_name: string; asset_count: number }) => {
        categoryCounts.set(item.category_name, item.asset_count)
      })

      return (categories || []).map((cat: any) => {
        const converted = convertAssetCategory(cat)
        return {
          ...converted,
          assetCount: categoryCounts.get(cat.name) || 0,
        }
      })
    },
    enabled: !!orgId,
    staleTime: 15 * 60 * 1000, // 15 minutes - categories don't change often
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook to create a new asset category
 */
export function useCreateAssetCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (categoryData: Omit<ComponentAssetCategory, "id" | "createdAt" | "assetCount">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("asset_categories") as any)
        .insert({
          organization_id: organization.id,
          name: categoryData.name,
          description: categoryData.description || null,
        } as AssetCategoryInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating asset category:", error)
        throw error
      }

      return convertAssetCategory(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset_categories", organization?.id] })
      toast.success("Asset category created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create asset category:", error)
      toast.error(error.message || "Failed to create asset category")
    },
  })
}

/**
 * Hook to update an asset category
 */
export function useUpdateAssetCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Omit<Partial<ComponentAssetCategory>, 'id'> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<AssetCategoryUpdate> = {}

      if (updateData.name) dbUpdateData.name = updateData.name
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description || null

      const { data, error } = await (supabase
        .from("asset_categories") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating asset category:", error)
        throw error
      }

      return convertAssetCategory(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset_categories", organization?.id] })
      toast.success("Asset category updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update asset category:", error)
      toast.error(error.message || "Failed to update asset category")
    },
  })
}

/**
 * Hook to delete an asset category
 */
export function useDeleteAssetCategory() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Check if category is in use
      const { data: assets } = await supabase
        .from("assets")
        .select("id")
        .eq("organization_id", organization.id)
        .limit(1)

      if (assets && assets.length > 0) {
        // Get category name
        const { data: category } = await supabase
          .from("asset_categories")
          .select("name")
          .eq("id", categoryId)
          .single()

        if (category) {
          const { data: assetsUsingCategory } = await supabase
            .from("assets")
            .select("id")
            .eq("organization_id", organization.id)
            .eq("category", (category as any).name)
            .limit(1)

          if (assetsUsingCategory && assetsUsingCategory.length > 0) {
            throw new Error("Cannot delete category that is in use by assets")
          }
        }
      }

      const { error } = await supabase
        .from("asset_categories")
        .delete()
        .eq("id", categoryId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting asset category:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset_categories", organization?.id] })
      toast.success("Asset category deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete asset category:", error)
      toast.error(error.message || "Failed to delete asset category")
    },
  })
}
