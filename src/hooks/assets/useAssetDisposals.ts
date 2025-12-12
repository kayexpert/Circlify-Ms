"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "../use-organization"
import { toast } from "sonner"
import { convertDisposal } from "@/lib/utils/type-converters"
import type { AssetDisposal, AssetDisposalInsert } from "@/types/database-extension"
import type { DisposalRecord } from "@/app/(dashboard)/dashboard/asset-management/types"
import type { IncomeRecord } from "@/app/(dashboard)/dashboard/finance/types"

/**
 * Hook to fetch all asset disposals for the current organization
 * Uses selective field fetching for performance
 */
export function useAssetDisposals() {
  const { organization } = useOrganization()
  const supabase = createClient()
  const orgId = organization?.id

  return useQuery({
    queryKey: ["asset_disposals", orgId],
    queryFn: async () => {
      if (!orgId) return []

      const { data, error } = await supabase
        .from("asset_disposals")
        .select("id, asset_id, asset_name, asset_category, date, account, account_id, amount, description, linked_income_id")
        .eq("organization_id", orgId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(500)

      if (error) {
        console.error("Error fetching asset disposals:", error)
        throw error
      }

      return (data || []).map(convertDisposal)
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Hook to create a new asset disposal
 * This creates both the disposal record and an income record
 */
export function useCreateAssetDisposal() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      disposalData,
      assetId,
      accountId,
    }: {
      disposalData: Omit<DisposalRecord, "id" | "linkedIncomeId">
      assetId: string
      accountId: string
    }) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get asset details - only select needed fields
      const { data: asset, error: assetError } = await supabase
        .from("assets")
        .select("id, name, status, organization_id")
        .eq("id", assetId)
        .eq("organization_id", organization.id)
        .single()

      if (assetError || !asset) {
        throw new Error("Asset not found")
      }

      // Create income record first
      const { data: incomeRecord, error: incomeError } = await (supabase
        .from("finance_income_records") as any)
        .insert({
          organization_id: organization.id,
          account_id: accountId,
          date: disposalData.date instanceof Date ? disposalData.date.toISOString().split("T")[0] : disposalData.date,
          source: `Asset Disposal: ${disposalData.assetName}`,
          category: "Asset Disposal",
          amount: disposalData.amount,
          method: disposalData.account,
          reference: disposalData.description || null,
          linked_asset_id: assetId,
        })
        .select()
        .single()

      if (incomeError) {
        console.error("Error creating income record for disposal:", incomeError)
        throw new Error("Failed to create income record")
      }

      // Create disposal record
      const { data: disposal, error: disposalError } = await (supabase
        .from("asset_disposals") as any)
        .insert({
          organization_id: organization.id,
          asset_id: assetId,
          asset_name: disposalData.assetName,
          asset_category: disposalData.assetCategory,
          date: disposalData.date instanceof Date ? disposalData.date.toISOString().split("T")[0] : disposalData.date,
          account: disposalData.account,
          account_id: accountId,
          amount: disposalData.amount,
          description: disposalData.description || null,
          linked_income_id: incomeRecord.id,
        } as AssetDisposalInsert)
        .select()
        .single()

      if (disposalError) {
        // Rollback: delete the income record if disposal creation fails
        await supabase.from("finance_income_records").delete().eq("id", incomeRecord.id)
        console.error("Error creating disposal:", disposalError)
        throw new Error("Failed to create disposal record")
      }

      // Update asset status to "Disposed"
      await (supabase
        .from("assets") as any)
        .update({
          status: "Disposed",
          previous_status: (asset as any).status,
        })
        .eq("id", assetId)

      // Account balance is automatically updated by database trigger when income record is created
      // No need to manually update balance here - this prevents double counting

      return {
        disposal: convertDisposal(disposal),
        incomeRecord: {
          id: incomeRecord.id,
          date: new Date(incomeRecord.date + "T00:00:00"),
          source: incomeRecord.source,
          category: incomeRecord.category,
          amount: Number(incomeRecord.amount),
          method: incomeRecord.method,
          reference: incomeRecord.reference || "",
        } as IncomeRecord,
      }
    },
    onSuccess: async () => {
      // Invalidate and refetch all related queries to ensure UI updates (both main and paginated)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["asset_disposals", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["assets", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_income_records", "paginated", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] }),
      ])
      // Force refetch to ensure disposal table updates immediately
      await queryClient.refetchQueries({ queryKey: ["asset_disposals", organization?.id] })
      toast.success("Asset disposal recorded successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to create asset disposal:", error)
      toast.error(error.message || "Failed to record asset disposal")
    },
  })
}

/**
 * Hook to delete an asset disposal (reverses the disposal)
 */
export function useDeleteAssetDisposal() {
  const queryClient = useQueryClient()
  const { organization } = useOrganization()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (disposalId: string) => {
      if (!organization?.id) throw new Error("No organization selected")

      // Get disposal details - only select needed fields
      const { data: disposal, error: fetchError } = await supabase
        .from("asset_disposals")
        .select("id, asset_id, linked_income_id, organization_id")
        .eq("id", disposalId)
        .eq("organization_id", organization.id)
        .single()

      if (fetchError || !disposal) {
        throw new Error("Disposal record not found")
      }

      // Get linked income record
      const linkedIncomeId = (disposal as any).linked_income_id

      // Delete disposal record
      const { error: deleteError } = await supabase
        .from("asset_disposals")
        .delete()
        .eq("id", disposalId)
        .eq("organization_id", organization.id)

      if (deleteError) {
        console.error("Error deleting disposal:", deleteError)
        throw new Error("Failed to delete disposal record")
      }

      // Delete linked income record
      if (linkedIncomeId) {
        await supabase
          .from("finance_income_records")
          .delete()
          .eq("id", linkedIncomeId)
          .eq("organization_id", organization.id)
      }

      // Restore asset status to previous status
      const { data: asset } = await supabase
        .from("assets")
        .select("previous_status, status")
        .eq("id", (disposal as any).asset_id)
        .single()

      if (asset && (asset as any).previous_status) {
        await (supabase
          .from("assets") as any)
          .update({
            status: (asset as any).previous_status,
            previous_status: null,
          })
          .eq("id", (disposal as any).asset_id)
      } else if (asset) {
        // If no previous status, set to Available
        await (supabase
          .from("assets") as any)
          .update({
            status: "Available",
            previous_status: null,
          })
          .eq("id", (disposal as any).asset_id)
      }

      // Account balance is automatically restored by database trigger when income record is deleted
      // No need to manually update balance here
    },
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ queryKey: ["asset_disposals", organization?.id] })
      await queryClient.invalidateQueries({ queryKey: ["assets", organization?.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_income_records", organization?.id] })
      await queryClient.invalidateQueries({ queryKey: ["finance_accounts", organization?.id] })
      // Force refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ["asset_disposals", organization?.id] })
      toast.success("Asset disposal deleted successfully")
    },
    onError: (error: Error) => {
      console.error("Failed to delete asset disposal:", error)
      toast.error(error.message || "Failed to delete asset disposal")
    },
  })
}
