"use client"

import React, { useState, useEffect, lazy, Suspense, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CompactLoader } from "@/components/ui/loader"
import { useAssetsRealtime } from "@/hooks/use-realtime-subscription"
import type { Asset } from "./types"

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

  // Enable real-time subscriptions for live updates
  useAssetsRealtime()

  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "disposal" | "categories">(
    (tabParam && VALID_TABS.includes(tabParam as typeof VALID_TABS[number]) ? tabParam : "overview") as "overview" | "disposal" | "categories"
  )

  // Disposal drawer state
  const [isDisposalDrawerOpen, setIsDisposalDrawerOpen] = useState(false)
  const [selectedAssetForDisposal, setSelectedAssetForDisposal] = useState<Asset | null>(null)

  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as typeof VALID_TABS[number])) {
      setActiveTab(tabParam as typeof activeTab)
    } else if (!tabParam) {
      setActiveTab("overview")
    }
  }, [tabParam])

  // Handle tab change - update both state and URL
  const handleTabChange = useCallback((value: string) => {
    if (VALID_TABS.includes(value as typeof VALID_TABS[number])) {
      setActiveTab(value as typeof activeTab)
      const params = new URLSearchParams(searchParams.toString())
      if (value === "overview") {
        params.delete("tab")
      } else {
        params.set("tab", value)
      }
      const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
      router.replace(newUrl, { scroll: false })
    }
  }, [router, pathname, searchParams])

  // Open disposal drawer for a specific asset
  const openDisposalDrawer = useCallback((asset: Asset) => {
    setSelectedAssetForDisposal(asset)
    setIsDisposalDrawerOpen(true)
  }, [])

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
              onNavigateToCategories={() => handleTabChange("categories")}
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
    </div>
  )
}
