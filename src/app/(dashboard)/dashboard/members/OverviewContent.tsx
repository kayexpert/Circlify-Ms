"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserCheck, UserX, Network, Building2, Cake, TrendingUp, UserPlus, Calendar, BarChart3, Link as LinkIcon, Send, User } from "lucide-react"
import { Loader, CompactLoader, Spinner } from "@/components/ui/loader"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useMembers, useGroups, useDepartments, useMemberStatistics, useUpcomingBirthdays, useMemberGrowthData, useRecentMembers } from "@/hooks/members"
import { useAttendanceRecords } from "@/hooks/members"
import { formatDate } from "./utils"
import type { Member, Birthday, AttendanceRecord } from "./types"

// Age group distribution and growth data are calculated from real data

export default function OverviewContent() {
  const router = useRouter()
  const { theme, resolvedTheme } = useTheme()
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all")
  const [selectedEventType, setSelectedEventType] = useState<string>("all")
  const [mounted, setMounted] = useState(false)
  
  // Ensure component is mounted before checking theme
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Theme-aware colors for charts
  const isDark = mounted && (resolvedTheme === "dark")
  const chartTextColor = isDark ? "#e5e7eb" : "#1f2937"
  const chartGridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"

  // Fetch data using hooks - OPTIMIZED: Use statistics hook instead of loading all members
  // This uses server-side aggregation which is much faster for large datasets
  const { data: stats, isLoading: statsLoading } = useMemberStatistics()
  const { data: upcomingBirthdays = [], isLoading: birthdaysLoading } = useUpcomingBirthdays(365)
  const { data: groups = [], isLoading: groupsLoading } = useGroups()
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()
  const { data: growthData = [], isLoading: growthLoading } = useMemberGrowthData(timeFilter)
  
  // Only load attendance if needed (lazy load)
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRecords()
  
  const isLoading = statsLoading || birthdaysLoading || groupsLoading || departmentsLoading || growthLoading || attendanceLoading

  const handleViewAllBirthdays = () => {
    router.push("/dashboard/members?tab=birthdays")
  }

  // Use statistics from hook (server-side aggregated) - much faster than client-side calculation
  const memberStats = useMemo(() => {
    if (!stats) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        maleActiveMembers: 0,
        femaleActiveMembers: 0,
        totalGroups: groups.length,
        totalDepartments: departments.length,
        birthdaysThisMonth: 0,
        birthdaysThisWeek: 0,
        birthdaysToday: 0,
      }
    }

    return {
      totalMembers: stats.totalMembers,
      activeMembers: stats.activeMembers,
      inactiveMembers: stats.inactiveMembers,
      maleActiveMembers: stats.maleMembers,
      femaleActiveMembers: stats.femaleMembers,
      totalGroups: stats.totalGroups || groups.length,
      totalDepartments: stats.totalDepartments || departments.length,
      birthdaysThisMonth: stats.birthdaysThisMonth,
      birthdaysThisWeek: stats.birthdaysThisWeek,
      birthdaysToday: stats.birthdaysToday,
    }
  }, [stats, groups.length, departments.length])

  // Memoize today's date to avoid recalculating
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  
  const todayYear = useMemo(() => today.getFullYear(), [today])
  const todayMonth = useMemo(() => today.getMonth(), [today])
  const todayDate = useMemo(() => today.getDate(), [today])
  
  // Memoize end date calculation
  const endDate = useMemo(() => {
    switch (timeFilter) {
      case "month": {
        return new Date(todayYear, todayMonth + 1, 0, 23, 59, 59, 999)
      }
      case "quarter": {
        const quarter = Math.floor(todayMonth / 3)
        return new Date(todayYear, (quarter + 1) * 3, 0, 23, 59, 59, 999)
      }
      case "year": {
        return new Date(todayYear, 11, 31, 23, 59, 59, 999)
      }
      default: // "all"
        // Show next 365 days
        const date = new Date(todayYear, todayMonth, todayDate)
        date.setDate(date.getDate() + 365)
        return date
    }
  }, [timeFilter, todayYear, todayMonth, todayDate])
  
  // Filter upcoming birthdays based on time filter - using optimized hook data
  const filteredUpcomingBirthdays = useMemo(() => {
    if (upcomingBirthdays.length === 0) return []

    // Filter upcoming birthdays from hook data (already optimized server-side)
    return upcomingBirthdays
      .filter((bday) => {
        const bdayDate = new Date(bday.date_of_birth)
        const nextBday = new Date(todayYear, bdayDate.getMonth(), bdayDate.getDate())
        if (nextBday < today) {
          nextBday.setFullYear(todayYear + 1)
        }
        return nextBday <= endDate
      })
      .slice(0, 50) // Limit to 50 for display
      .map((bday) => ({
        id: bday.id,
        first_name: bday.first_name,
        last_name: bday.last_name,
        photo: bday.photo,
        age: bday.age,
        birthday_date: bday.date_of_birth,
        role: "Member",
        daysUntil: bday.days_until,
        nextBirthdayDate: new Date(bday.date_of_birth),
      }))
  }, [upcomingBirthdays, timeFilter, today, todayYear, endDate])

  // Get recent new members - using the useRecentMembers hook
  const { data: recentNewMembersData = [], isLoading: recentMembersLoading } = useRecentMembers(10)
  
  const recentNewMembers = useMemo(() => {
    if (recentMembersLoading || !recentNewMembersData) return []
    
    // Format the data for display
    return recentNewMembersData.map((member) => ({
      id: member.id,
      name: `${member.first_name} ${member.last_name}`,
      joinDate: member.join_date ? new Date(member.join_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }) : 'N/A'
    }))
  }, [recentNewMembersData, recentMembersLoading])

  // Use growth data from hook - calculates cumulative membership over time
  const getGrowthData = useMemo(() => {
    if (isLoading || growthLoading || growthData.length === 0) {
      return []
    }
    return growthData
  }, [growthData, isLoading, growthLoading])

  // Get recurring events from actual attendance records
  // Memoized with early return for empty arrays
  const recurringEvents = useMemo(() => {
    if (attendanceRecords.length === 0) return []
    
    const serviceTypes = new Set<string>()
    // Use for loop for better performance with large arrays
    for (let i = 0; i < attendanceRecords.length; i++) {
      const record = attendanceRecords[i]
      if (record.service_type) {
        serviceTypes.add(record.service_type)
      }
    }
    
    if (serviceTypes.size === 0) return []
    
    // Map service types to dropdown values (normalize names)
    const eventMap: Record<string, string> = {}
    serviceTypes.forEach(type => {
      const normalized = type.toLowerCase().replace(/\s+/g, '')
      if (normalized.includes('sunday')) {
        eventMap[type] = 'sundayService'
      } else if (normalized.includes('midweek')) {
        eventMap[type] = 'midweekService'
      } else if (normalized.includes('prayer')) {
        eventMap[type] = 'prayerMeeting'
      } else if (normalized.includes('bible')) {
        eventMap[type] = 'bibleStudy'
      } else {
        // Use a safe key for other service types
        eventMap[type] = normalized
      }
    })
    
    return Array.from(serviceTypes).map(type => ({
      value: eventMap[type] || type.toLowerCase().replace(/\s+/g, ''),
      label: type,
      originalType: type
    }))
  }, [attendanceRecords])

  // Set default selected event type to "all" when events are loaded
  useEffect(() => {
    if (recurringEvents.length > 0 && selectedEventType === "") {
      setSelectedEventType("all")
    }
  }, [recurringEvents, selectedEventType])

  // Memoize current year to avoid recalculating
  const currentYear = useMemo(() => new Date().getFullYear(), [])
  
  // Get attendance data for selected event type from real records
  const getAttendanceData = useMemo(() => {
    if (isLoading || attendanceRecords.length === 0) {
      return []
    }

    if (selectedEventType === "all") {
      // Show all events on x-axis with their attendance numbers
      const eventAttendanceMap = new Map<string, number>()
      
      // Use for loop for better performance
      for (let i = 0; i < attendanceRecords.length; i++) {
        const record = attendanceRecords[i]
        if (record.service_type && record.total_attendance) {
          const current = eventAttendanceMap.get(record.service_type) || 0
          eventAttendanceMap.set(record.service_type, current + record.total_attendance)
        }
      }

      return Array.from(eventAttendanceMap.entries())
        .map(([event, total]) => ({
          date: event,
          attendance: total,
        }))
        .sort((a, b) => b.attendance - a.attendance) // Sort by attendance descending
    } else {
      // Show specific event type for the entire year (Jan to Dec)
      const selectedEvent = recurringEvents.find(e => e.value === selectedEventType)
      if (!selectedEvent) return []

      const serviceType = selectedEvent.originalType
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      
      // Pre-filter records for this service type to avoid repeated filtering
      const serviceTypeRecords = attendanceRecords.filter(record => record.service_type === serviceType)
      
      return monthNames.map((monthName, index) => {
        const monthStart = new Date(currentYear, index, 1)
        const monthEnd = new Date(currentYear, index + 1, 1)
        
        const totalAttendance = serviceTypeRecords.reduce((sum, record) => {
          const recordDate = new Date(record.date + "T00:00:00")
          if (recordDate >= monthStart && recordDate < monthEnd) {
            return sum + (record.total_attendance || 0)
          }
          return sum
        }, 0)

        return {
          date: monthName,
          attendance: totalAttendance,
        }
      })
    }
  }, [attendanceRecords, selectedEventType, recurringEvents, isLoading, currentYear])

  // Calculate age distribution - simplified since we're not loading all members
  // For detailed age distribution, consider using a dedicated statistics endpoint
  const ageGroupData = useMemo(() => {
    if (isLoading || !memberStats.totalMembers) {
      return []
    }

    // Return placeholder data structure - can be enhanced with server-side aggregation
    const ageGroups = [
      { name: "18-25", min: 18, max: 25, fill: "#8b5cf6" },
      { name: "26-35", min: 26, max: 35, fill: "#6366f1" },
      { name: "36-45", min: 36, max: 45, fill: "#3b82f6" },
      { name: "46-55", min: 46, max: 55, fill: "#0ea5e9" },
      { name: "56+", min: 56, max: 200, fill: "#06b6d4" },
    ]

    // Return empty data for now - this would require server-side aggregation
    // to calculate age distribution without loading all members
    return ageGroups.map((group: any) => ({
      name: group.name,
      value: 0, // Placeholder - would need server-side calculation
      fill: group.fill,
    }))
  }, [memberStats, isLoading])

  // Show loading state - similar to finance page
  if (isLoading) {
    return <Loader text="Loading members overview..." size="lg" />
  }

  return (
    <div className="space-y-6">
      {/* Time Filter at Top Right */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={timeFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("all")}
            className="px-4"
          >
            All
          </Button>
          <Button
            variant={timeFilter === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("month")}
            className="px-4"
          >
            Monthly
          </Button>
          <Button
            variant={timeFilter === "quarter" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("quarter")}
            className="px-4"
          >
            Quarterly
          </Button>
          <Button
            variant={timeFilter === "year" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("year")}
            className="px-4"
          >
            Annually
          </Button>
        </div>
      </div>

      {/* Stats Cards - 4 Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{isLoading ? <Spinner size="md" className="inline-block" /> : memberStats.totalMembers.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCheck className="h-3 w-3 text-green-500" />
                <span>Active: {memberStats.activeMembers.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-3 w-3 text-red-500" />
                <span>Inactive: {memberStats.inactiveMembers.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Gender Distribution of Active Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gender Distribution</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-3">
              {/* Data Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : memberStats.maleActiveMembers.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : memberStats.femaleActiveMembers.toLocaleString()}</span>
                </div>
              </div>

              {/* Labels Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Total Male:</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <User className="h-4 w-4 text-pink-600" />
                  <span className="text-sm text-muted-foreground">Total Female:</span>
                </div>
              </div>
             
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Groups and Departments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Groups & Departments</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-2 space-y-3">
             
              {/* Data Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : memberStats.totalGroups}</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : memberStats.totalDepartments}</span>
                </div>
              </div>

               {/* Labels Row */}
               <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-center gap-2">
                  <Network className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Groups:</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Dept.:</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Birthdays */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Birthdays</CardTitle>
            <Cake className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{isLoading ? <Spinner size="md" className="inline-block" /> : memberStats.birthdaysThisMonth}</div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span>This Week: {memberStats.birthdaysThisWeek}</span>
              <span>Today: {memberStats.birthdaysToday}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership Growth Chart - Full Row */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Membership Growth</CardTitle>
            <CardDescription>Track membership trends over time</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {getGrowthData.length === 0 ? (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={getGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                <XAxis 
                  dataKey="period" 
                  tick={{ fill: chartTextColor }}
                  axisLine={{ stroke: chartGridColor }}
                  interval={0}
                />
                <YAxis 
                  tick={{ fill: chartTextColor }}
                  axisLine={{ stroke: chartGridColor }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
                    border: `1px solid ${isDark ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)"}`,
                    borderRadius: "0.5rem",
                    color: isDark ? "#e5e7eb" : "#1f2937"
                  }}
                  labelStyle={{ color: chartTextColor }}
                />
                <Legend 
                  wrapperStyle={{ color: chartTextColor }}
                />
                <Line type="monotone" dataKey="members" stroke="#8b5cf6" strokeWidth={2} name="Total Members" />
                <Line type="monotone" dataKey="active" stroke="#10b981" strokeWidth={2} name="Active Members" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Attendance Trend and Age Distribution */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-[1.6fr_1fr]">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Attendance Trend</CardTitle>
                <CardDescription>Attendance by event type</CardDescription>
              </div>
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  {recurringEvents.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px]">
                <CompactLoader />
              </div>
            ) : getAttendanceData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No attendance data available for selected event type
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getAttendanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: chartTextColor }}
                    axisLine={{ stroke: chartGridColor }}
                  />
                  <YAxis 
                    tick={{ fill: chartTextColor }}
                    axisLine={{ stroke: chartGridColor }}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: isDark ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
                      border: `1px solid ${isDark ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)"}`,
                      borderRadius: "0.5rem",
                      color: isDark ? "#e5e7eb" : "#1f2937"
                    }}
                    labelStyle={{ color: chartTextColor }}
                  />
                  <Bar 
                    dataKey="attendance" 
                    fill="#8b5cf6" 
                    radius={[8, 8, 0, 0]}
                    activeBar={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Age Distribution</CardTitle>
            <CardDescription>Members by age groups</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px]">
                <CompactLoader />
              </div>
            ) : ageGroupData.length === 0 || ageGroupData.every(d => d.value === 0) ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No age data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageGroupData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: chartTextColor }}
                    axisLine={{ stroke: chartGridColor }}
                  />
                  <YAxis 
                    tick={{ fill: chartTextColor }}
                    axisLine={{ stroke: chartGridColor }}
                  />
                  <Tooltip 
                    cursor={false}
                    contentStyle={{ 
                      backgroundColor: isDark ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
                      border: `1px solid ${isDark ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)"}`,
                      borderRadius: "0.5rem",
                      color: isDark ? "#e5e7eb" : "#1f2937"
                    }}
                    labelStyle={{ color: chartTextColor }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]}
                    activeBar={false}
                  >
                    {ageGroupData.map((entry: { name: string; value: number; fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Birthdays and New Members */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Birthdays */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-muted-foreground" />
              <CardTitle>
                Upcoming Birthdays
                {!isLoading && filteredUpcomingBirthdays.length > 0 && ` (${filteredUpcomingBirthdays.length})`}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[320px]">
                <CompactLoader />
              </div>
            ) : filteredUpcomingBirthdays.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[320px] text-muted-foreground">
                <Cake className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">No upcoming birthdays</p>
                <p className="text-xs mt-1">
                  {timeFilter === "all" && "in the next year"}
                  {timeFilter === "year" && "this year"}
                  {timeFilter === "quarter" && "this quarter"}
                  {timeFilter === "month" && "this month"}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[320px] pr-4">
                <div className="space-y-3">
                  {filteredUpcomingBirthdays.map((person) => {
                    const isToday = person.daysUntil === 0
                    const birthdayText = isToday 
                      ? `Turning ${person.age} today! 🎉`
                      : person.daysUntil === 1
                      ? `Turning ${person.age} tomorrow`
                      : `Turning ${person.age} in ${person.daysUntil} days`
                    
                    return (
                      <div key={person.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-16 w-16 rounded-full overflow-hidden flex-shrink-0">
                              {person.photo ? (
                                <Image
                                  src={person.photo}
                                  alt={`${person.first_name} ${person.last_name}`}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                                  {`${person.first_name?.[0] || ''}${person.last_name?.[0] || ''}`}
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="font-semibold">{person.first_name} {person.last_name}</h3>
                              <p className="text-sm text-muted-foreground">{person.role}</p>
                              <p className="text-sm text-muted-foreground">{birthdayText}</p>
                            </div>
                          </div>
                          <Button size="sm" className="bg-primary text-primary-foreground h-8 w-8 p-0">
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Recent New Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent New Members</CardTitle>
                <CardDescription>Latest members joined this month</CardDescription>
              </div>
              <UserPlus className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px] pr-4">
              <div className="space-y-4">
                {isLoading ? (
                  <CompactLoader />
                ) : recentNewMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    No recent members to display
                  </div>
                ) : (
                  recentNewMembers.map((member: any) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {member.name.split(" ").map((n: string) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">Joined {member.joinDate}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
