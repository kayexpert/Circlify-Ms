"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { useTheme } from "next-themes"
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle } from "lucide-react"
import { Loader } from "@/components/ui/loader"
import { useIncomeRecords, useExpenditureRecords, useLiabilities, useAccounts } from "@/hooks/finance"

export default function OverviewContent() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [timeFilter, setTimeFilter] = useState<"all" | "month" | "quarter" | "year">("all")

  // Fetch data from database using hooks
  const { data: incomeRecords = [], isLoading: incomeLoading } = useIncomeRecords()
  const { data: expenditureRecords = [], isLoading: expenditureLoading } = useExpenditureRecords()
  const { data: liabilities = [], isLoading: liabilitiesLoading } = useLiabilities()
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts()

  const isLoading = incomeLoading || expenditureLoading || liabilitiesLoading || accountsLoading

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter records based on time filter
  const filteredIncomeRecords = useMemo(() => {
    if (timeFilter === "all") return incomeRecords

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return incomeRecords.filter((record) => {
      const recordDate = record.date instanceof Date ? record.date : new Date(record.date)
      
      switch (timeFilter) {
        case "month": {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
          return recordDate >= firstDay && recordDate <= lastDay
        }
        case "quarter": {
          const quarter = Math.floor(today.getMonth() / 3)
          const firstDay = new Date(today.getFullYear(), quarter * 3, 1)
          const lastDay = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
          return recordDate >= firstDay && recordDate <= lastDay
        }
        case "year": {
          const firstDay = new Date(today.getFullYear(), 0, 1)
          const lastDay = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
          return recordDate >= firstDay && recordDate <= lastDay
        }
        default:
          return true
      }
    })
  }, [incomeRecords, timeFilter])

  const filteredExpenditureRecords = useMemo(() => {
    if (timeFilter === "all") return expenditureRecords

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    return expenditureRecords.filter((record) => {
      const recordDate = record.date instanceof Date ? record.date : new Date(record.date)
      
      switch (timeFilter) {
        case "month": {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
          return recordDate >= firstDay && recordDate <= lastDay
        }
        case "quarter": {
          const quarter = Math.floor(today.getMonth() / 3)
          const firstDay = new Date(today.getFullYear(), quarter * 3, 1)
          const lastDay = new Date(today.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999)
          return recordDate >= firstDay && recordDate <= lastDay
        }
        case "year": {
          const firstDay = new Date(today.getFullYear(), 0, 1)
          const lastDay = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999)
          return recordDate >= firstDay && recordDate <= lastDay
        }
        default:
          return true
      }
    })
  }, [expenditureRecords, timeFilter])

  // Calculate totals for stats using filtered data
  const stats = useMemo(() => {
    const totalIncome = filteredIncomeRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
    const totalExpenses = filteredExpenditureRecords.reduce((sum, r) => sum + (r.amount || 0), 0)
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.balance || 0), 0)
    
    // Net Balance should be the sum of all account balances (source of truth)
    const netBalance = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)

    return [
      { label: "Total Income", value: `GH₵${totalIncome.toLocaleString()}`, icon: ArrowUpRight, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
      { label: "Total Expenses", value: `GH₵${totalExpenses.toLocaleString()}`, icon: ArrowDownRight, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
      { label: "Net Balance", value: `GH₵${netBalance.toLocaleString()}`, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
      { label: "Liabilities", value: `GH₵${totalLiabilities.toLocaleString()}`, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
    ]
  }, [filteredIncomeRecords, filteredExpenditureRecords, liabilities, accounts])

  // Compute trend data based on time filter
  const trendData = useMemo(() => {
    // Use filtered records if time filter is active, otherwise use all records
    const incomeData = timeFilter !== "all" ? filteredIncomeRecords : incomeRecords
    const expenseData = timeFilter !== "all" ? filteredExpenditureRecords : expenditureRecords

    if (timeFilter === "year") {
      // Last 5 years
      return Array.from({ length: 5 }, (_, i) => {
        const date = new Date()
        date.setFullYear(date.getFullYear() - (4 - i))
        const year = date.getFullYear()

        const yearIncome = incomeData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            return recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const yearExpenses = expenseData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            return recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const yearLiabilities = liabilities
          .filter((l) => {
            const liabilityDate = l.date instanceof Date ? l.date : new Date(l.date)
            const liabilityYear = liabilityDate.getFullYear()
            // Include liabilities that existed in this year and are not fully paid
            return liabilityYear <= year && l.status !== "Paid"
          })
          .reduce((sum, l) => sum + (l.balance || 0), 0)

        return {
          period: year.toString(),
          income: yearIncome,
          expenses: yearExpenses,
          liabilities: yearLiabilities
        }
      })
    } else if (timeFilter === "quarter") {
      // Last 4 quarters
      return Array.from({ length: 4 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (3 - i) * 3)
        const quarter = Math.floor(date.getMonth() / 3) + 1
        const year = date.getFullYear()
        const quarterStartMonth = (quarter - 1) * 3

        const quarterIncome = incomeData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            const recordQuarter = Math.floor(recordDate.getMonth() / 3) + 1
            return recordQuarter === quarter && recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const quarterExpenses = expenseData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            const recordQuarter = Math.floor(recordDate.getMonth() / 3) + 1
            return recordQuarter === quarter && recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const quarterLiabilities = liabilities
          .filter((l) => {
            const liabilityDate = l.date instanceof Date ? l.date : new Date(l.date)
            const liabilityQuarter = Math.floor(liabilityDate.getMonth() / 3) + 1
            return (liabilityQuarter === quarter && liabilityDate.getFullYear() === year) || 
                   (liabilityDate <= date && l.status !== "Paid")
          })
          .reduce((sum, l) => sum + (l.balance || 0), 0)

        return {
          period: `Q${quarter} ${year}`,
          income: quarterIncome,
          expenses: quarterExpenses,
          liabilities: quarterLiabilities
        }
      })
    } else if (timeFilter === "month") {
      // Last 6 months
      return Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (5 - i))
        const monthName = date.toLocaleString('default', { month: 'short' })
        const month = date.getMonth() + 1
        const year = date.getFullYear()

        const monthIncome = incomeData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const monthExpenses = expenseData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const monthLiabilities = liabilities
          .filter((l) => {
            const liabilityDate = l.date instanceof Date ? l.date : new Date(l.date)
            // Include liabilities that are not paid and were created in this month or earlier
            return (liabilityDate.getMonth() + 1 === month && liabilityDate.getFullYear() === year) || 
                   (liabilityDate <= date && l.status !== "Paid")
          })
          .reduce((sum, l) => sum + (l.balance || 0), 0)

        return {
          period: monthName,
          income: monthIncome,
          expenses: monthExpenses,
          liabilities: monthLiabilities
        }
      })
    } else {
      // All time - show last 12 months
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (11 - i))
        const monthName = date.toLocaleString('default', { month: 'short' })
        const month = date.getMonth() + 1
        const year = date.getFullYear()

        const monthIncome = incomeData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const monthExpenses = expenseData
          .filter((r) => {
            const recordDate = r.date instanceof Date ? r.date : new Date(r.date)
            return recordDate.getMonth() + 1 === month && recordDate.getFullYear() === year
          })
          .reduce((sum, r) => sum + (r.amount || 0), 0)

        const monthLiabilities = liabilities
          .filter((l) => {
            const liabilityDate = l.date instanceof Date ? l.date : new Date(l.date)
            // Include liabilities that are not paid and were created in this month or earlier
            return (liabilityDate.getMonth() + 1 === month && liabilityDate.getFullYear() === year) || 
                   (liabilityDate <= date && l.status !== "Paid")
          })
          .reduce((sum, l) => sum + (l.balance || 0), 0)

        return {
          period: monthName,
          income: monthIncome,
          expenses: monthExpenses,
          liabilities: monthLiabilities
        }
      })
    }
  }, [timeFilter, incomeRecords, expenditureRecords, filteredIncomeRecords, filteredExpenditureRecords, liabilities])

  // Compute expense by category using filtered data
  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>()
    
    filteredExpenditureRecords.forEach((record) => {
      const category = record.category || 'Other'
      const current = categoryMap.get(category) || 0
      categoryMap.set(category, current + (record.amount || 0))
    })

    // Convert to array with consistent colors
    const colors = [
      "#10b981", "#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", 
      "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
    ]
    
    return Array.from(categoryMap.entries()).map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length]
    })).sort((a, b) => b.value - a.value) // Sort by value descending
  }, [filteredExpenditureRecords])

  // Compute income by category using filtered data
  const incomeByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>()
    
    filteredIncomeRecords.forEach((record) => {
      const source = record.source || record.category || 'Other'
      const current = categoryMap.get(source) || 0
      categoryMap.set(source, current + (record.amount || 0))
    })

    // Convert to array with consistent colors
    const colors = [
      "#10b981", "#22c55e", "#84cc16", "#eab308", "#f59e0b",
      "#f97316", "#ef4444", "#ec4899", "#a855f7", "#6366f1"
    ]
    
    return Array.from(categoryMap.entries()).map(([name, value], index) => ({
      name,
      value,
      fill: colors[index % colors.length]
    })).sort((a, b) => b.value - a.value) // Sort by value descending
  }, [filteredIncomeRecords])

  const isDark = mounted && (resolvedTheme === "dark")
  const chartTextColor = isDark ? "#e5e7eb" : "#1f2937"
  const chartGridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"

  // Show loading state
  if (isLoading) {
    return <Loader text="Loading financial overview..." size="lg" />
  }

  return (
    <div className="space-y-4">
      {/* Time Filter at Top */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={timeFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("all")}
            className="px-4 cursor-pointer"
          >
            All
          </Button>
          <Button
            variant={timeFilter === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("month")}
            className="px-4 cursor-pointer"
          >
            Monthly
          </Button>
          <Button
            variant={timeFilter === "quarter" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("quarter")}
            className="px-4 cursor-pointer"
          >
            Quarterly
          </Button>
          <Button
            variant={timeFilter === "year" ? "default" : "ghost"}
            size="sm"
            onClick={() => setTimeFilter("year")}
            className="px-4 cursor-pointer"
          >
            Annually
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Financial Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
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
                  cursor={false}
                  contentStyle={{ 
                    backgroundColor: isDark ? "hsl(222.2 84% 4.9%)" : "hsl(0 0% 100%)",
                    border: `1px solid ${isDark ? "hsl(217.2 32.6% 17.5%)" : "hsl(214.3 31.8% 91.4%)"}`,
                    borderRadius: "0.5rem",
                    color: chartTextColor
                  }}
                  labelStyle={{ color: chartTextColor }}
                  formatter={(value: number) => `GH₵ ${value.toLocaleString()}`}
                />
                <Legend wrapperStyle={{ color: chartTextColor }} />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="liabilities" stroke="#f59e0b" strokeWidth={2} name="Liabilities" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>No data available for the selected period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income by Category and Expense by Category Charts */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Income by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: chartTextColor }}
                    axisLine={{ stroke: chartGridColor }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                      color: chartTextColor
                    }}
                    labelStyle={{ color: chartTextColor }}
                    formatter={(value: number) => `GH₵ ${value.toLocaleString()}`}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]}
                    activeBar={false}
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No income data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense by Category Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expense by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseByCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: chartTextColor }}
                    axisLine={{ stroke: chartGridColor }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
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
                      color: chartTextColor
                    }}
                    labelStyle={{ color: chartTextColor }}
                    formatter={(value: number) => `GH₵ ${value.toLocaleString()}`}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]}
                    activeBar={false}
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                <p>No expense data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
