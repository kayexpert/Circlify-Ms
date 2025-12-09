"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, TrendingUp, DollarSign, Users, Package, BarChart3, CheckCircle2, AlertCircle, XCircle } from "lucide-react"
import { useIncomeRecords } from "@/hooks/finance/useIncomeRecords"
import { useExpenditureRecords } from "@/hooks/finance/useExpenditureRecords"
import { useMembers } from "@/hooks/members/useMembers"
import { useAttendanceRecords } from "@/hooks/members/useAttendance"
import { useAssets } from "@/hooks/assets"
import { useAssetDisposals } from "@/hooks/assets"
import type { PeriodType, DateRange, ComprehensiveReport } from "./types"
import { getDateRangeForPeriod, formatCurrency, formatDate, formatNumber, calculatePercentageChange, generateCSV, downloadCSV } from "./utils"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

export default function ComprehensiveReportsContent() {
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // Fetch data from all modules
  const { data: incomeRecords = [] } = useIncomeRecords()
  const { data: expenditureRecords = [] } = useExpenditureRecords()
  const { data: members = [] } = useMembers()
  const { data: attendanceRecords = [] } = useAttendanceRecords()
  const { data: assets = [] } = useAssets()
  const { data: disposals = [] } = useAssetDisposals()

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Filter records by date range
  const filteredIncome = useMemo(() => {
    return incomeRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate
    })
  }, [incomeRecords, dateRange])

  const filteredExpenditure = useMemo(() => {
    return expenditureRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate
    })
  }, [expenditureRecords, dateRange])

  const filteredAttendance = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= dateRange.startDate && recordDate <= dateRange.endDate
    })
  }, [attendanceRecords, dateRange])

  const filteredDisposals = useMemo(() => {
    return disposals.filter((disposal) => {
      const disposalDate = new Date(disposal.date)
      return disposalDate >= dateRange.startDate && disposalDate <= dateRange.endDate
    })
  }, [disposals, dateRange])

  // Calculate previous period for comparison
  const previousPeriodRange = useMemo(() => {
    const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
    const prevEnd = new Date(dateRange.startDate)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - daysDiff)
    return { startDate: prevStart, endDate: prevEnd }
  }, [dateRange])

  const previousIncome = useMemo(() => {
    return incomeRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= previousPeriodRange.startDate && recordDate <= previousPeriodRange.endDate
    })
  }, [incomeRecords, previousPeriodRange])

  const previousAttendance = useMemo(() => {
    return attendanceRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= previousPeriodRange.startDate && recordDate <= previousPeriodRange.endDate
    })
  }, [attendanceRecords, previousPeriodRange])

  // Calculate comprehensive report
  const report: ComprehensiveReport = useMemo(() => {
    // Financial metrics
    const totalIncome = filteredIncome.reduce((sum, record) => sum + record.amount, 0)
    const totalExpenditure = filteredExpenditure.reduce((sum, record) => sum + record.amount, 0)
    const netBalance = totalIncome - totalExpenditure

    // Member metrics
    const totalMembers = members.length
    const activeMembers = members.filter((m: any) => m.membership_status === "active").length
    const newMembersThisPeriod = members.filter((m: any) => {
      if (!m.join_date) return false
      const joinDate = new Date(m.join_date)
      return joinDate >= dateRange.startDate && joinDate <= dateRange.endDate
    }).length

    // Attendance metrics
    const totalAttendance = filteredAttendance.reduce((sum, record) => sum + record.total_attendance, 0)
    const averageAttendance = filteredAttendance.length > 0 ? totalAttendance / filteredAttendance.length : 0

    // Asset metrics
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0)
    const availableAssets = assets.filter((a) => a.status === "Available").length
    const assetUtilization = assets.length > 0 ? (availableAssets / assets.length) * 100 : 0

    // Growth rates
    const previousTotalIncome = previousIncome.reduce((sum, record) => sum + record.amount, 0)
    const previousAverageAttendance = previousAttendance.length > 0
      ? previousAttendance.reduce((sum, record) => sum + record.total_attendance, 0) / previousAttendance.length
      : 0

    const previousNewMembers = members.filter((m: any) => {
      if (!m.join_date) return false
      const joinDate = new Date(m.join_date)
      return joinDate >= previousPeriodRange.startDate && joinDate <= previousPeriodRange.endDate
    }).length

    const memberGrowthRate = previousNewMembers === 0
      ? (newMembersThisPeriod > 0 ? 100 : 0)
      : ((newMembersThisPeriod - previousNewMembers) / previousNewMembers) * 100

    const attendanceGrowthRate = calculatePercentageChange(averageAttendance, previousAverageAttendance)

    // Financial health calculation
    let financialHealth: "Excellent" | "Good" | "Fair" | "Poor"
    if (netBalance > 0 && totalIncome > 0) {
      const profitMargin = (netBalance / totalIncome) * 100
      if (profitMargin >= 30) financialHealth = "Excellent"
      else if (profitMargin >= 15) financialHealth = "Good"
      else if (profitMargin >= 0) financialHealth = "Fair"
      else financialHealth = "Poor"
    } else if (netBalance > 0) {
      financialHealth = "Good"
    } else {
      financialHealth = "Poor"
    }

    return {
      period: `${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`,
      financial: {
        totalIncome,
        totalExpenditure,
        netBalance,
        incomeByCategory: [],
        expenditureByCategory: [],
        incomeByMonth: [],
        expenditureByMonth: [],
        topIncomeSources: [],
        topExpenditureCategories: [],
      },
      members: {
        totalMembers,
        activeMembers,
        inactiveMembers: totalMembers - activeMembers,
        visitors: 0,
        newMembersThisPeriod,
        membersByGender: [],
        membersByStatus: [],
        membersByAgeGroup: [],
        membersByGroup: [],
        membersByDepartment: [],
      },
      attendance: {
        totalAttendance,
        averageAttendance,
        attendanceByService: [],
        attendanceByMonth: [],
        attendanceTrend: [],
        peakAttendance: { date: "", total: 0 },
        firstTimers: 0,
      },
      assets: {
        totalAssets: assets.length,
        totalAssetValue,
        assetsByCategory: [],
        assetsByStatus: [],
        assetsByCondition: [],
        disposalsThisPeriod: filteredDisposals.length,
        disposalValue: filteredDisposals.reduce((sum, d) => sum + d.amount, 0),
        averageAssetValue: assets.length > 0 ? totalAssetValue / assets.length : 0,
      },
      keyMetrics: {
        memberGrowthRate,
        attendanceGrowthRate,
        financialHealth,
        assetUtilization,
      },
    }
  }, [
    filteredIncome,
    filteredExpenditure,
    members,
    filteredAttendance,
    assets,
    filteredDisposals,
    dateRange,
    previousIncome,
    previousAttendance,
    previousPeriodRange,
  ])

  // Export comprehensive report
  const handleExport = () => {
    const headers = [
      "Metric",
      "Value",
      "Category",
    ]
    const rows: (string | number)[][] = [
      ["Total Income", report.financial.totalIncome, "Financial"],
      ["Total Expenditure", report.financial.totalExpenditure, "Financial"],
      ["Net Balance", report.financial.netBalance, "Financial"],
      ["Total Members", report.members.totalMembers, "Members"],
      ["Active Members", report.members.activeMembers, "Members"],
      ["New Members", report.members.newMembersThisPeriod, "Members"],
      ["Total Attendance", report.attendance.totalAttendance, "Attendance"],
      ["Average Attendance", Math.round(report.attendance.averageAttendance), "Attendance"],
      ["Total Assets", report.assets.totalAssets, "Assets"],
      ["Total Asset Value", report.assets.totalAssetValue, "Assets"],
      ["Disposals", report.assets.disposalsThisPeriod, "Assets"],
      ["Member Growth Rate", `${report.keyMetrics.memberGrowthRate.toFixed(1)}%`, "Metrics"],
      ["Attendance Growth Rate", `${report.keyMetrics.attendanceGrowthRate.toFixed(1)}%`, "Metrics"],
      ["Financial Health", report.keyMetrics.financialHealth, "Metrics"],
      ["Asset Utilization", `${report.keyMetrics.assetUtilization.toFixed(1)}%`, "Metrics"],
    ]

    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `comprehensive-report-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.csv`)
  }

  // Financial health icon and color
  const getFinancialHealthDisplay = (health: string) => {
    switch (health) {
      case "Excellent":
        return { icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-100" }
      case "Good":
        return { icon: CheckCircle2, color: "text-blue-600", bgColor: "bg-blue-100" }
      case "Fair":
        return { icon: AlertCircle, color: "text-yellow-600", bgColor: "bg-yellow-100" }
      case "Poor":
        return { icon: XCircle, color: "text-red-600", bgColor: "bg-red-100" }
      default:
        return { icon: AlertCircle, color: "text-gray-600", bgColor: "bg-gray-100" }
    }
  }

  const healthDisplay = getFinancialHealthDisplay(report.keyMetrics.financialHealth)

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

      {/* Key Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.financial.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(report.financial.netBalance)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(report.financial.totalIncome)} income - {formatCurrency(report.financial.totalExpenditure)} expenses
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(report.members.totalMembers)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatNumber(report.members.activeMembers)} active | {formatNumber(report.members.newMembersThisPeriod)} new
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
            <BarChart3 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(Math.round(report.attendance.averageAttendance))}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatNumber(report.attendance.totalAttendance)} total
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Value</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.assets.totalAssetValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatNumber(report.assets.totalAssets)} assets
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Member Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.keyMetrics.memberGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
              {report.keyMetrics.memberGrowthRate >= 0 ? "+" : ""}
              {report.keyMetrics.memberGrowthRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatNumber(report.members.newMembersThisPeriod)} new members
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.keyMetrics.attendanceGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
              {report.keyMetrics.attendanceGrowthRate >= 0 ? "+" : ""}
              {report.keyMetrics.attendanceGrowthRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Compared to previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
            <healthDisplay.icon className={`h-4 w-4 ${healthDisplay.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${healthDisplay.color}`}>
              {report.keyMetrics.financialHealth}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Based on profit margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Utilization</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.keyMetrics.assetUtilization.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatNumber(assets.filter((a) => a.status === "Available").length)} available
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Income and expenditure overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Income</span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(report.financial.totalIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Expenditure</span>
              <span className="text-sm font-bold text-red-600">{formatCurrency(report.financial.totalExpenditure)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-medium">Net Balance</span>
              <span className={`text-sm font-bold ${report.financial.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(report.financial.netBalance)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Member Summary</CardTitle>
            <CardDescription>Membership overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Members</span>
              <span className="text-sm font-bold">{formatNumber(report.members.totalMembers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Active Members</span>
              <span className="text-sm font-bold text-green-600">{formatNumber(report.members.activeMembers)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">New This Period</span>
              <span className="text-sm font-bold text-purple-600">{formatNumber(report.members.newMembersThisPeriod)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-medium">Growth Rate</span>
              <span className={`text-sm font-bold ${report.keyMetrics.memberGrowthRate >= 0 ? "text-green-600" : "text-red-600"}`}>
                {report.keyMetrics.memberGrowthRate >= 0 ? "+" : ""}
                {report.keyMetrics.memberGrowthRate.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Summary</CardTitle>
            <CardDescription>Asset management overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Assets</span>
              <span className="text-sm font-bold">{formatNumber(report.assets.totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Value</span>
              <span className="text-sm font-bold text-green-600">{formatCurrency(report.assets.totalAssetValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Disposals</span>
              <span className="text-sm font-bold text-orange-600">{formatNumber(report.assets.disposalsThisPeriod)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-medium">Utilization</span>
              <span className="text-sm font-bold">{report.keyMetrics.assetUtilization.toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
