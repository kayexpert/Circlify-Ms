"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, Package, DollarSign, TrendingUp, ArrowUpRight } from "lucide-react"
import { useAssets } from "@/hooks/assets"
import { useAssetDisposals } from "@/hooks/assets"
import type { PeriodType, DateRange, AssetSummary } from "./types"
import { getDateRangeForPeriod, formatCurrency, formatDate, formatNumber, generateCSV, downloadCSV } from "./utils"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff"]

export default function AssetReportsContent() {
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)

  // Fetch data
  const { data: assets = [] } = useAssets()
  const { data: disposals = [] } = useAssetDisposals()

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

  // Filter disposals by date range
  const filteredDisposals = useMemo(() => {
    return disposals.filter((disposal) => {
      const disposalDate = new Date(disposal.date)
      return disposalDate >= dateRange.startDate && disposalDate <= dateRange.endDate
    })
  }, [disposals, dateRange])

  // Calculate summary
  const summary: AssetSummary = useMemo(() => {
    const totalAssets = assets.length
    const totalAssetValue = assets.reduce((sum, asset) => sum + asset.value, 0)
    const averageAssetValue = totalAssets > 0 ? totalAssetValue / totalAssets : 0

    // Assets by category
    const categoryMap = new Map<string, { count: number; value: number }>()
    assets.forEach((asset) => {
      const existing = categoryMap.get(asset.category) || { count: 0, value: 0 }
      categoryMap.set(asset.category, {
        count: existing.count + 1,
        value: existing.value + asset.value,
      })
    })
    const assetsByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.value - a.value)

    // Assets by status
    const statusMap = new Map<string, { count: number; value: number }>()
    assets.forEach((asset) => {
      const existing = statusMap.get(asset.status) || { count: 0, value: 0 }
      statusMap.set(asset.status, {
        count: existing.count + 1,
        value: existing.value + asset.value,
      })
    })
    const assetsByStatus = Array.from(statusMap.entries()).map(([status, data]) => ({ status, ...data }))

    // Assets by condition
    const conditionMap = new Map<string, number>()
    assets.forEach((asset) => {
      conditionMap.set(asset.condition, (conditionMap.get(asset.condition) || 0) + 1)
    })
    const assetsByCondition = Array.from(conditionMap.entries()).map(([condition, count]) => ({ condition, count }))

    // Disposals this period
    const disposalsThisPeriod = filteredDisposals.length
    const disposalValue = filteredDisposals.reduce((sum, disposal) => sum + disposal.amount, 0)

    return {
      totalAssets,
      totalAssetValue,
      assetsByCategory,
      assetsByStatus,
      assetsByCondition,
      disposalsThisPeriod,
      disposalValue,
      averageAssetValue,
    }
  }, [assets, filteredDisposals])

  // Export to CSV
  const handleExport = () => {
    const headers = ["Name", "Category", "Quantity", "Condition", "Purchase Date", "Value", "Status"]
    const rows: (string | number)[][] = []

    assets.forEach((asset) => {
      rows.push([
        asset.name,
        asset.category,
        asset.quantity,
        asset.condition,
        formatDate(asset.purchaseDate),
        asset.value,
        asset.status,
      ])
    })

    const csv = generateCSV(headers, rows)
    downloadCSV(csv, `asset-report-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.csv`)
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
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.totalAssets)}</div>
            <div className="text-xs text-muted-foreground mt-1">Items tracked</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asset Value</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalAssetValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">Combined value</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Asset Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.averageAssetValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">Per asset</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disposals This Period</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary.disposalsThisPeriod)}</div>
            <div className="text-xs text-muted-foreground mt-1">{formatCurrency(summary.disposalValue)} value</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Assets by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Category</CardTitle>
            <CardDescription>Count and value</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.assetsByCategory.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value: number, name: string) => (name === "value" ? formatCurrency(value) : formatNumber(value))} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Count" />
                <Bar yAxisId="right" dataKey="value" fill="#82ca9d" name="Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Assets by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Status</CardTitle>
            <CardDescription>Distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={summary.assetsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload, percent }: any) => `${payload?.status || ''} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {summary.assetsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Assets by Condition */}
        <Card>
          <CardHeader>
            <CardTitle>Assets by Condition</CardTitle>
            <CardDescription>Condition distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.assetsByCondition}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="condition" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Asset Value by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Value by Status</CardTitle>
            <CardDescription>Value distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.assetsByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category Details */}
      <Card>
        <CardHeader>
          <CardTitle>Top Asset Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {summary.assetsByCategory.length > 0 ? (
              summary.assetsByCategory.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <span className="text-sm font-medium">{item.category}</span>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatNumber(item.count)} assets | {formatCurrency(item.value)} value
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No asset data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
