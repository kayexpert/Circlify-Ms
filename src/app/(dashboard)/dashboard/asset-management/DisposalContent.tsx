"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"
import { useAssetDisposals, useCreateAssetDisposal, useDeleteAssetDisposal } from "@/hooks/assets"
import { useAssets } from "@/hooks/assets"
import { useAccounts } from "@/hooks/finance/useAccounts"
import type { DisposalRecord, Asset } from "./types"
import type { Account } from "@/app/(dashboard)/dashboard/finance/types"
import { formatDate } from "./utils"

export default function DisposalContent() {
  const [disposalFormData, setDisposalFormData] = useState({
    date: new Date() as Date | undefined,
    assetId: "",
    account: "",
    amount: "",
    description: "",
  })

  // Fetch data using hooks
  const { data: disposals = [], isLoading: disposalsLoading } = useAssetDisposals()
  const { data: allAssets = [], isLoading: assetsLoading } = useAssets()
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()

  // Mutations
  const createDisposal = useCreateAssetDisposal()
  const deleteDisposal = useDeleteAssetDisposal()

  const isLoading = disposalsLoading || assetsLoading || accountsLoading

  // Filter assets that are not disposed (available for disposal)
  const disposableAssets = useMemo(() => {
    return allAssets.filter((asset) => asset.status !== "Disposed")
  }, [allAssets])

  const filteredDisposals = useMemo(() => {
    return disposals.sort((a, b) => b.id - a.id) // Newest first
  }, [disposals])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!disposalFormData.date || !disposalFormData.assetId || !disposalFormData.account || !disposalFormData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = parseFloat(disposalFormData.amount)
    if (isNaN(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    // Find selected asset and account by their uuid stored in the form value
    const selectedAsset = allAssets.find((a) => a.uuid === disposalFormData.assetId)
    const selectedAccount = accounts.find((a) => a.uuid === disposalFormData.account)

    if (!selectedAsset || !selectedAsset.uuid) {
      toast.error("Asset not found")
      return
    }

    if (!selectedAccount || !selectedAccount.uuid) {
      toast.error("Account not found")
      return
    }

    if (selectedAsset.status === "Disposed") {
      toast.error("This asset is already disposed")
      return
    }

    try {
      // Create disposal using stored UUIDs - hook handles income record creation, asset status update, and account balance update
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
        assetId: selectedAsset.uuid,
        accountId: selectedAccount.uuid,
      })

      // Reset form (keep today's date for convenience)
      setDisposalFormData({
        date: new Date(),
        assetId: "",
        account: "",
        amount: "",
        description: "",
      })
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting disposal:", error)
    }
  }

  const handleDelete = async (disposal: DisposalRecord) => {
    if (!confirm("This will reverse all actions: delete the income record, subtract the amount from the account balance, and change the asset status back. Are you sure you want to continue?")) {
      return
    }

    if (!disposal.uuid) {
      toast.error("Disposal record not found")
      return
    }

    try {
      await deleteDisposal.mutateAsync(disposal.uuid)
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error deleting disposal:", error)
    }
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
      {/* Left: Disposal Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Disposal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disposal-date">Date *</Label>
              <DatePicker
                date={disposalFormData.date}
                onSelect={(date) => setDisposalFormData({ ...disposalFormData, date })}
                placeholder="Select date"
                disabled={createDisposal.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="disposal-asset">Select Asset *</Label>
              <Select
                value={disposalFormData.assetId}
                onValueChange={(value) => setDisposalFormData({ ...disposalFormData, assetId: value })}
                disabled={createDisposal.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {disposableAssets.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No disposable assets available
                    </div>
                  ) : (
                    disposableAssets.map((asset) => (
                      <SelectItem key={asset.uuid || asset.id} value={asset.uuid || asset.id.toString()}>
                        {asset.name} ({asset.category})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Account and Amount on same row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="disposal-account">Account *</Label>
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
                      <SelectItem key={account.uuid || account.id} value={account.uuid || account.id.toString()}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="disposal-amount">Amount (GH₵) *</Label>
                <Input
                  id="disposal-amount"
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

            <div className="space-y-2">
              <Label htmlFor="disposal-description">Description</Label>
              <Textarea
                id="disposal-description"
                value={disposalFormData.description}
                onChange={(e) => setDisposalFormData({ ...disposalFormData, description: e.target.value })}
                rows={3}
                placeholder="e.g., Sold to..., Scrapped, Donated"
                disabled={createDisposal.isPending}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={createDisposal.isPending}
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
          </form>
        </CardContent>
      </Card>

      {/* Right: Disposal Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Disposal Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredDisposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No disposal records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDisposals.map((disposal) => (
                      <TableRow key={disposal.uuid || disposal.id}>
                        <TableCell>{formatDate(disposal.date)}</TableCell>
                        <TableCell className="font-medium">{disposal.assetName}</TableCell>
                        <TableCell>{disposal.assetCategory}</TableCell>
                        <TableCell className="font-bold text-green-600">
                          GH₵ {disposal.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{disposal.account}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {disposal.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(disposal)}
                            disabled={deleteDisposal.isPending || createDisposal.isPending}
                          >
                            {deleteDisposal.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
