"use client"

import React, { useState, lazy, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DollarSign, Users, Calendar, Package, BarChart3 } from "lucide-react"
import { CompactLoader } from "@/components/ui/loader"
import type { ReportType, PeriodType } from "./types"

// Lazy load tab components
const FinancialReportsContent = lazy(() => import("./FinancialReportsContent").then(m => ({ default: m.default })))
const MemberReportsContent = lazy(() => import("./MemberReportsContent").then(m => ({ default: m.default })))
const AttendanceReportsContent = lazy(() => import("./AttendanceReportsContent").then(m => ({ default: m.default })))
const AssetReportsContent = lazy(() => import("./AssetReportsContent").then(m => ({ default: m.default })))
const ComprehensiveReportsContent = lazy(() => import("./ComprehensiveReportsContent").then(m => ({ default: m.default })))

export function ReportsPageClient() {
  const [activeTab, setActiveTab] = useState<ReportType>("financial")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive insights across all modules</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ReportType)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-[800px]">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Financial</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Assets</span>
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
        </TabsList>

        {/* Financial Reports Tab */}
        <TabsContent value="financial" className="space-y-4 mt-0">
          <Suspense fallback={<CompactLoader />}>
            {activeTab === "financial" && <FinancialReportsContent />}
          </Suspense>
        </TabsContent>

        {/* Member Reports Tab */}
        <TabsContent value="members" className="space-y-4 mt-0">
          <Suspense fallback={<CompactLoader />}>
            {activeTab === "members" && <MemberReportsContent />}
          </Suspense>
        </TabsContent>

        {/* Attendance Reports Tab */}
        <TabsContent value="attendance" className="space-y-4 mt-0">
          <Suspense fallback={<CompactLoader />}>
            {activeTab === "attendance" && <AttendanceReportsContent />}
          </Suspense>
        </TabsContent>

        {/* Asset Reports Tab */}
        <TabsContent value="assets" className="space-y-4 mt-0">
          <Suspense fallback={<CompactLoader />}>
            {activeTab === "assets" && <AssetReportsContent />}
          </Suspense>
        </TabsContent>

        {/* Comprehensive Reports Tab */}
        <TabsContent value="comprehensive" className="space-y-4 mt-0">
          <Suspense fallback={<CompactLoader />}>
            {activeTab === "comprehensive" && <ComprehensiveReportsContent />}
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
