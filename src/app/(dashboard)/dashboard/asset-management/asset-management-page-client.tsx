"use client"

import React, { useState, useEffect, lazy, Suspense, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CompactLoader } from "@/components/ui/loader"
import type { IncomeRecord } from "@/app/(dashboard)/dashboard/finance/types"
import type { Asset, DisposalRecord, AssetCategory, Account } from "./types"
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from "./utils"

// Lazy load tab components - only load when needed
const OverviewContent = lazy(() => import("./OverviewContent").then(m => ({ default: m.default })))
const DisposalContent = lazy(() => import("./DisposalContent").then(m => ({ default: m.default })))
const CategoriesContent = lazy(() => import("./CategoriesContent").then(m => ({ default: m.default })))
const DisposalDrawer = lazy(() => import("./DisposalDrawer").then(m => ({ default: m.default })))

const VALID_TABS = ["overview", "disposal", "categories"] as const

export function AssetManagementPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  // State
  const [activeTab, setActiveTab] = useState<"overview" | "disposal" | "categories">(
    (tabParam && VALID_TABS.includes(tabParam as any) ? tabParam : "overview") as "overview" | "disposal" | "categories"
  )
  const [assets, setAssets] = useState<Asset[]>([])
  const [disposals, setDisposals] = useState<DisposalRecord[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isDisposalDrawerOpen, setIsDisposalDrawerOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [disposalToDelete, setDisposalToDelete] = useState<DisposalRecord | null>(null)
  const [selectedAssetForDisposal, setSelectedAssetForDisposal] = useState<Asset | null>(null)
  const [statusFilter, setStatusFilter] = useState<"All" | "Available" | "Retired" | "Maintained" | "Disposed">("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [categorySearchQuery, setCategorySearchQuery] = useState("")

  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as any)) {
      setActiveTab(tabParam as typeof activeTab)
    } else if (!tabParam) {
      // If no tab param, default to overview
      setActiveTab("overview")
    }
  }, [tabParam])

  // Handle tab change - update both state and URL
  const handleTabChange = useCallback((value: string) => {
    if (VALID_TABS.includes(value as any)) {
      setActiveTab(value as typeof activeTab)
      // Update URL without causing a full page reload
      const params = new URLSearchParams(searchParams.toString())
      if (value === "overview") {
        // Remove tab param for overview (default tab)
        params.delete("tab")
      } else {
        params.set("tab", value)
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [router, pathname, searchParams])

  // Income records hook
  // Note: Income records are now managed by database hooks in DisposalDrawer
  // This local state is for legacy compatibility only
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([])

  // Form states
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
  const [editingAssetId, setEditingAssetId] = useState<number | null>(null)

  const [disposalFormData, setDisposalFormData] = useState({
    date: undefined as Date | undefined,
    assetId: "",
    account: "",
    amount: "",
    description: "",
  })

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  })
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null)

  // Load data from localStorage on mount
  useEffect(() => {
    const loadedAssets = loadFromStorage<Asset>(STORAGE_KEYS.ASSETS, ["purchaseDate"])
    const loadedDisposals = loadFromStorage<DisposalRecord>(STORAGE_KEYS.DISPOSALS, ["date"])
    const loadedCategories = loadFromStorage<AssetCategory>(STORAGE_KEYS.CATEGORIES, ["createdAt"])
    const loadedAccounts = loadFromStorage<Account>(STORAGE_KEYS.ACCOUNTS)

    // Initialize with dummy data if empty
    if (loadedAssets.length === 0) {
      const dummyAssets: Asset[] = [
        {
          id: 1,
          name: "Sound System",
          category: "Audio",
          quantity: 2,
          condition: "Excellent",
          purchaseDate: new Date("2023-01-15"),
          value: 15000,
          status: "Available",
        },
        {
          id: 2,
          name: "Projector",
          category: "Visual",
          quantity: 1,
          condition: "Good",
          purchaseDate: new Date("2023-03-20"),
          value: 5000,
          status: "Available",
        },
      ]
      setAssets(dummyAssets)
      saveToStorage(STORAGE_KEYS.ASSETS, dummyAssets)
    } else {
      setAssets(loadedAssets)
    }

    if (loadedCategories.length === 0) {
      const dummyCategories: AssetCategory[] = [
        { id: 1, name: "Audio", description: "Audio equipment", assetCount: 0, createdAt: new Date() },
        { id: 2, name: "Visual", description: "Visual equipment", assetCount: 0, createdAt: new Date() },
        { id: 3, name: "Furniture", description: "Furniture items", assetCount: 0, createdAt: new Date() },
        { id: 4, name: "Musical Instruments", description: "Musical instruments", assetCount: 0, createdAt: new Date() },
        { id: 5, name: "IT Equipment", description: "IT and computer equipment", assetCount: 0, createdAt: new Date() },
      ]
      setCategories(dummyCategories)
      saveToStorage(STORAGE_KEYS.CATEGORIES, dummyCategories)
    } else {
      setCategories(loadedCategories)
    }

    setDisposals(loadedDisposals)

    // Load accounts from finance module localStorage
    if (loadedAccounts.length === 0) {
      // Try to get from finance module
      const financeAccounts = loadFromStorage<any>("accounts", ["createdAt"])
      if (financeAccounts.length > 0) {
        const mappedAccounts: Account[] = financeAccounts.map((acc: any) => ({
          id: acc.id,
          name: acc.name,
          accountType: acc.accountType || "Cash",
          balance: acc.balance || 0,
        }))
        setAccounts(mappedAccounts)
        saveToStorage(STORAGE_KEYS.ACCOUNTS, mappedAccounts)
      } else {
        // Default accounts
        const defaultAccounts: Account[] = [
          { id: 1, name: "Main Account", accountType: "Bank", balance: 0 },
          { id: 2, name: "Cash", accountType: "Cash", balance: 0 },
        ]
        setAccounts(defaultAccounts)
        saveToStorage(STORAGE_KEYS.ACCOUNTS, defaultAccounts)
      }
    } else {
      setAccounts(loadedAccounts)
    }
  }, [])

  // Sync accounts with finance module
  useEffect(() => {
    const financeAccounts = loadFromStorage<any>("accounts", ["createdAt"])
    if (financeAccounts.length > 0) {
      const mappedAccounts: Account[] = financeAccounts.map((acc: any) => ({
        id: acc.id,
        name: acc.name,
        accountType: acc.accountType || "Cash",
        balance: acc.balance || 0,
      }))
      setAccounts(mappedAccounts)
      saveToStorage(STORAGE_KEYS.ACCOUNTS, mappedAccounts)
    }
  }, [])

  // Update category asset counts when assets change
  useEffect(() => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        assetCount: assets.filter((a) => a.category === cat.name).length,
      }))
    )
  }, [assets])

  // Save to localStorage whenever state changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ASSETS, assets)
  }, [assets])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.DISPOSALS, disposals)
  }, [disposals])

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories)
  }, [categories])

  // Asset form handlers
  const resetAssetForm = () => {
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
    setEditingAssetId(null)
  }

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetFormData.name || !assetFormData.category || !assetFormData.quantity || !assetFormData.purchaseDate || !assetFormData.value) {
      toast.error("Please fill in all required fields")
      return
    }

    const quantity = parseInt(assetFormData.quantity)
    const value = parseFloat(assetFormData.value)

    if (quantity < 1) {
      toast.error("Quantity must be at least 1")
      return
    }

    if (value <= 0) {
      toast.error("Value must be greater than 0")
      return
    }

    if (editingAssetId) {
      // Update existing asset
      const updatedAsset: Asset = {
        id: editingAssetId,
        name: assetFormData.name,
        category: assetFormData.category,
        quantity,
        condition: assetFormData.condition,
        description: assetFormData.description || undefined,
        purchaseDate: assetFormData.purchaseDate,
        value,
        status: assetFormData.status,
      }
      setAssets(assets.map((a) => (a.id === editingAssetId ? updatedAsset : a)))
      toast.success("Asset updated successfully")
    } else {
      // Add new asset
      const newAsset: Asset = {
        id: assets.length > 0 ? Math.max(...assets.map((a) => a.id)) + 1 : 1,
        name: assetFormData.name,
        category: assetFormData.category,
        quantity,
        condition: assetFormData.condition,
        description: assetFormData.description || undefined,
        purchaseDate: assetFormData.purchaseDate,
        value,
        status: assetFormData.status,
      }
      setAssets([newAsset, ...assets])
      toast.success("Asset added successfully")
    }

    resetAssetForm()
  }

  const handleEditAsset = (asset: Asset) => {
    setEditingAssetId(asset.id)
    setAssetFormData({
      name: asset.name,
      category: asset.category,
      quantity: asset.quantity.toString(),
      condition: asset.condition,
      description: asset.description || "",
      purchaseDate: asset.purchaseDate,
      value: asset.value.toString(),
      status: asset.status,
    })
  }

  // Disposal handlers
  const openDisposalDrawer = (asset: Asset) => {
    if (asset.status === "Disposed") {
      toast.error("This asset is already disposed")
      return
    }
    setSelectedAssetForDisposal(asset)
    setIsDisposalDrawerOpen(true)
  }

  const handleDisposalSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!disposalFormData.date || !disposalFormData.assetId || !disposalFormData.account || !disposalFormData.amount) {
      toast.error("Please fill in all required fields")
      return
    }

    const amount = parseFloat(disposalFormData.amount)
    if (amount <= 0) {
      toast.error("Amount must be greater than 0")
      return
    }

    const assetId = parseInt(disposalFormData.assetId)
    const asset = assets.find((a) => a.id === assetId)

    if (!asset) {
      toast.error("Asset not found")
      return
    }

    if (asset.status === "Disposed") {
      toast.error("This asset is already disposed")
      return
    }

    const selectedAccount = accounts.find((a) => a.id.toString() === disposalFormData.account)
    if (!selectedAccount) {
      toast.error("Account not found")
      return
    }

    // Step 1: Create disposal record
    const newDisposal: DisposalRecord = {
      id: disposals.length > 0 ? Math.max(...disposals.map((d) => d.id)) + 1 : 1,
      assetId,
      assetName: asset.name,
      assetCategory: asset.category,
      date: disposalFormData.date,
      account: selectedAccount.name,
      amount,
      description: disposalFormData.description || undefined,
    }

    // Step 2: Create income record
    const newIncomeRecord: IncomeRecord = {
      id: incomeRecords.length > 0 ? Math.max(...incomeRecords.map((r) => r.id)) + 1 : 1,
      date: disposalFormData.date,
      source: "Asset Disposal",
      category: "Asset Disposal",
      amount,
      method: selectedAccount.name,
      reference: `Disposal of ${asset.name}`,
      linkedAssetId: assetId,
    }

    // Link disposal to income record
    newDisposal.linkedIncomeId = newIncomeRecord.id

    // Step 3: Update account balance
    setAccounts(
      accounts.map((acc) => {
        if (acc.id === selectedAccount.id) {
          return { ...acc, balance: acc.balance + amount }
        }
        return acc
      })
    )

    // Also update in finance module localStorage
    const financeAccounts = loadFromStorage<any>("accounts", ["createdAt"])
    const updatedFinanceAccounts = financeAccounts.map((acc: any) => {
      if (acc.id === selectedAccount.id) {
        return { ...acc, balance: acc.balance + amount }
      }
      return acc
    })
    saveToStorage("accounts", updatedFinanceAccounts)

    // Step 4: Update asset status
    setAssets(
      assets.map((a) => {
        if (a.id === assetId) {
          return {
            ...a,
            status: "Disposed",
            previousStatus: a.status !== "Disposed" ? a.status : a.previousStatus,
          }
        }
        return a
      })
    )

    // Step 5: Add records
    setDisposals([newDisposal, ...disposals])
    setIncomeRecords([...incomeRecords, newIncomeRecord])

    toast.success("Asset disposed successfully. Income record created.")
    
    // Reset form - if from drawer, close it; if from tab, reset with today's date
    if (isDisposalDrawerOpen) {
      setIsDisposalDrawerOpen(false)
      setSelectedAssetForDisposal(null)
      setDisposalFormData({
        date: undefined,
        assetId: "",
        account: "",
        amount: "",
        description: "",
      })
    } else {
      // From disposal tab - reset but keep today's date
      setDisposalFormData({
        date: new Date(),
        assetId: "",
        account: "",
        amount: "",
        description: "",
      })
    }
  }

  const handleDeleteDisposal = (disposal: DisposalRecord) => {
    setDisposalToDelete(disposal)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteDisposal = () => {
    if (!disposalToDelete) return

    const disposal = disposalToDelete

    // Find the asset
    const asset = assets.find((a) => a.id === disposal.assetId)
    if (!asset) {
      toast.error("Asset not found")
      return
    }

    // Step 1: Delete linked income record
    if (disposal.linkedIncomeId) {
      setIncomeRecords(incomeRecords.filter((r) => r.id !== disposal.linkedIncomeId))
    } else {
      // Fallback: find by linkedAssetId or reference
      const incomeToDelete = incomeRecords.find(
        (r) =>
          (r.linkedAssetId === disposal.assetId && r.amount === disposal.amount) ||
          (r.reference === `Disposal of ${disposal.assetName}` && r.amount === disposal.amount)
      )
      if (incomeToDelete) {
        setIncomeRecords(incomeRecords.filter((r) => r.id !== incomeToDelete.id))
      }
    }

    // Step 2: Subtract amount from account balance
    const account = accounts.find((a) => a.name === disposal.account)
    if (account) {
      setAccounts(
        accounts.map((acc) => {
          if (acc.id === account.id) {
            return { ...acc, balance: Math.max(0, acc.balance - disposal.amount) }
          }
          return acc
        })
      )

      // Also update in finance module
      const financeAccounts = loadFromStorage<any>("accounts", ["createdAt"])
      const updatedFinanceAccounts = financeAccounts.map((acc: any) => {
        if (acc.id === account.id) {
          return { ...acc, balance: Math.max(0, acc.balance - disposal.amount) }
        }
        return acc
      })
      saveToStorage("accounts", updatedFinanceAccounts)
    }

    // Step 3: Change asset status back
    setAssets(
      assets.map((a) => {
        if (a.id === disposal.assetId) {
          return {
            ...a,
            status: (a as any).previousStatus || "Available",
            previousStatus: undefined,
          }
        }
        return a
      })
    )

    // Step 4: Delete disposal record
    setDisposals(disposals.filter((d) => d.id !== disposal.id))

    toast.success("Disposal record deleted. All related changes reversed.")
    setIsDeleteDialogOpen(false)
    setDisposalToDelete(null)
  }

  // Category handlers
  const resetCategoryForm = () => {
    setCategoryFormData({
      name: "",
      description: "",
    })
    setEditingCategoryId(null)
  }

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!categoryFormData.name.trim()) {
      toast.error("Category name is required")
      return
    }

    // Check for duplicate names (excluding current editing)
    const existingCategory = categories.find(
      (c) => c.name.toLowerCase() === categoryFormData.name.toLowerCase() && c.id !== editingCategoryId
    )
    if (existingCategory) {
      toast.error("Category name must be unique")
      return
    }

    if (editingCategoryId) {
      // Update existing category
      const oldCategory = categories.find((c) => c.id === editingCategoryId)
      const updatedCategory: AssetCategory = {
        id: editingCategoryId,
        name: categoryFormData.name,
        description: categoryFormData.description || undefined,
        assetCount: oldCategory?.assetCount || 0,
        createdAt: oldCategory?.createdAt || new Date(),
      }
      // Update assets that use this category
      const oldCategoryName = oldCategory?.name
      if (oldCategoryName && oldCategoryName !== updatedCategory.name) {
        setAssets(
          assets.map((a) => {
            if (a.category === oldCategoryName) {
              return { ...a, category: updatedCategory.name }
            }
            return a
          })
        )
      }
      setCategories(categories.map((c) => (c.id === editingCategoryId ? updatedCategory : c)))
      toast.success("Category updated successfully")
    } else {
      // Add new category
      const newCategory: AssetCategory = {
        id: categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1,
        name: categoryFormData.name,
        description: categoryFormData.description || undefined,
        assetCount: 0,
        createdAt: new Date(),
      }
      setCategories([newCategory, ...categories])
      toast.success("Category added successfully")
    }

    resetCategoryForm()
  }

  const handleEditCategory = (category: AssetCategory) => {
    setEditingCategoryId(category.id)
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
    })
  }

  const handleDeleteCategory = (id: number) => {
    const category = categories.find((c) => c.id === id)
    if (!category) return

    if (category.assetCount > 0) {
      toast.error(`Cannot delete. ${category.assetCount} assets are using this category.`)
      return
    }

    setCategories(categories.filter((c) => c.id !== id))
    toast.success("Category deleted successfully")
  }

  // Get disposable assets (not already disposed)
  const disposableAssets = assets.filter((a) => a.status !== "Disposed")

  return (
    <div className="space-y-6">

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="disposal">Disposal</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <OverviewContent
              onOpenDisposalDrawer={openDisposalDrawer}
              onNavigateToCategories={() => setActiveTab("categories")}
            />
          </Suspense>
        </TabsContent>

        {/* DISPOSAL TAB */}
        <TabsContent value="disposal" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <DisposalContent />
          </Suspense>
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4">
          <Suspense fallback={<CompactLoader />}>
            <CategoriesContent />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Disposal Drawer (from Overview tab) */}
      {isDisposalDrawerOpen && (
        <Suspense fallback={null}>
          <DisposalDrawer
            isOpen={isDisposalDrawerOpen}
            onOpenChange={setIsDisposalDrawerOpen}
            selectedAsset={selectedAssetForDisposal}
          />
        </Suspense>
      )}

      {/* Delete Disposal Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Disposal Record</DialogTitle>
            <DialogDescription>
              This will reverse all actions: delete the income record, subtract the amount from the account balance,
              and change the asset status back. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDisposal}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
