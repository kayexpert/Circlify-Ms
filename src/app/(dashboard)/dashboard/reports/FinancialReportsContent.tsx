"use client"

import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useIncomeRecords } from "@/hooks/finance/useIncomeRecords"
import { useExpenditureRecords } from "@/hooks/finance/useExpenditureRecords"
import { useAccounts } from "@/hooks/finance/useAccounts"
import type { PeriodType, DateRange, FinancialSummary } from "./types"
import { getDateRangeForPeriod, formatCurrency, formatDate, formatNumber, getMonthYear, calculatePercentageChange, generateCSV, downloadCSV } from "./utils"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff"]

export default function FinancialReportsContent() {
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // Fetch data
  const { data: incomeRecords = [] } = useIncomeRecords()
  const { data: expenditureRecords = [] } = useExpenditureRecords()
  const { data: accounts = [] } = useAccounts()

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

  const previousExpenditure = useMemo(() => {
    return expenditureRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= previousPeriodRange.startDate && recordDate <= previousPeriodRange.endDate
    })
  }, [expenditureRecords, previousPeriodRange])

  // Calculate summary
  const summary: FinancialSummary = useMemo(() => {
    const totalIncome = filteredIncome.reduce((sum, record) => sum + record.amount, 0)
    const totalExpenditure = filteredExpenditure.reduce((sum, record) => sum + record.amount, 0)
    const netBalance = totalIncome - totalExpenditure

    // Income by category
    const incomeByCategoryMap = new Map<string, number>()
    filteredIncome.forEach((record) => {
      const current = incomeByCategoryMap.get(record.category) || 0
      incomeByCategoryMap.set(record.category, current + record.amount)
    })
    const incomeByCategory = Array.from(incomeByCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Expenditure by category
    const expenditureByCategoryMap = new Map<string, number>()
    filteredExpenditure.forEach((record) => {
      const current = expenditureByCategoryMap.get(record.category) || 0
      expenditureByCategoryMap.set(record.category, current + record.amount)
    })
    const expenditureByCategory = Array.from(expenditureByCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Income by month
    const incomeByMonthMap = new Map<string, number>()
    filteredIncome.forEach((record) => {
      const monthKey = getMonthYear(new Date(record.date))
      const current = incomeByMonthMap.get(monthKey) || 0
      incomeByMonthMap.set(monthKey, current + record.amount)
    })
    const incomeByMonth = Array.from(incomeByMonthMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Expenditure by month
    const expenditureByMonthMap = new Map<string, number>()
    filteredExpenditure.forEach((record) => {
      const monthKey = getMonthYear(new Date(record.date))
      const current = expenditureByMonthMap.get(monthKey) || 0
      expenditureByMonthMap.set(monthKey, current + record.amount)
    })
    const expenditureByMonth = Array.from(expenditureByMonthMap.entries())
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Top income sources
    const incomeSourceMap = new Map<string, number>()
    filteredIncome.forEach((record) => {
      const current = incomeSourceMap.get(record.source) || 0
      incomeSourceMap.set(record.source, current + record.amount)
    })
    const topIncomeSources = Array.from(incomeSourceMap.entries())
      .map(([source, amount]) => ({ source, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Top expenditure categories
    const topExpenditureCategories = expenditureByCategory.slice(0, 5)

    return {
      totalIncome,
      totalExpenditure,
      netBalance,
      incomeByCategory,
      expenditureByCategory,
      incomeByMonth,
      expenditureByMonth,
      topIncomeSources,
      topExpenditureCategories,
    }
  }, [filteredIncome, filteredExpenditure])

  // Calculate previous period totals
  const previousTotalIncome = useMemo(() => {
    return previousIncome.reduce((sum, record) => sum + record.amount, 0)
  }, [previousIncome])

  const previousTotalExpenditure = useMemo(() => {
    return previousExpenditure.reduce((sum, record) => sum + record.amount, 0)
  }, [previousExpenditure])

  // Calculate percentage changes
  const incomeChange = calculatePercentageChange(summary.totalIncome, previousTotalIncome)
  const expenditureChange = calculatePercentageChange(summary.totalExpenditure, previousTotalExpenditure)
  const balanceChange = calculatePercentageChange(summary.netBalance, previousTotalIncome - previousTotalExpenditure)

  // Combined monthly data for chart
  const monthlyData = useMemo(() => {
    const monthSet = new Set<string>()
    summary.incomeByMonth.forEach((item) => monthSet.add(item.month))
    summary.expenditureByMonth.forEach((item) => monthSet.add(item.month))

    return Array.from(monthSet)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((month) => {
        const income = summary.incomeByMonth.find((item) => item.month === month)?.amount || 0
        const expenditure = summary.expenditureByMonth.find((item) => item.month === month)?.amount || 0
        return {
          month,
          income,
          expenditure,
          net: income - expenditure,
        }
      })
  }, [summary])

  // Export to CSV
  const handleExport = () => {
    const headers = ["Date", "Type", "Category", "Source/Description", "Amount", "Method", "Reference"]
    const rows: (string | number)[][] = []

    filteredIncome.forEach((record) => {
      rows.push([
        formatDate(record.date),
        "Income",
        record.category,
        record.source,
        record.amount,
        record.method,
        record.reference,
      ])
    })

    filteredExpenditure.forEach((record) => {
      rows.push([
        formatDate(record.date),
        "Expenditure",
        record.category,
        record.description,
        record.amount,
        record.method,
        record.reference,
      ])
    })

    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `financial-report-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.csv`)
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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalIncome)}</div>
            <div className={`text-xs flex items-center mt-1 ${incomeChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {incomeChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(incomeChange).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenditure)}</div>
            <div className={`text-xs flex items-center mt-1 ${expenditureChange <= 0 ? "text-green-600" : "text-red-600"}`}>
              {expenditureChange <= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(expenditureChange).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary.netBalance)}
            </div>
            <div className={`text-xs flex items-center mt-1 ${balanceChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {balanceChange >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
              {Math.abs(balanceChange).toFixed(1)}% from previous period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income vs Expenditure Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenditure Trend</CardTitle>
            <CardDescription>Monthly comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#82ca9d" name="Income" />
                <Line type="monotone" dataKey="expenditure" stroke="#ff7300" name="Expenditure" />
                <Line type="monotone" dataKey="net" stroke="#8884d8" name="Net" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
            <CardDescription>Top categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summary.incomeByCategory.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload, percent }: any) => `${payload?.category || ''} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {summary.incomeByCategory.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expenditure by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Expenditure by Category</CardTitle>
            <CardDescription>Top categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summary.expenditureByCategory.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload, percent }: any) => `${payload?.category || ''} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#ff7300"
                  dataKey="amount"
                >
                  {summary.expenditureByCategory.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
            <CardDescription>Income and expenditure bars</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="income" fill="#82ca9d" name="Income" />
                <Bar dataKey="expenditure" fill="#ff7300" name="Expenditure" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Sources and Categories */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Income Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.topIncomeSources.length > 0 ? (
                summary.topIncomeSources.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{item.source}</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No income data for this period</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Expenditure Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.topExpenditureCategories.length > 0 ? (
                summary.topExpenditureCategories.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm font-bold text-red-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No expenditure data for this period</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
