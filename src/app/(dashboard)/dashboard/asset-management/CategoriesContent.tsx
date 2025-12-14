"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit, Trash2, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAssetCategories, useCreateAssetCategory, useUpdateAssetCategory, useDeleteAssetCategory } from "@/hooks/assets"
import type { AssetCategory } from "./types"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"

export default function CategoriesContent() {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingCategory, setEditingCategory] = useState<AssetCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<AssetCategory | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  })

  // Fetch categories using hooks
  const { data: categories = [], isLoading } = useAssetCategories()

  // Mutations
  const createCategory = useCreateAssetCategory()
  const updateCategory = useUpdateAssetCategory()
  const deleteCategory = useDeleteAssetCategory()

  const filteredCategories = useMemo(() => {
    return categories
      .filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Newest first
  }, [categories, searchQuery])

  const handleEdit = (category: AssetCategory) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
    })
  }

  const handleCancel = () => {
    setEditingCategory(null)
    setFormData({
      name: "",
      description: "",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Category name is required")
      return
    }

    try {
      if (editingCategory?.uuid) {
        // Update existing category using stored UUID
        await updateCategory.mutateAsync({
          id: editingCategory.uuid,
          name: formData.name,
          description: formData.description || undefined,
        })
      } else {
        // Create new category
        await createCategory.mutateAsync({
          name: formData.name,
          description: formData.description || undefined,
        })
      }

      handleCancel()
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error submitting category:", error)
    }
  }

  const handleDeleteClick = (category: AssetCategory) => {
    if (!category.uuid) {
      toast.error("Category not found")
      return
    }
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete?.uuid) return

    try {
      await deleteCategory.mutateAsync(categoryToDelete.uuid)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error) {
      // Error is already handled by the hook (toast)
      console.error("Error deleting category:", error)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Asset Categories</CardTitle>
        </CardHeader>
        <CardContent>
        {/* Add/Edit Form */}
        <form onSubmit={handleSubmit} className="mb-4 p-4 border rounded-lg bg-muted/50">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter category name"
                required
                disabled={createCategory.isPending || updateCategory.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Input
                id="category-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description (optional)"
                disabled={createCategory.isPending || updateCategory.isPending}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit"
                disabled={createCategory.isPending || updateCategory.isPending}
              >
                {(createCategory.isPending || updateCategory.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingCategory ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editingCategory ? "Update" : "Add"
                )}
              </Button>
              {editingCategory && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={createCategory.isPending || updateCategory.isPending}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories Table */}
        <div className="rounded-md border">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Asset Count</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No categories found matching your search." : "No categories found. Add your first category."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.uuid || category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{category.assetCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            disabled={editingCategory?.uuid === category.uuid || deleteCategory.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(category)}
                            disabled={deleteCategory.isPending || createCategory.isPending || updateCategory.isPending}
                          >
                            {deleteCategory.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                            ) : (
                              <Trash2 className="h-4 w-4 text-red-500" />
                            )}
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

    {/* Delete Confirmation Dialog */}
    <DeleteConfirmationDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      onConfirm={handleDeleteConfirm}
      title="Delete Category"
      description={categoryToDelete ? `Are you sure you want to delete the category "${categoryToDelete.name}"? This action cannot be undone.` : ""}
      confirmText="Delete"
      isLoading={deleteCategory.isPending}
    />
    </>
  )
}
