"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Edit, Trash2, Search } from "lucide-react"
import { Loader, Spinner } from "@/components/ui/loader"
import { toast } from "sonner"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useCategoriesByType, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/finance"
import { createClient } from "@/lib/supabase/client"
import { useOrganization } from "@/hooks/use-organization"
import type { Category } from "./types"

export default function CategoriesContent() {
  const [activeTab, setActiveTab] = useState<"income" | "expense" | "liability">("income")
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingCategoryUUID, setEditingCategoryUUID] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    trackMembers: false,
  })
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<{ id: number; name: string } | null>(null)

  const { organization } = useOrganization()
  const supabase = createClient()

  // Fetch categories by type using hooks
  const { data: incomeCategories = [], isLoading: incomeLoading } = useCategoriesByType("income")
  const { data: expenseCategories = [], isLoading: expenseLoading } = useCategoriesByType("expense")
  const { data: liabilityCategories = [], isLoading: liabilityLoading } = useCategoriesByType("liability")

  // Mutations
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const isLoading = incomeLoading || expenseLoading || liabilityLoading

  // Helper to get category UUID by number ID - queries by name for efficiency
  const getCategoryUUID = async (numberId: number, type: "income" | "expense" | "liability"): Promise<string | null> => {
    if (!organization?.id) return null
    
    // First, get the category name from the current categories list
    const currentCategories = getCurrentCategories()
    const category = currentCategories.find(c => c.id === numberId)
    
    if (!category) return null

    // Query by name and type (names should be unique per organization and type)
    const { data } = await supabase
      .from("finance_categories")
      .select("id")
      .eq("organization_id", organization.id)
      .eq("type", type)
      .eq("name", category.name)
      .single()

    return (data as { id: string } | null)?.id || null
  }

  const getCurrentCategories = (): Category[] => {
    if (activeTab === "income") return incomeCategories
    if (activeTab === "expense") return expenseCategories
    return liabilityCategories
  }

  // Default system categories that cannot be edited or deleted
  const isDefaultCategory = (categoryName: string, type: "income" | "expense" | "liability"): boolean => {
    const defaultCategories: Record<"income" | "expense" | "liability", string[]> = {
      income: ["Asset Disposal", "Opening Balance"],
      expense: [],
      liability: ["Liabilities"],
    }
    return defaultCategories[type].includes(categoryName)
  }

  const handleEdit = async (category: Category) => {
    // Prevent editing default categories
    if (isDefaultCategory(category.name, activeTab)) {
      toast.error("Default system categories cannot be edited")
      return
    }

    setEditingId(category.id)
    // Get UUID for this category
    const uuid = await getCategoryUUID(category.id, activeTab)
    setEditingCategoryUUID(uuid)
    setFormData({
      name: category.name,
      description: category.description || "",
      trackMembers: category.trackMembers || false,
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingCategoryUUID(null)
    setFormData({
      name: "",
      description: "",
      trackMembers: false,
    })
  }

  const handleDeleteClick = (id: number) => {
    const category = getCurrentCategories().find(c => c.id === id)
    if (!category) return
    setCategoryToDelete({ id, name: category.name })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      const categoryUUID = await getCategoryUUID(categoryToDelete.id, activeTab)
      if (!categoryUUID) {
        toast.error("Category not found")
        setDeleteDialogOpen(false)
        setCategoryToDelete(null)
        return
      }
      await deleteCategory.mutateAsync(categoryUUID)
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error) {
      // Error handled by hook
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error("Please enter a category name")
      return
    }

    try {
      if (editingId && editingCategoryUUID) {
        // Update existing category
        await updateCategory.mutateAsync({
          id: editingCategoryUUID,
          name: formData.name,
          description: formData.description || undefined,
          type: activeTab,
          trackMembers: activeTab === "income" ? formData.trackMembers : undefined,
        })
        setEditingId(null)
        setEditingCategoryUUID(null)
      } else {
        // Add new category
        await createCategory.mutateAsync({
          name: formData.name,
          description: formData.description || "",
          type: activeTab,
          trackMembers: activeTab === "income" ? formData.trackMembers : false,
        })
      }

      // Reset form
      setFormData({
        name: "",
        description: "",
        trackMembers: false,
      })
    } catch (error) {
      // Error handled by hooks
    }
  }

  const filteredCategories = useMemo(() => {
    const categories = getCurrentCategories()
    return categories
      .filter((category) =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Newest first
  }, [activeTab, incomeCategories, expenseCategories, liabilityCategories, searchQuery])

  if (isLoading) {
    return <Loader text="Loading categories..." size="lg" />
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as "income" | "expense" | "liability")
        setSearchQuery("")
        setEditingId(null)
        setEditingCategoryUUID(null)
        setFormData({ name: "", description: "", trackMembers: false })
      }} className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">Income Categories</TabsTrigger>
          <TabsTrigger value="expense">Expense Categories</TabsTrigger>
          <TabsTrigger value="liability">Liability Categories</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[400px_1fr]">
            {/* Form on Left */}
            <Card>
              <CardHeader>
                <CardTitle>{editingId ? "Edit Category" : "Add Category"}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Category Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter category name"
                      required
                      disabled={createCategory.isPending || updateCategory.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter description (optional)"
                      disabled={createCategory.isPending || updateCategory.isPending}
                    />
                  </div>

                  {/* Track Members Checkbox - Only for Income Categories */}
                  {activeTab === "income" && (
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="trackMembers"
                        checked={formData.trackMembers}
                        onCheckedChange={(checked) => setFormData({ ...formData, trackMembers: checked as boolean })}
                        disabled={createCategory.isPending || updateCategory.isPending}
                      />
                      <Label htmlFor="trackMembers" className="text-sm font-normal cursor-pointer">
                        Track member contributions for this category
                      </Label>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      type="submit"
                      className="flex-1"
                      disabled={createCategory.isPending || updateCategory.isPending}
                    >
                      {(createCategory.isPending || updateCategory.isPending) && (
                        <Spinner size="sm" className="mr-2" />
                      )}
                      {editingId ? "Update" : "Add"}
                    </Button>
                    {editingId && (
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
                </form>
              </CardContent>
            </Card>

            {/* Table on Right */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {activeTab === "income" && "Income Categories"}
                    {activeTab === "expense" && "Expense Categories"}
                    {activeTab === "liability" && "Liability Categories"}
                  </CardTitle>
                  <div className="relative max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder={`Search ${activeTab} categories...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Category Name</TableHead>
                          <TableHead>Description</TableHead>
                          {activeTab === "income" && (
                            <TableHead>Track Members</TableHead>
                          )}
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCategories.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={activeTab === "income" ? 4 : 3} className="text-center py-8 text-muted-foreground">
                              {searchQuery 
                                ? "No categories found matching your search."
                                : "No categories found. Add a category to get started."
                              }
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCategories.map((category) => (
                            <TableRow key={category.id}>
                              <TableCell className="font-medium">{category.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {category.description || "-"}
                              </TableCell>
                              {activeTab === "income" && (
                                <TableCell>
                                  <Badge variant={category.trackMembers ? "default" : "secondary"}>
                                    {category.trackMembers ? "Yes" : "No"}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex gap-2">
                                  {!isDefaultCategory(category.name, activeTab) && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleEdit(category)}
                                      disabled={
                                        editingId === category.id || 
                                        deleteCategory.isPending
                                      }
                                      title="Edit category"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleDeleteClick(category.id)}
                                    disabled={deleteCategory.isPending}
                                    title={isDefaultCategory(category.name, activeTab) ? "Delete category and all related records" : "Delete category"}
                                  >
                                    {deleteCategory.isPending ? (
                                      <Spinner size="sm" className="text-red-500" />
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
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        description={categoryToDelete ? `Are you sure you want to delete the category "${categoryToDelete.name}"?${isDefaultCategory(categoryToDelete.name, activeTab) ? "\n\nThis is a default system category. Deleting it will also delete all related income/expenditure records and linked entries." : "\n\nThis action cannot be undone."}` : ""}
        confirmText="Delete"
        isLoading={deleteCategory.isPending}
      />
    </div>
  )
}
