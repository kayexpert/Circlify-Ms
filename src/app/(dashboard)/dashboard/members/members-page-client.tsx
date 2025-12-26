"use client"

import React, { useState, useEffect, lazy, Suspense, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Users, UserPlus, CalendarDays, Cake, Network, MessageSquare } from "lucide-react"
import { CompactLoader } from "@/components/ui/loader"
import { useMembersRealtime, useAttendanceRealtime } from "@/hooks/use-realtime-subscription"

// Lazy load tab components - only load when needed
const OverviewContent = lazy(() => import("./OverviewContent").then(m => ({ default: m.default })))
const MembersContent = lazy(() => import("./MembersContent").then(m => ({ default: m.default })))
const VisitorsContent = lazy(() => import("./VisitorsContent").then(m => ({ default: m.default })))
const AttendanceContent = lazy(() => import("./AttendanceContent").then(m => ({ default: m.default })))
const FollowUpContent = lazy(() => import("./FollowUpContent").then(m => ({ default: m.default })))
const BirthdaysContent = lazy(() => import("./BirthdaysContent").then(m => ({ default: m.default })))
const GroupsDepartmentsContent = lazy(() => import("./GroupsDepartmentsContent").then(m => ({ default: m.default })))

const VALID_TABS = ["overview", "members", "visitors", "attendance", "follow-up", "birthdays", "groups-departments"] as const

export function MembersPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<string>(tabParam && VALID_TABS.includes(tabParam as any) ? tabParam : "overview")

  // Enable real-time subscriptions for live updates
  useMembersRealtime()
  useAttendanceRealtime()

  // Update tab when URL parameter changes - memoized to prevent unnecessary updates
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as any)) {
      if (activeTab !== tabParam) {
        setActiveTab(tabParam)
      }
    } else if (!tabParam && activeTab !== "overview") {
      // If no tab param, default to overview
      setActiveTab("overview")
    }
  }, [tabParam, activeTab])

  // Handle tab change - update both state and URL
  const handleTabChange = useCallback((value: string) => {
    if (VALID_TABS.includes(value as any)) {
      setActiveTab(value)
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

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
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
        {activeTab === "overview" && (
          <Suspense fallback={<CompactLoader />}>
            <OverviewContent />
          </Suspense>
        )}
      </TabsContent>

      {/* Members Tab - Lazy loaded, only renders when active */}
      <TabsContent value="members" className="mt-0">
        {activeTab === "members" && (
          <Suspense fallback={<CompactLoader />}>
            <MembersContent />
          </Suspense>
        )}
      </TabsContent>

      {/* Visitors Tab - Lazy loaded, only renders when active */}
      <TabsContent value="visitors" className="mt-0">
        {activeTab === "visitors" && (
          <Suspense fallback={<CompactLoader />}>
            <VisitorsContent />
          </Suspense>
        )}
      </TabsContent>

      {/* Attendance Tab - Lazy loaded, only renders when active */}
      <TabsContent value="attendance" className="mt-0">
        {activeTab === "attendance" && (
          <Suspense fallback={<CompactLoader />}>
            <AttendanceContent />
          </Suspense>
        )}
      </TabsContent>

      {/* Follow Up Tab - Lazy loaded, only renders when active */}
      <TabsContent value="follow-up" className="mt-0">
        {activeTab === "follow-up" && (
          <Suspense fallback={<CompactLoader />}>
            <FollowUpContent />
          </Suspense>
        )}
      </TabsContent>

      {/* Birthdays Tab - Lazy loaded, only renders when active */}
      <TabsContent value="birthdays" className="mt-0">
        {activeTab === "birthdays" && (
          <Suspense fallback={<CompactLoader />}>
            <BirthdaysContent />
          </Suspense>
        )}
      </TabsContent>

      {/* Groups & Departments Tab - Lazy loaded, only renders when active */}
      <TabsContent value="groups-departments" className="mt-0">
        {activeTab === "groups-departments" && (
          <Suspense fallback={<CompactLoader />}>
            <GroupsDepartmentsContent />
          </Suspense>
        )}
      </TabsContent>
    </Tabs>
  )
}
