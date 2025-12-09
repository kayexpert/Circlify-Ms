"use client"

import React, { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useCreateAssetDisposal } from "@/hooks/assets"
import { useAccounts } from "@/hooks/finance/useAccounts"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import type { Asset } from "./types"

interface DisposalDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedAsset: Asset | null
}

export default function DisposalDrawer({
  isOpen,
  onOpenChange,
  selectedAsset,
}: DisposalDrawerProps) {
  const [disposalFormData, setDisposalFormData] = useState({
    date: new Date() as Date | undefined,
    account: "",
    amount: "",
    description: "",
  })

  const { organization } = useOrganization()
  const supabase = createClient()

  // Fetch accounts using hooks
  const { data: accounts = [] } = useAccounts()

  // Mutation
  const createDisposal = useCreateAssetDisposal()

  // Reset form when drawer opens/closes or asset changes
  useEffect(() => {
    if (isOpen && selectedAsset) {
      setDisposalFormData({
        date: new Date(),
        account: "",
        amount: "",
        description: "",
      })
    }
  }, [isOpen, selectedAsset])

  // Helper to get asset UUID by number ID
  const getAssetUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("id")
        .eq("organization_id", organization.id)
        .limit(1000)

      if (error) {
        console.error("Error fetching assets for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingAsset = data.find((asset: { id: string }) => {
        const convertedId = parseInt(asset.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === numberId
      })

      return (matchingAsset as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getAssetUUID:", error)
      return null
    }
  }

  // Helper to get account UUID by number ID
  const getAccountUUID = async (numberId: number): Promise<string | null> => {
    if (!organization?.id) return null
    
    const currentAccount = accounts.find(account => account.id === numberId)
    if (!currentAccount) return null

    try {
      const { data, error } = await supabase
        .from("finance_accounts")
        .select("id")
        .eq("organization_id", organization.id)
        .limit(1000)

      if (error) {
        console.error("Error fetching accounts for UUID lookup:", error)
        return null
      }

      if (!data || data.length === 0) return null

      const matchingAccount = data.find((account: { id: string }) => {
        const convertedId = parseInt(account.id.replace(/-/g, "").substring(0, 8), 16) || 0
        return convertedId === numberId
      })

      return (matchingAccount as { id: string } | undefined)?.id || null
    } catch (error) {
      console.error("Error in getAccountUUID:", error)
      return null
    }
  }

  const handleCancel = () => {
    setDisposalFormData({
      date: new Date(),
      account: "",
      amount: "",
      description: "",
    })
    onOpenChange(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAsset) {
      toast.error("No asset selected")
      return
    }

    if (!disposalFormData.date || !disposalFormData.account || !disposalFormData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = parseFloat(disposalFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    const accountIdNum = parseInt(disposalFormData.account)
    if (isNaN(accountIdNum)) {
      toast.error("Invalid account selection")
      return
    }

    const selectedAccount = accounts.find((a) => a.id === accountIdNum)
    if (!selectedAccount) {
      toast.error("Account not found")
      return
    }

    if (selectedAsset.status === "Disposed") {
      toast.error("This asset is already disposed")
      return
    }

    try {
      // Get UUIDs
      const assetUUID = await getAssetUUID(selectedAsset.id)
      const accountUUID = await getAccountUUID(accountIdNum)

      if (!assetUUID || !accountUUID) {
        toast.error("Failed to resolve asset or account")
        return
      }

      // Create disposal - hook handles income record creation, asset status update, and account balance update
      await createDisposal.mutateAsync({
        disposalData: {
          assetId: selectedAsset.id,
          assetName: selectedAsset.name,
          assetCategory: selectedAsset.category,
          date: disposalFormData.date,
          account: selectedAccount.name,
          amount: amount,
          description: disposalFormData.description || undefined,
        },
        assetId: assetUUID,
        accountId: accountUUID,
      })

      // Close drawer and reset form
      handleCancel()
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting disposal:", error)
    }
  }
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Dispose Asset: {selectedAsset?.name}</SheetTitle>
          <SheetDescription>
            This action will mark the asset as disposed and create an income record.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Asset Name:</span>
                <p className="text-sm text-muted-foreground">{selectedAsset?.name}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Asset ID:</span>
                <p className="text-sm text-muted-foreground">{selectedAsset?.id}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="drawer-date">Date *</Label>
              <DatePicker
                date={disposalFormData.date}
                onSelect={(date) => setDisposalFormData({ ...disposalFormData, date })}
                placeholder="Select date"
                disabled={createDisposal.isPending}
              />
            </div>

            {/* Account and Amount on same row in drawer too */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="drawer-account">Account *</Label>
                <Select
                  value={disposalFormData.account}
                  onValueChange={(value) => setDisposalFormData({ ...disposalFormData, account: value })}
                  disabled={createDisposal.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="drawer-amount">Amount (GH₵) *</Label>
                <Input
                  id="drawer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={disposalFormData.amount}
                  onChange={(e) => setDisposalFormData({ ...disposalFormData, amount: e.target.value })}
                  required
                  disabled={createDisposal.isPending}
                />
              </div>
            </div>
            {selectedAsset && (
              <p className="text-xs text-muted-foreground">
                Original purchase value: GH₵ {selectedAsset.value.toLocaleString()}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="drawer-description">Description</Label>
              <Textarea
                id="drawer-description"
                value={disposalFormData.description}
                onChange={(e) => setDisposalFormData({ ...disposalFormData, description: e.target.value })}
                rows={3}
                placeholder="e.g., Sold to..., Scrapped, Donated"
                disabled={createDisposal.isPending}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createDisposal.isPending || !selectedAsset}
              >
                {createDisposal.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Complete Disposal"
                )}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={createDisposal.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
