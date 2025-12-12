"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, Users, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, FileText } from "lucide-react"
import { useAttendanceRecords } from "@/hooks/members/useAttendance"
import type { PeriodType, DateRange, AttendanceSummary } from "./types"
import { getDateRangeForPeriod, formatDate, formatDateForChart, formatNumber, getMonthYear, calculatePercentageChange, generateCSV, downloadCSV } from "./utils"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function AttendanceReportsContent() {
  const [eventType, setEventType] = useState<string>("all")
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)
  const [reportGenerated, setReportGenerated] = useState(false)

  // Fetch data
  const { data: attendanceRecords = [] } = useAttendanceRecords()

  // Get unique event types (service types) from attendance records
  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    attendanceRecords.forEach((record) => {
      if (record.service_type) {
        types.add(record.service_type)
      }
    })
    return Array.from(types).sort()
  }, [attendanceRecords])

  // Helper function to normalize date for comparison (set time to 00:00:00)
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }

  // Helper function to get end of day (23:59:59.999)
  const getEndOfDay = (date: Date): Date => {
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return endOfDay
  }

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Filter records by date range and event type
  const filteredRecords = useMemo(() => {
    const startDate = normalizeDate(dateRange.startDate)
    const endDate = getEndOfDay(dateRange.endDate)
    
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date)
      const dateMatch = recordDate >= startDate && recordDate <= endDate
      const eventMatch = eventType === "all" || record.service_type === eventType
      return dateMatch && eventMatch
    })
  }, [attendanceRecords, dateRange, eventType])

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
        date: formatDateForChart(record.date),
        total: record.total_attendance,
        fullDate: record.date, // Keep for sorting
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .map(({ fullDate, ...rest }) => rest) // Remove fullDate after sorting

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
    const startDate = normalizeDate(previousPeriodRange.startDate)
    const endDate = getEndOfDay(previousPeriodRange.endDate)
    
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date)
      const dateMatch = recordDate >= startDate && recordDate <= endDate
      const eventMatch = eventType === "all" || record.service_type === eventType
      return dateMatch && eventMatch
    })
  }, [attendanceRecords, previousPeriodRange, eventType])

  const previousTotalAttendance = useMemo(() => {
    return previousRecords.reduce((sum, record) => sum + record.total_attendance, 0)
  }, [previousRecords])

  const previousAverageAttendance = useMemo(() => {
    return previousRecords.length > 0 ? previousTotalAttendance / previousRecords.length : 0
  }, [previousRecords, previousTotalAttendance])

  const attendanceGrowthRate = calculatePercentageChange(summary.averageAttendance, previousAverageAttendance)

  // Handle Generate Report
  const handleGenerateReport = () => {
    setReportGenerated(true)
  }

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

  // Calculate attendance breakdown data (Men, Women, Children)
  const attendanceBreakdown = useMemo(() => {
    const breakdown = filteredRecords.map((record) => ({
      date: formatDateForChart(record.date),
      men: record.men || 0,
      women: record.women || 0,
      children: record.children || 0,
      fullDate: record.date, // Keep for sorting
    }))
    return breakdown
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime())
      .map(({ fullDate, ...rest }) => rest) // Remove fullDate after sorting
  }, [filteredRecords])

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Report Form Section - Left Side (3 columns) */}
      <div className="col-span-12 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Configure and generate your attendance report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Event Type</label>
                <Select
                  value={eventType}
                  onValueChange={(v) => {
                    setEventType(v)
                    setReportGenerated(false)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <Select
                  value={period}
                  onValueChange={(v) => {
                    setPeriod(v as PeriodType)
                    setReportGenerated(false)
                  }}
                >
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
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <DatePicker
                      date={customRange?.startDate}
                      onSelect={(date) => {
                        setCustomRange((prev) => ({ ...prev, startDate: date || new Date(), endDate: prev?.endDate || new Date() }))
                        setReportGenerated(false)
                      }}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <DatePicker
                      date={customRange?.endDate}
                      onSelect={(date) => {
                        setCustomRange((prev) => ({ ...prev, startDate: prev?.startDate || new Date(), endDate: date || new Date() }))
                        setReportGenerated(false)
                      }}
                    />
                  </div>
                </>
              )}

              <div className="pt-2">
                <Button onClick={handleGenerateReport} className="w-full">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Display Section - Right Side (9 columns) */}
      <div className="col-span-12 lg:col-span-9 space-y-6">
        {reportGenerated ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Attendance Report</CardTitle>
                <CardDescription>
                  {eventType === "all" ? "All Events" : eventType} | Period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                </CardDescription>
              </div>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium text-muted-foreground">No Attendance Records Found</p>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    No attendance records found for {eventType === "all" ? "all events" : eventType} in the selected period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                  </p>
                </div>
              ) : (
                <>
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

              {/* Charts - Each on its own row */}
              <div className="space-y-6">
                {/* Attendance Trend for Selected Event */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Trend</CardTitle>
                    <CardDescription>
                      Daily attendance over time {eventType !== "all" ? `for ${eventType}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {summary.attendanceTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={summary.attendanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Total Attendance" />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No attendance data available for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Attendance Breakdown (Men, Women, Children) */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Breakdown</CardTitle>
                    <CardDescription>Men, Women, and Children {eventType !== "all" ? `for ${eventType}` : ""}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {attendanceBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={attendanceBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="men" fill="#8884d8" name="Men" />
                          <Bar dataKey="women" fill="#82ca9d" name="Women" />
                          <Bar dataKey="children" fill="#ffc658" name="Children" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        <p>No attendance breakdown data available for the selected period</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Attendance Report</CardTitle>
              <CardDescription>Select event type and duration, then click Generate Report to view your attendance report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No report generated yet</p>
                  <p className="text-sm mt-2">Use the form on the left to generate a report</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
