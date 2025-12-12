"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useQueriesCompletion, isQueryComplete } from "@/hooks/use-query-completion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, DollarSign, Calendar, TrendingUp, TrendingDown, Cake, ArrowRight } from "lucide-react"
import type { ComponentType } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/database"
import { CompactLoader } from "@/components/ui/loader"
import { useMemberStatistics, useUpcomingBirthdays, useRecentMembers, useMemberGrowthData } from "@/hooks/members/useMemberStatistics"
import { useFinanceOverview, useFinanceMonthlyTrends } from "@/hooks/finance/useFinanceStatistics"
import { useEvents } from "@/hooks/events"
import { useVisitorsPaginated } from "@/hooks/members/useVisitors"
import { useOrganization } from "@/hooks/use-organization"
import { usePageLoading } from "@/contexts/page-loading-context"
import { formatCurrency } from "@/app/(dashboard)/dashboard/projects/utils"
import { getOrganizationTypeLabelLowercase } from "@/lib/utils/organization"
import { format } from "date-fns"
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

type ChangeType = "increase" | "decrease" | "neutral"
type Stat = {
  title: string
  value: string
  change: string
  changeType: ChangeType
  icon: ComponentType<{ className?: string }>
  description: string
}

const COLORS = ["#8b5cf6", "#6366f1", "#3b82f6", "#0ea5e9"]

export function DashboardPageClient() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const { setPageLoading } = usePageLoading()
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  // Fetch real data using optimized hooks
  const memberStatsQuery = useMemberStatistics()
  const { data: memberStats } = memberStatsQuery
  const { data: todayBirthdays = [], isLoading: birthdaysLoading } = useUpcomingBirthdays(1) // Today only
  const { data: recentMembers = [], isLoading: recentMembersLoading } = useRecentMembers(4)
  const financeQuery = useFinanceOverview()
  const { data: financeOverview } = financeQuery
  const { data: financeTrends = [], isLoading: trendsLoading } = useFinanceMonthlyTrends(6)
  const eventsQuery = useEvents()
  const { data: events = [] } = eventsQuery
  const { data: visitorsData, isLoading: visitorsLoading } = useVisitorsPaginated(1, 100) // Get recent visitors
  const { data: growthData = [], isLoading: growthLoading } = useMemberGrowthData("all")

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url, created_at')
          .eq('id', authUser.id)
          .single()
        
        if (userData) {
          setUser(userData)
        }
      }
    }
    
    loadUser()
  }, [supabase])

  const userName = user?.full_name || user?.email?.split('@')[0] || "there"

  // Memoize stats calculation
  const stats = useMemo((): Stat[] => {
    const totalMembers = memberStats?.totalMembers || 0
    const recentVisitors = visitorsData?.data?.length || 0
    const totalIncome = financeOverview?.totalIncome || 0
    const upcomingEventsCount = events.filter(e => {
      const eventDate = new Date(e.event_date)
      const weekFromNow = new Date()
      weekFromNow.setDate(weekFromNow.getDate() + 7)
      return eventDate >= new Date() && eventDate <= weekFromNow
    }).length

    return [
      {
        title: "Total Members",
        value: totalMembers.toString(),
        change: "+0",
        changeType: "neutral" as const,
        icon: Users,
        description: "active members",
      },
      {
        title: "Recent Visitors",
        value: recentVisitors.toString(),
        change: "+0",
        changeType: "neutral" as const,
        icon: UserPlus,
        description: "recent visitors",
      },
      {
        title: "Total Income",
        value: formatCurrency(totalIncome, organization?.currency || "USD"),
        change: "+0%",
        changeType: "neutral" as const,
        icon: DollarSign,
        description: "total income",
      },
      {
        title: "Upcoming Events",
        value: upcomingEventsCount.toString(),
        change: "0",
        changeType: "neutral" as const,
        icon: Calendar,
        description: "this week",
      },
    ]
  }, [memberStats, visitorsData, financeOverview, events])

  // Memoize chart data
  const memberGrowthData = useMemo(() => {
    return growthData.slice(-6).map((item, index) => ({
      month: item.period,
      members: item.members,
      active: item.active,
    }))
  }, [growthData])

  const donationData = useMemo(() => {
    return financeTrends.slice(-6).map(item => ({
      month: item.period,
      amount: item.income,
    }))
  }, [financeTrends])

  // Get upcoming events for display
  const upcomingEvents = useMemo(() => {
    return events
      .filter(e => {
        const eventDate = new Date(e.event_date)
        return eventDate >= new Date()
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
      .slice(0, 4)
      .map(e => ({
        name: e.name,
        date: format(new Date(e.event_date), "EEE, MMM d, h:mm a"),
      }))
  }, [events])

  // Check if critical queries have completed (using proper React Query status)
  // Use the query objects already fetched above
  const criticalQueriesComplete = useQueriesCompletion([
    memberStatsQuery,
    financeQuery,
    eventsQuery
  ])
  
  // SIMPLIFIED: Only wait for organization, show page immediately after
  // Queries will load in background and show their own loading states
  const criticalLoading = useMemo(() => {
    // If organization is still loading, we're definitely loading
    if (orgLoading) {
      return true
    }
    
    const hasOrganization = !!organization?.id
    
    // If no organization yet, we're still loading
    if (!hasOrganization) {
      return true
    }
    
    // Once organization is ready, show the page immediately
    // Don't wait for queries - they can load in background
    return false
  }, [orgLoading, organization?.id])
  
  // Use ref to track previous loading state and prevent unnecessary updates
  const prevLoadingRef = useRef(criticalLoading)
  const orgJustLoadedRef = useRef(false)
  
  // Track when organization just finished loading
  useEffect(() => {
    if (orgLoading) {
      orgJustLoadedRef.current = false
    } else if (organization?.id && !orgJustLoadedRef.current) {
      // Organization just finished loading - give queries a moment to start
      orgJustLoadedRef.current = true
    }
  }, [orgLoading, organization?.id])
  
  // Update page loading state - set to true when org is loading, false when ready
  useEffect(() => {
    // Set loading state based on org loading
    const isCurrentlyLoading = orgLoading || !organization?.id
    setPageLoading(isCurrentlyLoading)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[DashboardClient] Page loading state:', isCurrentlyLoading, {
        orgLoading,
        hasOrg: !!organization?.id,
        orgId: organization?.id
      })
    }
  }, [orgLoading, organization?.id, setPageLoading])
  
  // Safety timeout: if loader is stuck for more than 10 seconds, force it off
  // This is a last resort - proper completion detection should handle it
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (criticalLoading) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Loader] Safety timeout reached after 10s - forcing page to show', {
            orgLoading,
            hasOrg: !!organization?.id,
            memberStatsComplete: isQueryComplete(memberStatsQuery),
            financeComplete: isQueryComplete(financeQuery),
            eventsComplete: isQueryComplete(eventsQuery)
          })
        }
        setPageLoading(false)
      }
    }, 10000)
    
    // Cleanup
    return () => {
      clearTimeout(timeoutId)
    }
  }, [criticalLoading, setPageLoading, orgLoading, organization?.id, memberStatsQuery, financeQuery, eventsQuery])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPageLoading(false)
    }
  }, [setPageLoading])

  // Don't render content until organization is loaded
  // Queries can load in background
  if (orgLoading || !organization?.id) {
    return null; // Layout loader will handle the loading state
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {userName}! Here's what's happening with your {getOrganizationTypeLabelLowercase(organization?.type)}.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground">
                  {stat.changeType === "increase" && (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  )}
                  {stat.changeType === "decrease" && (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.changeType === "increase" ? "text-green-500" : stat.changeType === "decrease" ? "text-red-500" : ""}>
                    {stat.change}
                  </span>
                  <span className="ml-1">{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Today's Birthdays Widget */}
      {todayBirthdays.length > 0 && (
        <Card className="border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-pink-600" />
                <CardTitle className="text-pink-600">Celebrating Today! 🎉</CardTitle>
              </div>
              <Link href="/dashboard/birthdays">
                <span className="text-sm text-pink-600 hover:underline flex items-center gap-1 cursor-pointer">
                  View All <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {todayBirthdays.map((person) => (
                <div key={person.id} className="flex items-center gap-3 p-3 bg-white dark:bg-background rounded-lg border-2 border-pink-200 dark:border-pink-800">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 bg-primary/10 flex items-center justify-center">
                    {person.photo ? (
                      <Image src={person.photo} alt={`${person.first_name} ${person.last_name}`} fill className="object-cover" />
                    ) : (
                      <span className="text-sm font-medium">
                        {person.first_name[0]}{person.last_name[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{person.first_name} {person.last_name}</p>
                    <p className="text-sm text-muted-foreground">Age {person.age}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Member Growth</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Growth</CardTitle>
              <CardDescription>Monthly member statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {memberGrowthData.length > 0 ? (
                <Suspense fallback={<CompactLoader />}>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={memberGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="members" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" />
                      <Area type="monotone" dataKey="active" stackId="1" stroke="#6366f1" fill="#6366f1" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Suspense>
              ) : (
                <p className="text-muted-foreground text-center py-8">No growth data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="donations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Trends</CardTitle>
              <CardDescription>Monthly income amounts</CardDescription>
            </CardHeader>
            <CardContent>
              {donationData.length > 0 ? (
                <Suspense fallback={<CompactLoader />}>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={donationData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="amount" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              ) : (
                <p className="text-muted-foreground text-center py-8">No income data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Member Distribution</CardTitle>
              <CardDescription>Active vs Inactive members</CardDescription>
            </CardHeader>
            <CardContent>
              {memberStats && (
                <Suspense fallback={<CompactLoader />}>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Active", value: memberStats.activeMembers },
                          { name: "Inactive", value: memberStats.inactiveMembers },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill={COLORS[0]} />
                        <Cell fill={COLORS[1]} />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Suspense>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Members</CardTitle>
            <CardDescription>Latest member registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentMembers.length > 0 ? (
                recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                      {member.first_name[0]}{member.last_name[0]}
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{member.first_name} {member.last_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {format(new Date(member.join_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No recent members</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Next scheduled events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{event.name}</p>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No upcoming events</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}




