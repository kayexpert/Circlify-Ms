"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, Users, UserPlus, UserMinus, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useMembers } from "@/hooks/members/useMembers"
import { useVisitors } from "@/hooks/members/useVisitors"
import type { PeriodType, DateRange, MemberSummary } from "./types"
import { getDateRangeForPeriod, formatDate, formatNumber, getAgeGroup, generateCSV, downloadCSV } from "./utils"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff", "#0088fe", "#00c49f"]

export default function MemberReportsContent() {
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // Fetch data
  const { data: members = [] } = useMembers()
  const { data: visitors = [] } = useVisitors()

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Calculate summary
  const summary: MemberSummary = useMemo(() => {
    const totalMembers = members.length
    const activeMembers = members.filter((m: any) => m.membership_status === "active").length
    const inactiveMembers = members.filter((m: any) => m.membership_status === "inactive").length
    const totalVisitors = visitors.length

    // New members this period
    const newMembersThisPeriod = members.filter((m: any) => {
      if (!m.join_date) return false
      const joinDate = new Date(m.join_date)
      return joinDate >= dateRange.startDate && joinDate <= dateRange.endDate
    }).length

    // Members by gender
    const genderMap = new Map<string, number>()
    members.forEach((member: any) => {
      const gender = member.gender || "Unknown"
      genderMap.set(gender, (genderMap.get(gender) || 0) + 1)
    })
    const membersByGender = Array.from(genderMap.entries()).map(([gender, count]) => ({ gender, count }))

    // Members by status
    const statusMap = new Map<string, number>()
    members.forEach((member: any) => {
      const status = member.membership_status || "unknown"
      statusMap.set(status, (statusMap.get(status) || 0) + 1)
    })
    const membersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }))

    // Members by age group
    const ageGroupMap = new Map<string, number>()
    members.forEach((member: any) => {
      const ageGroup = getAgeGroup(member.date_of_birth)
      ageGroupMap.set(ageGroup, (ageGroupMap.get(ageGroup) || 0) + 1)
    })
    const membersByAgeGroup = Array.from(ageGroupMap.entries()).map(([ageGroup, count]) => ({ ageGroup, count }))

    // Members by group
    const groupMap = new Map<string, number>()
    members.forEach((member: any) => {
      if (member.groups && member.groups.length > 0) {
        member.groups.forEach((group: any) => {
          groupMap.set(group, (groupMap.get(group) || 0) + 1)
        })
      }
    })
    const membersByGroup = Array.from(groupMap.entries())
      .map(([group, count]) => ({ group, count }))
      .sort((a, b) => b.count - a.count)

    // Members by department
    const departmentMap = new Map<string, number>()
    members.forEach((member: any) => {
      if (member.departments && member.departments.length > 0) {
        member.departments.forEach((dept: any) => {
          departmentMap.set(dept, (departmentMap.get(dept) || 0) + 1)
        })
      }
    })
    const membersByDepartment = Array.from(departmentMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
      visitors: totalVisitors,
      newMembersThisPeriod,
      membersByGender,
      membersByStatus,
      membersByAgeGroup,
      membersByGroup,
      membersByDepartment,
    }
  }, [members, visitors, dateRange])

  // Calculate previous period for comparison
  const previousPeriodRange = useMemo(() => {
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevEnd = new Date(dateRange.startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - daysDiff)
    return { startDate: prevStart, endDate: prevEnd }
  }, [dateRange])

  const previousNewMembers = useMemo(() => {
    return members.filter((m: any) => {
      if (!m.join_date) return false
      const joinDate = new Date(m.join_date)
      return joinDate >= previousPeriodRange.startDate && joinDate <= previousPeriodRange.endDate
    }).length
  }, [members, previousPeriodRange])

  const memberGrowthRate = useMemo(() => {
    if (previousNewMembers === 0) return summary.newMembersThisPeriod > 0 ? 100 : 0
    return ((summary.newMembersThisPeriod - previousNewMembers) / previousNewMembers) * 100
  }, [summary.newMembersThisPeriod, previousNewMembers])

  // Export to CSV
  const handleExport = () => {
    const headers = ["First Name", "Last Name", "Email", "Phone", "Status", "Gender", "Age Group", "Join Date", "Groups", "Departments"]
    const rows: (string | number)[][] = []

    members.forEach((member: any) => {
      rows.push([
        member.first_name || "",
        member.last_name || "",
        member.email || "",
        member.phone_number || "",
        member.membership_status || "",
        member.gender || "Unknown",
        getAgeGroup(member.date_of_birth),
        member.join_date || "",
        (member.groups || []).join("; "),
        (member.departments || []).join("; "),
      ])
    })

    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `member-report-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.csv`)
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Period</label>
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <DatePicker
                    date={customRange?.startDate}
                    onSelect={(date) => setCustomRange((prev) => ({ ...prev, startDate: date || new Date(), endDate: prev?.endDate || new Date() }))}
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <DatePicker
                    date={customRange?.endDate}
                    onSelect={(date) => setCustomRange((prev) => ({ ...prev, startDate: prev?.startDate || new Date(), endDate: date || new Date() }))}
                  />
                </div>
              </>
            )}
            <div className="flex items-end">
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalMembers)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(summary.activeMembers)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.totalMembers > 0 ? ((summary.activeMembers / summary.totalMembers) * 100).toFixed(1) : 0}% of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Members</CardTitle>
            <UserMinus className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatNumber(summary.inactiveMembers)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary.totalMembers > 0 ? ((summary.inactiveMembers / summary.totalMembers) * 100).toFixed(1) : 0}% of total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Members</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.newMembersThisPeriod)}</div>
            <div className={`text-xs flex items-center mt-1 ${memberGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
              {memberGrowthRate >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(memberGrowthRate).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Members by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Members by Status</CardTitle>
            <CardDescription>Active vs Inactive</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summary.membersByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload, percent }: any) => `${payload?.status || ''} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {summary.membersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Members by Gender */}
        <Card>
          <CardHeader>
            <CardTitle>Members by Gender</CardTitle>
            <CardDescription>Gender distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summary.membersByGender}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload, percent }: any) => `${payload?.gender || ''} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {summary.membersByGender.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Members by Age Group */}
        <Card>
          <CardHeader>
            <CardTitle>Members by Age Group</CardTitle>
            <CardDescription>Age distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.membersByAgeGroup}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageGroup" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Groups */}
        <Card>
          <CardHeader>
            <CardTitle>Top Groups</CardTitle>
            <CardDescription>Members per group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.membersByGroup.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Groups and Departments */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Groups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.membersByGroup.length > 0 ? (
                summary.membersByGroup.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{item.group}</span>
                    <span className="text-sm font-bold">{formatNumber(item.count)} members</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No groups data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.membersByDepartment.length > 0 ? (
                summary.membersByDepartment.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{item.department}</span>
                    <span className="text-sm font-bold">{formatNumber(item.count)} members</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No departments data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
