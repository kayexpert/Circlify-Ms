"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertAsset } from "@/lib/utils/type-converters"
import type { Asset, AssetInsert, AssetUpdate } from "@/types/database-extension"
import type { Asset as ComponentAsset } from "@/app/(dashboard)/dashboard/asset-management/types"

/**
 * Hook to fetch all assets for the current organization
 * Uses selective field fetching for performance
 */
export function useAssets() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["assets", orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .from("assets")
        .select("id, name, category, quantity, condition, description, purchase_date, value, status, previous_status")
        .eq("organization_id", orgId)
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1000)

      if (error) {
        console.error("Error fetching assets:", error)
        throw error
      }

      return (data || []).map(convertAsset)
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook to fetch assets by status
 * Uses selective field fetching for performance
 */
export function useAssetsByStatus(status: ComponentAsset["status"]) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["assets", orgId, status],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .from("assets")
        .select("id, name, category, quantity, condition, description, purchase_date, value, status, previous_status")
        .eq("organization_id", orgId)
        .eq("status", status)
        .order("purchase_date", { ascending: false })
        .limit(500)

      if (error) {
        console.error("Error fetching assets by status:", error)
        throw error
      }

      return (data || []).map(convertAsset)
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook to create a new asset
 */
export function useCreateAsset() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (assetData: Omit<ComponentAsset, "id">) => {
      if (!organization?.id) throw new Error("No organization selected")

      const { data, error } = await (supabase
        .from("assets") as any)
        .insert({
          organization_id: organization.id,
          name: assetData.name,
          category: assetData.category,
          quantity: assetData.quantity,
          condition: assetData.condition,
          description: assetData.description || null,
          purchase_date: assetData.purchaseDate instanceof Date
            ? assetData.purchaseDate.toISOString().split("T")[0]
            : assetData.purchaseDate,
          value: assetData.value,
          status: assetData.status,
        } as AssetInsert)
        .select()
        .single()

      if (error) {
        console.error("Error creating asset:", error)
        throw error
      }

      return convertAsset(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["asset_categories", organization?.id] })
      toast.success("Asset created successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create asset:", error)
      toast.error(error.message || "Failed to create asset")
    },
  })
}

/**
 * Hook to update an asset
 */
export function useUpdateAsset() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updateData }: Omit<Partial<ComponentAsset>, 'id'> & { id: string }) => {
      if (!organization?.id) throw new Error("No organization selected")

      const dbUpdateData: Partial<AssetUpdate> = {}

      if (updateData.name) dbUpdateData.name = updateData.name
      if (updateData.category) dbUpdateData.category = updateData.category
      if (updateData.quantity !== undefined) dbUpdateData.quantity = updateData.quantity
      if (updateData.condition) dbUpdateData.condition = updateData.condition
      if (updateData.description !== undefined) dbUpdateData.description = updateData.description || null
      if (updateData.purchaseDate) {
        dbUpdateData.purchase_date =
          updateData.purchaseDate instanceof Date
            ? updateData.purchaseDate.toISOString().split("T")[0]
            : updateData.purchaseDate
      }
      if (updateData.value !== undefined) dbUpdateData.value = updateData.value
      if (updateData.status) {
        // Store previous status before updating
        const { data: currentAsset } = await supabase
          .from("assets")
          .select("status")
          .eq("id", id)
          .single()

        if (currentAsset && (currentAsset as any).status !== updateData.status) {
          dbUpdateData.previous_status = (currentAsset as any).status as any
        }
        dbUpdateData.status = updateData.status
      }

      const { data, error } = await (supabase
        .from("assets") as any)
        .update(dbUpdateData)
        .eq("id", id)
        .eq("organization_id", organization.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating asset:", error)
        throw error
      }

      return convertAsset(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", organization?.id] })
      toast.success("Asset updated successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to update asset:", error)
      toast.error(error.message || "Failed to update asset")
    },
  })
}

/**
 * Hook to delete an asset
 */
export function useDeleteAsset() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (assetId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Check if asset has disposal records
      const { data: disposals } = await supabase
        .from("asset_disposals")
        .select("id")
        .eq("asset_id", assetId)
        .eq("organization_id", organization.id)
        .limit(1)

      if (disposals && disposals.length > 0) {
        throw new Error("Cannot delete asset with disposal records")
      }

      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", assetId)
        .eq("organization_id", organization.id)

      if (error) {
        console.error("Error deleting asset:", error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", organization?.id] })
      queryClient.invalidateQueries({ queryKey: ["asset_categories", organization?.id] })
      toast.success("Asset deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete asset:", error)
      toast.error(error.message || "Failed to delete asset")
    },
  })
}

/**
 * Hook to get a single asset by ID (UUID)
 * Uses selective field fetching for performance
 */
export function useAsset(assetId: string | null) {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["assets", orgId, assetId],
    queryFn: async () => {
      if (!orgId || !assetId) return null

      const { data, error } = await supabase
        .from("assets")
        .select("id, name, category, quantity, condition, description, purchase_date, value, status, previous_status")
        .eq("id", assetId)
        .eq("organization_id", orgId)
        .single()

      if (error) {
        console.error("Error fetching asset:", error)
        throw error
      }

      return data ? convertAsset(data) : null
    },
    enabled: !!orgId && !!assetId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}
