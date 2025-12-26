"use client"

import React, { useState, useEffect, lazy, Suspense, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LayoutDashboard, Baby, CalendarDays, Cake, Users, ShieldAlert } from "lucide-react"
import { CompactLoader } from "@/components/ui/loader"
import { useOrganization } from "@/hooks/use-organization"
import { useChildrenRealtime } from "@/hooks/use-realtime-subscription"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

// Lazy load tab components - only load when needed
const OverviewContent = lazy(() => import("./OverviewContent").then(m => ({ default: m.default })))
const ChildrenContent = lazy(() => import("./ChildrenContent").then(m => ({ default: m.default })))
const AttendanceContent = lazy(() => import("./AttendanceContent").then(m => ({ default: m.default })))
const BirthdaysContent = lazy(() => import("./BirthdaysContent").then(m => ({ default: m.default })))
const ClassesContent = lazy(() => import("./ClassesContent").then(m => ({ default: m.default })))

const VALID_TABS = ["overview", "children", "attendance", "birthdays", "classes"] as const

export function ChildrenPageClient() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get("tab")
    const [activeTab, setActiveTab] = useState<string>(tabParam && VALID_TABS.includes(tabParam as any) ? tabParam : "overview")

    // Get organization to check if it's a church
    const { organization, isLoading: orgLoading } = useOrganization()
    const isChurch = organization?.type?.trim().toLowerCase() === 'church'

    // Enable real-time subscriptions for live updates
    useChildrenRealtime(isChurch)

    // Update tab when URL parameter changes
    useEffect(() => {
        if (tabParam && VALID_TABS.includes(tabParam as any)) {
            if (activeTab !== tabParam) {
                setActiveTab(tabParam)
            }
        } else if (!tabParam && activeTab !== "overview") {
            setActiveTab("overview")
        }
    }, [tabParam, activeTab])

    // Handle tab change - update both state and URL
    const handleTabChange = useCallback((value: string) => {
        if (VALID_TABS.includes(value as any)) {
            setActiveTab(value)
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

    // Show loading state while checking organization
    if (orgLoading) {
        return <CompactLoader />
    }

    // Show access denied for non-church organizations
    if (!isChurch) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Card className="p-8 max-w-md text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-amber-100">
                            <ShieldAlert className="h-8 w-8 text-amber-600" />
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold mb-2">Feature Not Available</h2>
                    <p className="text-muted-foreground mb-6">
                        The Kids Church module is exclusively available for church organizations.
                        This feature helps churches manage their children&apos;s ministry programs.
                    </p>
                    <Button asChild>
                        <Link href="/dashboard">Return to Dashboard</Link>
                    </Button>
                </Card>
            </div>
        )
    }

    return (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-6">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="children" className="flex items-center gap-2">
                    <Baby className="h-4 w-4" />
                    <span className="hidden sm:inline">Kids</span>
                </TabsTrigger>
                <TabsTrigger value="attendance" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span className="hidden sm:inline">Attendance</span>
                </TabsTrigger>
                <TabsTrigger value="birthdays" className="flex items-center gap-2">
                    <Cake className="h-4 w-4" />
                    <span className="hidden sm:inline">Birthdays</span>
                </TabsTrigger>
                <TabsTrigger value="classes" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Classes</span>
                </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
                {activeTab === "overview" && (
                    <Suspense fallback={<CompactLoader />}>
                        <OverviewContent />
                    </Suspense>
                )}
            </TabsContent>

            {/* Children Tab */}
            <TabsContent value="children" className="mt-0">
                {activeTab === "children" && (
                    <Suspense fallback={<CompactLoader />}>
                        <ChildrenContent />
                    </Suspense>
                )}
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance" className="mt-0">
                {activeTab === "attendance" && (
                    <Suspense fallback={<CompactLoader />}>
                        <AttendanceContent />
                    </Suspense>
                )}
            </TabsContent>

            {/* Birthdays Tab */}
            <TabsContent value="birthdays" className="mt-0">
                {activeTab === "birthdays" && (
                    <Suspense fallback={<CompactLoader />}>
                        <BirthdaysContent />
                    </Suspense>
                )}
            </TabsContent>

            {/* Classes Tab */}
            <TabsContent value="classes" className="mt-0">
                {activeTab === "classes" && (
                    <Suspense fallback={<CompactLoader />}>
                        <ClassesContent />
                    </Suspense>
                )}
            </TabsContent>
        </Tabs>
    )
}

