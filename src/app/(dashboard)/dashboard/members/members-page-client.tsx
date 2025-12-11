"use client"

import React, { useState, useEffect, lazy, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Users, UserPlus, CalendarDays, Cake, Network, MessageSquare } from "lucide-react"
import { CompactLoader } from "@/components/ui/loader"

// Lazy load tab components - only load when needed
const OverviewContent = lazy(() => import("./OverviewContent").then(m => ({ default: m.default })))
const MembersContent = lazy(() => import("./MembersContent").then(m => ({ default: m.default })))
const VisitorsContent = lazy(() => import("./VisitorsContent").then(m => ({ default: m.default })))
const AttendanceContent = lazy(() => import("./AttendanceContent").then(m => ({ default: m.default })))
const FollowUpContent = lazy(() => import("./FollowUpContent").then(m => ({ default: m.default })))
const BirthdaysContent = lazy(() => import("./BirthdaysContent").then(m => ({ default: m.default })))
const GroupsDepartmentsContent = lazy(() => import("./GroupsDepartmentsContent").then(m => ({ default: m.default })))

export function MembersPageClient() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState(tabParam || "overview")

  // Update tab when URL parameter changes
  useEffect(() => {
    if (tabParam && ["overview", "members", "visitors", "attendance", "follow-up", "birthdays", "groups-departments"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-7 lg:w-[1050px] mb-6">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="members" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Members</span>
        </TabsTrigger>
        <TabsTrigger value="visitors" className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Visitors</span>
        </TabsTrigger>
        <TabsTrigger value="attendance" className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          <span className="hidden sm:inline">Attendance</span>
        </TabsTrigger>
        <TabsTrigger value="follow-up" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Follow Up</span>
        </TabsTrigger>
        <TabsTrigger value="birthdays" className="flex items-center gap-2">
          <Cake className="h-4 w-4" />
          <span className="hidden sm:inline">Birthdays</span>
        </TabsTrigger>
        <TabsTrigger value="groups-departments" className="flex items-center gap-2">
          <Network className="h-4 w-4" />
          <span className="hidden sm:inline">Groups & Dept</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab - Lazy loaded, only renders when active */}
      <TabsContent value="overview" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "overview" && <OverviewContent />}
        </Suspense>
      </TabsContent>

      {/* Members Tab - Lazy loaded, only renders when active */}
      <TabsContent value="members" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "members" && <MembersContent />}
        </Suspense>
      </TabsContent>

      {/* Visitors Tab - Lazy loaded, only renders when active */}
      <TabsContent value="visitors" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "visitors" && <VisitorsContent />}
        </Suspense>
      </TabsContent>

      {/* Attendance Tab - Lazy loaded, only renders when active */}
      <TabsContent value="attendance" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "attendance" && <AttendanceContent />}
        </Suspense>
      </TabsContent>

      {/* Follow Up Tab - Lazy loaded, only renders when active */}
      <TabsContent value="follow-up" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "follow-up" && <FollowUpContent />}
        </Suspense>
      </TabsContent>

      {/* Birthdays Tab - Lazy loaded, only renders when active */}
      <TabsContent value="birthdays" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "birthdays" && <BirthdaysContent />}
        </Suspense>
      </TabsContent>

      {/* Groups & Departments Tab - Lazy loaded, only renders when active */}
      <TabsContent value="groups-departments" className="mt-0">
        <Suspense fallback={<CompactLoader />}>
          {activeTab === "groups-departments" && <GroupsDepartmentsContent />}
        </Suspense>
      </TabsContent>
    </Tabs>
  )
}
