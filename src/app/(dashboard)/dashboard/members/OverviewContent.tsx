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
import { useMembers } from "@/hooks/members"
import { useGroups } from "@/hooks/members"
import { useDepartments } from "@/hooks/members"
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

  // Fetch data using hooks - only essential fields for overview
  // Use parallel queries with React Query's built-in optimization
  const { data: allMembers = [], isLoading: membersLoading } = useMembers()
  const { data: groups = [], isLoading: groupsLoading } = useGroups()
  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()
  
  // Only load attendance if we have members (lazy load)
  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useAttendanceRecords()
  
  const isLoading = membersLoading || groupsLoading || departmentsLoading || attendanceLoading

  const handleViewAllBirthdays = () => {
    router.push("/dashboard/members?tab=birthdays")
  }

  // Filter members based on time filter
  const filteredMembers = useMemo(() => {
    if (timeFilter === "all") return allMembers

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return allMembers.filter((member: any) => {
      if (!member.join_date) return false
      const joinDate = new Date(member.join_date + "T00:00:00")

      switch (timeFilter) {
        case "month": {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
          return joinDate >= firstDay && joinDate <= lastDay
        }
        case "quarter": {
          const quarter = Math.floor(today.getMonth() / 3)
          const firstDay = new Date(today.getFullYear(), quarter * 3, 1)
          const lastDay = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
          return joinDate >= firstDay && joinDate <= lastDay
        }
        case "year": {
          const firstDay = new Date(today.getFullYear(), 0, 1)
          const lastDay = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
          return joinDate >= firstDay && joinDate <= lastDay
        }
        default:
          return true
      }
    })
  }, [allMembers, timeFilter])

  // Calculate statistics from filtered data
  const stats = useMemo(() => {
    const totalMembers = filteredMembers.length
    const activeMembers = filteredMembers.filter((m: any) => m.membership_status === "active").length
    const inactiveMembers = filteredMembers.filter((m: any) => m.membership_status === "inactive").length
    const activeMembersList = filteredMembers.filter((m: any) => m.membership_status === "active")
    const maleActiveMembers = activeMembersList.filter((m: any) => m.gender?.toLowerCase() === "male").length
    const femaleActiveMembers = activeMembersList.filter((m: any) => m.gender?.toLowerCase() === "female").length
    const totalGroups = groups.length
    const totalDepartments = departments.length

    // Calculate birthdays
    const today = new Date()
    const todayMonth = today.getMonth()
    const todayDate = today.getDate()
    const todayYear = today.getFullYear()
    const thisMonth = today.getMonth()
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
    
    const birthdaysThisMonth = filteredMembers.filter((member: any) => {
      if (!member.date_of_birth) return false
      const birthDate = new Date(member.date_of_birth + "T00:00:00")
      return birthDate.getMonth() === thisMonth
    }).length

    const birthdaysThisWeek = filteredMembers.filter((member: any) => {
      if (!member.date_of_birth) return false
      const birthDate = new Date(member.date_of_birth + "T00:00:00")
      const weekEnd = new Date(thisWeekStart)
      weekEnd.setDate(thisWeekStart.getDate() + 7)
      return birthDate >= thisWeekStart && birthDate < weekEnd && birthDate.getMonth() === thisMonth
    }).length

    const birthdaysToday = filteredMembers.filter((member: any) => {
      if (!member.date_of_birth) return false
      const birthDate = new Date(member.date_of_birth + "T00:00:00")
      return birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDate
    }).length

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      maleActiveMembers,
      femaleActiveMembers,
      totalGroups,
      totalDepartments,
      birthdaysThisMonth,
      birthdaysThisWeek,
      birthdaysToday,
    }
  }, [filteredMembers, groups, departments])

  // Get upcoming birthdays based on time filter - optimized for large datasets
  const upcomingBirthdays = useMemo(() => {
    if (filteredMembers.length === 0) return []
    
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    const todayDate = today.getDate()
    const todayTime = new Date(todayYear, todayMonth, todayDate).getTime()

    let endDate: Date
    switch (timeFilter) {
      case "month": {
        endDate = new Date(todayYear, todayMonth + 1, 0, 23, 59, 59, 999)
        break
      }
      case "quarter": {
        const quarter = Math.floor(todayMonth / 3)
        endDate = new Date(todayYear, (quarter + 1) * 3, 0, 23, 59, 59, 999)
        break
      }
      case "year": {
        endDate = new Date(todayYear, 11, 31, 23, 59, 59, 999)
        break
      }
      default: // "all"
        // Show next 365 days
        endDate = new Date(todayYear, todayMonth, todayDate)
        endDate.setDate(endDate.getDate() + 365)
        break
    }

    // Pre-allocate array for better performance
    const birthdays: Array<{
      id: number
      first_name: string
      last_name: string
      photo?: string
      age: number
      birthday_date: string
      role: string
      daysUntil: number
      nextBirthdayDate: Date
    }> = []

    // Use for loop for better performance with large arrays
    for (let i = 0; i < filteredMembers.length; i++) {
      const member = filteredMembers[i]
      if (!member.date_of_birth) continue
      
      const birthDate = new Date(member.date_of_birth + "T00:00:00")
      const birthMonth = birthDate.getMonth()
      const birthDay = birthDate.getDate()
      
      // Calculate next birthday this year
      let nextBirthday = new Date(todayYear, birthMonth, birthDay)
      if (nextBirthday.getTime() < todayTime) {
        // Birthday already passed this year, use next year
        nextBirthday = new Date(todayYear + 1, birthMonth, birthDay)
      }
      
      if (nextBirthday.getTime() <= endDate.getTime()) {
        const daysUntil = Math.ceil((nextBirthday.getTime() - todayTime) / (1000 * 60 * 60 * 24))
        const age = todayYear - birthDate.getFullYear()
        const willTurnAge = nextBirthday.getFullYear() === todayYear ? age : age + 1
        
        birthdays.push({
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          photo: member.photo,
          age: willTurnAge,
          birthday_date: member.date_of_birth,
          role: "Member",
          daysUntil,
          nextBirthdayDate: nextBirthday,
        })
      }
    }
    
    // Sort and limit
    birthdays.sort((a, b) => a.daysUntil - b.daysUntil)
    return birthdays.slice(0, 50) // Limit to 50 for display
  }, [filteredMembers, timeFilter])

  // Get recent new members (sorted by join_date, latest first)
  const recentNewMembers = useMemo(() => {
    return filteredMembers
      .filter((m: any) => m.join_date)
      .sort((a: any, b: any) => {
        if (!a.join_date || !b.join_date) return 0
        return new Date(b.join_date).getTime() - new Date(a.join_date).getTime()
      })
      .slice(0, 4)
      .map((member: any) => ({
        id: member.id,
        name: `${member.first_name} ${member.last_name}`,
        joinDate: member.join_date ? formatDate(member.join_date) : "N/A",
      }))
  }, [filteredMembers])

  // Calculate growth data from filtered member data
  const getGrowthData = useMemo(() => {
    if (isLoading || filteredMembers.length === 0) {
      return []
    }

    const now = new Date()
    let data: Array<{ period: string; members: number; active: number }> = []

    // Always show monthly growth based on time filter
    if (timeFilter === "all") {
      // Show last 12 months
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
        
        const membersByMonth = filteredMembers.filter((m: any) => {
          if (!m.join_date) return false
          const joinDate = new Date(m.join_date + "T00:00:00")
          return joinDate < monthEnd
        })
        
        const activeByMonth = membersByMonth.filter((m: any) => m.membership_status === "active")
        
        data.push({
          period: monthName,
          members: membersByMonth.length,
          active: activeByMonth.length,
        })
      }
    } else if (timeFilter === "year") {
      // Show monthly for current year
      for (let i = 0; i < 12; i++) {
        const monthDate = new Date(now.getFullYear(), i, 1)
        const monthEnd = new Date(now.getFullYear(), i + 1, 1)
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
        
        const membersByMonth = filteredMembers.filter((m: any) => {
          if (!m.join_date) return false
          const joinDate = new Date(m.join_date + "T00:00:00")
          return joinDate < monthEnd
        })
        
        const activeByMonth = membersByMonth.filter((m: any) => m.membership_status === "active")
        
        data.push({
          period: monthName,
          members: membersByMonth.length,
          active: activeByMonth.length,
        })
      }
    } else if (timeFilter === "quarter") {
      // Show monthly for current quarter
      const quarter = Math.floor(now.getMonth() / 3)
      for (let i = 0; i < 3; i++) {
        const monthIndex = quarter * 3 + i
        const monthDate = new Date(now.getFullYear(), monthIndex, 1)
        const monthEnd = new Date(now.getFullYear(), monthIndex + 1, 1)
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' })
        
        const membersByMonth = filteredMembers.filter((m: any) => {
          if (!m.join_date) return false
          const joinDate = new Date(m.join_date + "T00:00:00")
          return joinDate < monthEnd
        })
        
        const activeByMonth = membersByMonth.filter((m: any) => m.membership_status === "active")
        
        data.push({
          period: monthName,
          members: membersByMonth.length,
          active: activeByMonth.length,
        })
      }
    } else if (timeFilter === "month") {
      // Show daily for current month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const dayDate = new Date(now.getFullYear(), now.getMonth(), i)
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), i + 1)
        
        const membersByDay = filteredMembers.filter((m: any) => {
          if (!m.join_date) return false
          const joinDate = new Date(m.join_date + "T00:00:00")
          return joinDate < dayEnd
        })
        
        const activeByDay = membersByDay.filter((m: any) => m.membership_status === "active")
        
        data.push({
          period: i.toString(),
          members: membersByDay.length,
          active: activeByDay.length,
        })
      }
    }

    return data
  }, [filteredMembers, timeFilter, isLoading])

  // Get recurring events from actual attendance records
  const recurringEvents = useMemo(() => {
    const serviceTypes = new Set<string>()
    attendanceRecords.forEach(record => {
      if (record.service_type) {
        serviceTypes.add(record.service_type)
      }
    })
    
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

  // Get attendance data for selected event type from real records
  const getAttendanceData = useMemo(() => {
    if (isLoading || attendanceRecords.length === 0) {
      return []
    }

    const now = new Date()
    const currentYear = now.getFullYear()

    if (selectedEventType === "all") {
      // Show all events on x-axis with their attendance numbers
      const eventAttendanceMap = new Map<string, number>()
      
      attendanceRecords.forEach(record => {
        if (record.service_type && record.total_attendance) {
          const current = eventAttendanceMap.get(record.service_type) || 0
          eventAttendanceMap.set(record.service_type, current + record.total_attendance)
        }
      })

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
      
      return monthNames.map((monthName, index) => {
        const monthStart = new Date(currentYear, index, 1)
        const monthEnd = new Date(currentYear, index + 1, 1)
        
        const monthRecords = attendanceRecords.filter(record => {
          if (record.service_type !== serviceType) return false
          const recordDate = new Date(record.date + "T00:00:00")
          return recordDate >= monthStart && recordDate < monthEnd
        })

        const totalAttendance = monthRecords.reduce((sum, record) => sum + (record.total_attendance || 0), 0)

        return {
          date: monthName,
          attendance: totalAttendance,
        }
      })
    }
  }, [attendanceRecords, selectedEventType, recurringEvents, isLoading])

  // Calculate age distribution from filtered member data
  const ageGroupData = useMemo(() => {
    if (isLoading || filteredMembers.length === 0) {
      return []
    }

    const today = new Date()
    const ageGroups = [
      { name: "18-25", min: 18, max: 25, fill: "#8b5cf6" },
      { name: "26-35", min: 26, max: 35, fill: "#6366f1" },
      { name: "36-45", min: 36, max: 45, fill: "#3b82f6" },
      { name: "46-55", min: 46, max: 55, fill: "#0ea5e9" },
      { name: "56+", min: 56, max: 200, fill: "#06b6d4" },
    ]

    return ageGroups.map((group: any) => {
      const count = filteredMembers.filter((member: any) => {
        if (!member.date_of_birth) return false
        const birthDate = new Date(member.date_of_birth + "T00:00:00")
        const age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        const dayDiff = today.getDate() - birthDate.getDate()
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
        
        return actualAge >= group.min && actualAge <= group.max
      }).length

      return {
        name: group.name,
        value: count,
        fill: group.fill,
      }
    })
  }, [filteredMembers, isLoading])

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
            <div className="text-4xl font-bold">{isLoading ? <Spinner size="md" className="inline-block" /> : stats.totalMembers.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserCheck className="h-3 w-3 text-green-500" />
                <span>Active: {stats.activeMembers.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-3 w-3 text-red-500" />
                <span>Inactive: {stats.inactiveMembers.toLocaleString()}</span>
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
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : stats.maleActiveMembers.toLocaleString()}</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : stats.femaleActiveMembers.toLocaleString()}</span>
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
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : stats.totalGroups}</span>
                </div>
                <div className="text-center">
                  <span className="text-2xl font-semibold text-foreground">{isLoading ? <Spinner size="sm" className="inline-block" /> : stats.totalDepartments}</span>
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
            <div className="text-4xl font-bold">{isLoading ? <Spinner size="md" className="inline-block" /> : stats.birthdaysThisMonth}</div>
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span>This Week: {stats.birthdaysThisWeek}</span>
              <span>Today: {stats.birthdaysToday}</span>
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
          {isLoading ? (
            <div className="h-[350px]">
              <CompactLoader />
            </div>
          ) : getGrowthData.length === 0 ? (
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
                {!isLoading && upcomingBirthdays.length > 0 && ` (${upcomingBirthdays.length})`}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[320px]">
                <CompactLoader />
              </div>
            ) : upcomingBirthdays.length === 0 ? (
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
                  {upcomingBirthdays.map((person) => {
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
