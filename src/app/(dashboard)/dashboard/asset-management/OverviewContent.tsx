"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Archive, Search } from "lucide-react"
import { Loader } from "@/components/ui/loader"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"
import { useAssets } from "@/hooks/assets"
import { useAssetCategories } from "@/hooks/assets"
import { useCreateAsset, useUpdateAsset } from "@/hooks/assets"
import { useOrganization } from "@/hooks/use-organization"
import { formatCurrency, getCurrencySymbol } from "@/app/(dashboard)/dashboard/projects/utils"
import type { Asset, AssetCategory } from "./types"
import { formatDate } from "./utils"

interface OverviewContentProps {
  onOpenDisposalDrawer: (asset: Asset) => void
  onNavigateToCategories: () => void
}

export default function OverviewContent({
  onOpenDisposalDrawer,
  onNavigateToCategories,
}: OverviewContentProps) {
  const { organization } = useOrganization()
  const [statusFilter, setStatusFilter] = useState<"All" | "Available" | "Retired" | "Maintained" | "Disposed">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const [assetFormData, setAssetFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    condition: "Good" as Asset["condition"],
    description: "",
    purchaseDate: undefined as Date | undefined,
    value: "",
    status: "Available" as Asset["status"],
  })

  // Fetch data using hooks
  const { data: allAssets = [], isLoading: assetsLoading } = useAssets()
  const { data: categories = [], isLoading: categoriesLoading } = useAssetCategories()

  // Mutations
  const createAsset = useCreateAsset()
  const updateAsset = useUpdateAsset()

  const isLoading = assetsLoading || categoriesLoading

  const filteredAssets = useMemo(() => {
    return allAssets
      .filter((asset) => {
        const matchesStatus = statusFilter === "All" || asset.status === statusFilter
        const matchesSearch =
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.category.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesStatus && matchesSearch
      })
      .sort((a, b) => b.id - a.id) // Newest first
  }, [allAssets, statusFilter, searchQuery])

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setAssetFormData({
      name: asset.name,
      category: asset.category,
      quantity: asset.quantity.toString(),
      condition: asset.condition,
      description: asset.description || "",
      purchaseDate: asset.purchaseDate,
      value: asset.value.toString(),
      status: asset.status === "Disposed" ? "Available" : asset.status, // Don't allow editing disposed assets
    })
  }

  const handleCancel = () => {
    setEditingAsset(null)
    setAssetFormData({
      name: "",
      category: "",
      quantity: "",
      condition: "Good",
      description: "",
      purchaseDate: undefined,
      value: "",
      status: "Available",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetFormData.name || !assetFormData.category || !assetFormData.purchaseDate || !assetFormData.value) {
      toast.error("Please fill in all required fields")
      return
    }

    const quantity = parseInt(assetFormData.quantity)
    const value = parseFloat(assetFormData.value)

    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Quantity must be greater than 0")
      return
    }

    if (isNaN(value) || value <= 0) {
      toast.error("Value must be greater than 0")
      return
    }

    try {
      if (editingAsset?.uuid) {
        // Update existing asset using the stored UUID
        await updateAsset.mutateAsync({
          id: editingAsset.uuid,
          name: assetFormData.name,
          category: assetFormData.category,
          quantity: quantity,
          condition: assetFormData.condition,
          description: assetFormData.description || undefined,
          purchaseDate: assetFormData.purchaseDate,
          value: value,
          status: assetFormData.status,
        })
      } else {
        // Create new asset
        await createAsset.mutateAsync({
          name: assetFormData.name,
          category: assetFormData.category,
          quantity: quantity,
          condition: assetFormData.condition,
          description: assetFormData.description || undefined,
          purchaseDate: assetFormData.purchaseDate,
          value: value,
          status: assetFormData.status,
        })
      }

      handleCancel()
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting asset:", error)
    }
  }

  const getStatusBadgeColor = (status: Asset["status"]) => {
    switch (status) {
      case "Available":
        return "bg-green-500 hover:bg-green-600"
      case "Retired":
        return "bg-gray-500 hover:bg-gray-600"
      case "Maintained":
        return "bg-yellow-500 hover:bg-yellow-600"
      case "Disposed":
        return "bg-red-500 hover:bg-red-600"
      default:
        return ""
    }
  }

  if (isLoading) {
    return <Loader text="Loading assets..." size="lg" />
  }

  return (
    <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
      {/* Left: Add Asset Form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: Name and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={assetFormData.name}
                  onChange={(e) => setAssetFormData({ ...assetFormData, name: e.target.value })}
                  required
                  disabled={createAsset.isPending || updateAsset.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={assetFormData.category}
                  onValueChange={(value) => setAssetFormData({ ...assetFormData, category: value })}
                  disabled={createAsset.isPending || updateAsset.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No categories available. Add categories first.
                      </div>
                    ) : (
                      categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No categories available.{" "}
                <button
                  type="button"
                  onClick={onNavigateToCategories}
                  className="text-primary hover:underline"
                >
                  Add categories
                </button>
              </p>
            )}

            {/* Row 2: Quantity and Condition */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={assetFormData.quantity}
                  onChange={(e) => setAssetFormData({ ...assetFormData, quantity: e.target.value })}
                  disabled={createAsset.isPending || updateAsset.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition</Label>
                <Select
                  value={assetFormData.condition}
                  onValueChange={(value) => setAssetFormData({ ...assetFormData, condition: value as Asset["condition"] })}
                  disabled={createAsset.isPending || updateAsset.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description - Full width */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assetFormData.description}
                onChange={(e) => setAssetFormData({ ...assetFormData, description: e.target.value })}
                disabled={createAsset.isPending || updateAsset.isPending}
                rows={3}
              />
            </div>

            {/* Row 3: Purchase Date and Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchaseDate">Purchase Date *</Label>
                <DatePicker
                  date={assetFormData.purchaseDate}
                  onSelect={(date) => setAssetFormData({ ...assetFormData, purchaseDate: date })}
                  disabled={createAsset.isPending || updateAsset.isPending}
                  placeholder="Select date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value">Value (GH₵) *</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={assetFormData.value}
                  onChange={(e) => setAssetFormData({ ...assetFormData, value: e.target.value })}
                  disabled={createAsset.isPending || updateAsset.isPending}
                  required
                />
              </div>
            </div>

            {/* Row 4: Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={assetFormData.status}
                onValueChange={(value) => setAssetFormData({ ...assetFormData, status: value as Asset["status"] })}
                disabled={createAsset.isPending || updateAsset.isPending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                  <SelectItem value="Maintained">Maintained</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createAsset.isPending || updateAsset.isPending}
              >
                {(createAsset.isPending || updateAsset.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingAsset ? "Updating..." : "Submitting..."}
                  </>
                ) : (
                  editingAsset ? "Update" : "Submit"
                )}
              </Button>
              {editingAsset && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel} 
                  className="flex-1"
                  disabled={createAsset.isPending || updateAsset.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Right: Assets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assets Records</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                  <SelectItem value="Maintained">Maintained</SelectItem>
                  <SelectItem value="Disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        <Loader size="sm" />
                      </TableCell>
                    </TableRow>
                  ) : filteredAssets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchQuery || statusFilter !== "All" ? "No assets found matching your filters." : "No assets found. Add your first asset."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.uuid || asset.id}>
                        <TableCell className="font-medium">{asset.name}</TableCell>
                        <TableCell>{asset.category}</TableCell>
                        <TableCell>{asset.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{asset.condition}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                        <TableCell>{formatCurrency(asset.value, organization?.currency || "USD")}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(asset.status)}>
                            {asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(asset)}
                              disabled={asset.status === "Disposed" || createAsset.isPending || updateAsset.isPending}
                              title="Edit asset"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onOpenDisposalDrawer(asset)}
                              disabled={asset.status === "Disposed"}
                              title="Dispose asset"
                            >
                              <Archive className="h-4 w-4 text-orange-500" />
                            </Button>
                          </div>
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
