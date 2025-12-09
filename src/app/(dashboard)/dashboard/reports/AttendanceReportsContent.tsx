"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useAttendanceRecords } from "@/hooks/members/useAttendance"
import type { PeriodType, DateRange, AttendanceSummary } from "./types"
import { getDateRangeForPeriod, formatDate, formatNumber, getMonthYear, calculatePercentageChange, generateCSV, downloadCSV } from "./utils"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function AttendanceReportsContent() {
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // Fetch data
  const { data: attendanceRecords = [] } = useAttendanceRecords()

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate
    })
  }, [attendanceRecords, dateRange])

  // Calculate summary
  const summary: AttendanceSummary = useMemo(() => {
    const totalAttendance = filteredRecords.reduce((sum, record) => sum + record.total_attendance, 0)
    const averageAttendance = filteredRecords.length > 0 ? totalAttendance / filteredRecords.length : 0

    // Attendance by service type
    const serviceMap = new Map<string, { total: number; count: number }>()
    filteredRecords.forEach((record) => {
      const existing = serviceMap.get(record.service_type) || { total: 0, count: 0 }
      serviceMap.set(record.service_type, {
        total: existing.total + record.total_attendance,
        count: existing.count + 1,
      })
    })
    const attendanceByService = Array.from(serviceMap.entries()).map(([serviceType, data]) => ({
      serviceType,
      total: data.total,
      average: data.count > 0 ? data.total / data.count : 0,
    }))

    // Attendance by month
    const monthMap = new Map<string, { total: number; men: number; women: number; children: number }>()
    filteredRecords.forEach((record) => {
      const monthKey = getMonthYear(new Date(record.date))
      const existing = monthMap.get(monthKey) || { total: 0, men: 0, women: 0, children: 0 }
      monthMap.set(monthKey, {
        total: existing.total + record.total_attendance,
        men: existing.men + (record.men || 0),
        women: existing.women + (record.women || 0),
        children: existing.children + (record.children || 0),
      })
    })
    const attendanceByMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Attendance trend (daily)
    const attendanceTrend = filteredRecords
      .map((record) => ({
        date: formatDate(record.date),
        total: record.total_attendance,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Peak attendance
    const peakAttendance = filteredRecords.reduce(
      (peak, record) => {
        if (record.total_attendance > peak.total) {
          return { date: formatDate(record.date), total: record.total_attendance }
        }
        return peak
      },
      { date: "", total: 0 }
    )

    // First timers
    const firstTimers = filteredRecords.reduce((sum, record) => sum + (record.first_timers || 0), 0)

    return {
      totalAttendance,
      averageAttendance,
      attendanceByService,
      attendanceByMonth,
      attendanceTrend,
      peakAttendance,
      firstTimers,
    }
  }, [filteredRecords])

  // Calculate previous period for comparison
  const previousPeriodRange = useMemo(() => {
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevEnd = new Date(dateRange.startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - daysDiff)
    return { startDate: prevStart, endDate: prevEnd }
  }, [dateRange])

  const previousRecords = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= previousPeriodRange.startDate && recordDate <= previousPeriodRange.endDate
    })
  }, [attendanceRecords, previousPeriodRange])

  const previousTotalAttendance = useMemo(() => {
    return previousRecords.reduce((sum, record) => sum + record.total_attendance, 0)
  }, [previousRecords])

  const previousAverageAttendance = useMemo(() => {
    return previousRecords.length > 0 ? previousTotalAttendance / previousRecords.length : 0
  }, [previousRecords, previousTotalAttendance])

  const attendanceGrowthRate = calculatePercentageChange(summary.averageAttendance, previousAverageAttendance)

  // Export to CSV
  const handleExport = () => {
    const headers = ["Date", "Service Type", "Total Attendance", "Men", "Women", "Children", "First Timers", "Notes"]
    const rows: (string | number)[][] = []

    filteredRecords.forEach((record) => {
      rows.push([
        formatDate(record.date),
        record.service_type,
        record.total_attendance,
        record.men || 0,
        record.women || 0,
        record.children || 0,
        record.first_timers || 0,
        record.notes || "",
      ])
    })

    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `attendance-report-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.csv`)
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
            <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalAttendance)}</div>
            <div className="text-xs text-muted-foreground mt-1">{filteredRecords.length} service(s)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(Math.round(summary.averageAttendance))}</div>
            <div className={`text-xs flex items-center mt-1 ${attendanceGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
              {attendanceGrowthRate >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(attendanceGrowthRate).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.peakAttendance.total)}</div>
            <div className="text-xs text-muted-foreground mt-1">{summary.peakAttendance.date}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">First Timers</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.firstTimers)}</div>
            <div className="text-xs text-muted-foreground mt-1">New visitors</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Attendance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Daily attendance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={summary.attendanceTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance by Service */}
        <Card>
          <CardHeader>
            <CardTitle>Attendance by Service Type</CardTitle>
            <CardDescription>Average per service</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.attendanceByService}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceType" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#82ca9d" name="Average Attendance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Attendance Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Attendance Breakdown</CardTitle>
            <CardDescription>Men, Women, and Children</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.attendanceByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="men" fill="#8884d8" name="Men" />
                <Bar dataKey="women" fill="#82ca9d" name="Women" />
                <Bar dataKey="children" fill="#ffc658" name="Children" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Type Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Service Type Comparison</CardTitle>
            <CardDescription>Total attendance per service</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.attendanceByService}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="serviceType" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="#ff7300" name="Total Attendance" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Details */}
      <Card>
        <CardHeader>
          <CardTitle>Service Type Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {summary.attendanceByService.length > 0 ? (
              summary.attendanceByService.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="text-sm font-medium">{item.serviceType}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      Average: {formatNumber(Math.round(item.average))} | Total: {formatNumber(item.total)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No attendance data for this period</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
