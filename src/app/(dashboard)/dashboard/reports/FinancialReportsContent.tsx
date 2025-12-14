"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { Download, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, FileText, Activity } from "lucide-react"
import { useIncomeRecords } from "@/hooks/finance/useIncomeRecords"
import { useExpenditureRecords } from "@/hooks/finance/useExpenditureRecords"
import { useLiabilities } from "@/hooks/finance/useLiabilities"
import { useAssets } from "@/hooks/assets"
import { useOrganization } from "@/hooks/use-organization"
import type { PeriodType, DateRange, FinancialSummary } from "./types"
import { getDateRangeForPeriod, formatCurrency, formatDate, formatNumber, getMonthYear, calculatePercentageChange, generateCSV, downloadCSV } from "./utils"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, StickyTableHeader, TableRow } from "@/components/ui/table"
import { Pagination } from "@/components/ui/pagination"
import jsPDF from "jspdf"
// @ts-ignore - jspdf-autotable extends jsPDF prototype
import "jspdf-autotable"
import type { IncomeRecord, ExpenditureRecord, Liability } from "@/app/(dashboard)/dashboard/finance/types"

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#00ff00", "#ff00ff"]

export type FinancialReportType = "income-statement" | "expenditure-statement" | "liability-statement" | "financial-statement"

interface BalanceSheetData {
  assets: { category: string; value: number }[]
  totalAssets: number
  income: { category: string; amount: number }[]
  totalIncome: number
  expense: { category: string; amount: number }[]
  totalExpense: number
  liabilities: { category: string; balance: number }[]
  totalLiabilities: number
}

export default function FinancialReportsContent() {
  const { organization } = useOrganization()
  const currency = organization?.currency || "USD"
  const [reportType, setReportType] = useState<FinancialReportType>("income-statement")
  const [period, setPeriod] = useState<PeriodType>("month")
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)
  const [reportGenerated, setReportGenerated] = useState(false)

  // Fetch data
  const { data: incomeRecords = [] } = useIncomeRecords()
  const { data: expenditureRecords = [] } = useExpenditureRecords()
  const { data: liabilities = [] } = useLiabilities()
  const { data: assets = [] } = useAssets()

  // Calculate date range
  const dateRange = useMemo(() => {
    return getDateRangeForPeriod(period, customRange)
  }, [period, customRange])

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

  // Filter records by date range
  const filteredIncome = useMemo(() => {
    const startDate = normalizeDate(dateRange.startDate)
    const endDate = getEndOfDay(dateRange.endDate) // Include full end date
    
    return incomeRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= startDate && recordDate <= endDate
    })
  }, [incomeRecords, dateRange])

  const filteredExpenditure = useMemo(() => {
    const startDate = normalizeDate(dateRange.startDate)
    const endDate = getEndOfDay(dateRange.endDate) // Include full end date
    
    return expenditureRecords.filter((record) => {
      const recordDate = new Date(record.date)
      return recordDate >= startDate && recordDate <= endDate
    })
  }, [expenditureRecords, dateRange])

  // Filter liabilities by date range
  const filteredLiabilities = useMemo(() => {
    const startDate = normalizeDate(dateRange.startDate)
    const endDate = getEndOfDay(dateRange.endDate) // Include full end date
    
    return liabilities.filter((liability) => {
      const liabilityDate = new Date(liability.date)
      return liabilityDate >= startDate && liabilityDate <= endDate
    })
  }, [liabilities, dateRange])

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

  // Handle Generate Report
  const handleGenerateReport = () => {
    setReportGenerated(true)
  }

  // Calculate Financial Statement data (Balance Sheet)
  const balanceSheetData = useMemo(() => {
    // Assets by category - Include Available, Retired, and Maintained (exclude Disposed)
    const assetsByCategoryMap = new Map<string, number>()
    assets
      .filter((asset) => asset.status !== "Disposed")
      .forEach((asset) => {
        const current = assetsByCategoryMap.get(asset.category) || 0
        // Ensure value and quantity are numbers
        const assetValue = Number(asset.value) || 0
        const assetQuantity = Number(asset.quantity) || 0
        assetsByCategoryMap.set(asset.category, current + assetValue * assetQuantity)
      })
    const assetsByCategory = Array.from(assetsByCategoryMap.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value)
    const totalAssets = assetsByCategory.reduce((sum, item) => sum + item.value, 0)

    // Income by category (all time or period-based)
    const incomeByCategoryMap = new Map<string, number>()
    filteredIncome.forEach((record) => {
      const current = incomeByCategoryMap.get(record.category) || 0
      incomeByCategoryMap.set(record.category, current + record.amount)
    })
    const incomeByCategory = Array.from(incomeByCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
    const totalIncome = incomeByCategory.reduce((sum, item) => sum + item.amount, 0)

    // Expense by category
    const expenseByCategoryMap = new Map<string, number>()
    filteredExpenditure.forEach((record) => {
      const current = expenseByCategoryMap.get(record.category) || 0
      expenseByCategoryMap.set(record.category, current + record.amount)
    })
    const expenseByCategory = Array.from(expenseByCategoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
    const totalExpense = expenseByCategory.reduce((sum, item) => sum + item.amount, 0)

      // Liabilities by category (what's left to pay) - filtered by date range
      const liabilitiesByCategoryMap = new Map<string, number>()
      filteredLiabilities
        .filter((liability) => liability.status !== "Paid")
        .forEach((liability) => {
          const current = liabilitiesByCategoryMap.get(liability.category) || 0
          liabilitiesByCategoryMap.set(liability.category, current + liability.balance)
        })
    const liabilitiesByCategory = Array.from(liabilitiesByCategoryMap.entries())
      .map(([category, balance]) => ({ category, balance }))
      .sort((a, b) => b.balance - a.balance)
    const totalLiabilities = liabilitiesByCategory.reduce((sum, item) => sum + item.balance, 0)

    return {
      assets: assetsByCategory,
      totalAssets,
      income: incomeByCategory,
      totalIncome,
      expense: expenseByCategory,
      totalExpense,
      liabilities: liabilitiesByCategory,
      totalLiabilities,
    }
  }, [assets, filteredIncome, filteredExpenditure, liabilities])

  // Export to PDF
  const handleExportPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    let yPos = margin

    // Header
    doc.setFontSize(18)
    doc.setFont(undefined, "bold")
    const reportTitle =
      reportType === "income-statement"
        ? "Income Statement"
        : reportType === "expenditure-statement"
        ? "Expenditure Statement"
        : reportType === "liability-statement"
        ? "Liability Statement"
        : "Financial Statement (Balance Sheet)"

    doc.text(reportTitle, margin, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    doc.text(
      `Period: ${formatDate(dateRange.startDate)} to ${formatDate(dateRange.endDate)}`,
      margin,
      yPos
    )
    yPos += 10
    doc.text(`Generated: ${formatDate(new Date())}`, margin, yPos)
    yPos += 15

    if (reportType === "income-statement") {
      // Income Statement PDF - Total
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text(`Total Income: ${formatCurrency(summary.totalIncome, currency)}`, margin, yPos)
      yPos += 15

      // Categories Table
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text("Income by Category", margin, yPos)
      yPos += 8
      const incomeCategoryData = summary.incomeByCategory.map((item) => [item.category, formatCurrency(item.amount, currency)])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Category", "Amount"]],
        body: incomeCategoryData.length > 0 ? incomeCategoryData : [["No categories", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: "bold" },
      })
      let finalY = (doc as any).lastAutoTable.finalY
      yPos = finalY + 15

      // Individual Records Table
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text("Individual Income Records", margin, yPos)
      yPos += 8
      const incomeRecordsData = filteredIncome.map((record) => [
        formatDate(record.date),
        record.category,
        record.source,
        record.method,
        formatCurrency(record.amount, currency),
      ])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Date", "Category", "Source", "Method", "Amount"]],
        body: incomeRecordsData.length > 0 ? incomeRecordsData : [["No records", "", "", "", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: "bold" },
        columnStyles: { 4: { halign: "right" } },
      })
    } else if (reportType === "expenditure-statement") {
      // Expenditure Statement PDF - Total
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text(`Total Expenditure: ${formatCurrency(summary.totalExpenditure, currency)}`, margin, yPos)
      yPos += 15

      // Categories Table
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text("Expenditure by Category", margin, yPos)
      yPos += 8
      const expenseCategoryData = summary.expenditureByCategory.map((item) => [item.category, formatCurrency(item.amount, currency)])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Category", "Amount"]],
        body: expenseCategoryData.length > 0 ? expenseCategoryData : [["No categories", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: "bold" },
      })
      let finalY = (doc as any).lastAutoTable.finalY
      yPos = finalY + 15

      // Individual Records Table
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text("Individual Expenditure Records", margin, yPos)
      yPos += 8
      const expenditureRecordsData = filteredExpenditure.map((record) => [
        formatDate(record.date),
        record.category,
        record.description,
        record.method,
        formatCurrency(record.amount, currency),
      ])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Date", "Category", "Description", "Method", "Amount"]],
        body: expenditureRecordsData.length > 0 ? expenditureRecordsData : [["No records", "", "", "", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: "bold" },
        columnStyles: { 4: { halign: "right" } },
      })
    } else if (reportType === "liability-statement") {
      // Liability Statement PDF - Filter outstanding liabilities by date range
      const outstandingLiabilities = filteredLiabilities.filter((liability) => liability.status !== "Paid" && liability.balance > 0)
      const totalOriginal = outstandingLiabilities.reduce((sum, l) => sum + l.originalAmount, 0)
      const totalPaid = outstandingLiabilities.reduce((sum, l) => sum + l.amountPaid, 0)
      const totalBalance = outstandingLiabilities.reduce((sum, l) => sum + l.balance, 0)

      // Total
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text(`Total Outstanding Balance: ${formatCurrency(totalBalance, currency)}`, margin, yPos)
      yPos += 8
      doc.setFontSize(10)
      doc.setFont(undefined, "normal")
      doc.text(`Original: ${formatCurrency(totalOriginal, currency)} | Paid: ${formatCurrency(totalPaid, currency)}`, margin, yPos)
      yPos += 15

      // Individual Liability Records Table
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text("Outstanding Liabilities", margin, yPos)
      yPos += 8
      const liabilityData = outstandingLiabilities.map((liability) => [
        formatDate(liability.date),
        liability.category,
        liability.description,
        liability.creditor,
        formatCurrency(liability.originalAmount, currency),
        formatCurrency(liability.amountPaid, currency),
        formatCurrency(liability.balance, currency),
        liability.status,
      ])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Date", "Category", "Description", "Creditor", "Original Amount", "Amount Paid", "Balance Remaining", "Status"]],
        body: liabilityData.length > 0 ? liabilityData : [["No liabilities", "", "", "", formatCurrency(0, currency), formatCurrency(0, currency), formatCurrency(0, currency), ""]],
        theme: "striped",
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: "bold" },
        columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
      })
    } else if (reportType === "financial-statement") {
      // Financial Statement (Balance Sheet) PDF
      // Assets
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Assets", margin, yPos)
      yPos += 8
      const assetData = balanceSheetData.assets.map((item) => [item.category, formatCurrency(item.value, currency)])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Asset Category", "Value"]],
        body: assetData.length > 0 ? assetData : [["No assets", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: "bold" },
      })
      let finalY = (doc as any).lastAutoTable.finalY
      doc.setFont(undefined, "bold")
      doc.text(`Total Assets: ${formatCurrency(balanceSheetData.totalAssets, currency)}`, margin, finalY + 10)
      yPos = finalY + 20

      // Income
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Income", margin, yPos)
      yPos += 8
      const incomeData = balanceSheetData.income.map((item) => [item.category, formatCurrency(item.amount, currency)])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Income Category", "Amount"]],
        body: incomeData.length > 0 ? incomeData : [["No income", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [46, 125, 50], textColor: 255, fontStyle: "bold" },
      })
      finalY = (doc as any).lastAutoTable.finalY
      doc.setFont(undefined, "bold")
      doc.text(`Total Income: ${formatCurrency(balanceSheetData.totalIncome, currency)}`, margin, finalY + 10)
      yPos = finalY + 20

      // Expense
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Expense", margin, yPos)
      yPos += 8
      const expenseData = balanceSheetData.expense.map((item) => [item.category, formatCurrency(item.amount, currency)])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Expense Category", "Amount"]],
        body: expenseData.length > 0 ? expenseData : [["No expenses", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: "bold" },
      })
      finalY = (doc as any).lastAutoTable.finalY
      doc.setFont(undefined, "bold")
      doc.text(`Total Expense: ${formatCurrency(balanceSheetData.totalExpense, currency)}`, margin, finalY + 10)
      yPos = finalY + 20

      // Liabilities
      doc.setFontSize(14)
      doc.setFont(undefined, "bold")
      doc.text("Liabilities", margin, yPos)
      yPos += 8
      const liabilityData = balanceSheetData.liabilities.map((item) => [item.category, formatCurrency(item.balance, currency)])
      // @ts-expect-error - jspdf-autotable extends jsPDF prototype
      doc.autoTable({
        startY: yPos,
        head: [["Liability Category", "Balance Remaining"]],
        body: liabilityData.length > 0 ? liabilityData : [["No liabilities", formatCurrency(0, currency)]],
        theme: "striped",
        headStyles: { fillColor: [230, 126, 34], textColor: 255, fontStyle: "bold" },
      })
      finalY = (doc as any).lastAutoTable.finalY
      doc.setFont(undefined, "bold")
      doc.text(`Total Liabilities: ${formatCurrency(balanceSheetData.totalLiabilities, currency)}`, margin, finalY + 10)
    }

    // Save PDF
    const filename = `${reportTitle.toLowerCase().replace(/\s+/g, "-")}-${formatDate(dateRange.startDate)}-to-${formatDate(dateRange.endDate)}.pdf`
    doc.save(filename)
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Report Form Section - Left Side (3 columns) */}
      <div className="col-span-12 lg:col-span-3">
      <Card>
        <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>Configure and generate your financial report</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Report Type</label>
                <Select value={reportType} onValueChange={(v) => { setReportType(v as FinancialReportType); setReportGenerated(false) }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income-statement">Income Statement</SelectItem>
                    <SelectItem value="expenditure-statement">Expenditure Statement</SelectItem>
                    <SelectItem value="liability-statement">Liability Statement</SelectItem>
                    <SelectItem value="financial-statement">Financial Statement (Balance Sheet)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodType); setReportGenerated(false) }}>
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
                <CardTitle>
                  {reportType === "income-statement"
                    ? "Income Statement"
                    : reportType === "expenditure-statement"
                    ? "Expenditure Statement"
                    : reportType === "liability-statement"
                    ? "Liability Statement"
                    : "Financial Statement (Balance Sheet)"}
                </CardTitle>
                <CardDescription>
                  Period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                </CardDescription>
              </div>
              <Button onClick={handleExportPDF} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              {reportType === "financial-statement" ? (
                <FinancialStatementView data={balanceSheetData} currency={currency} />
              ) : reportType === "income-statement" ? (
                <IncomeStatementView summary={summary} dateRange={dateRange} records={filteredIncome} currency={currency} />
              ) : reportType === "expenditure-statement" ? (
                <ExpenditureStatementView summary={summary} dateRange={dateRange} records={filteredExpenditure} currency={currency} />
              ) : (
                <LiabilityStatementView liabilities={filteredLiabilities} dateRange={dateRange} currency={currency} />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Financial Report</CardTitle>
              <CardDescription>Select report type and duration, then click Generate Report to view your financial report</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
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

// Financial Statement (Balance Sheet) View Component
function FinancialStatementView({ data, currency }: { data: BalanceSheetData; currency: string }) {
  // Calculate Financial Health
  const financialHealth = useMemo(() => {
    const netWorth = data.totalAssets - data.totalLiabilities
    const netIncome = data.totalIncome - data.totalExpense
    const totalResources = data.totalAssets + data.totalIncome

    // Calculate health score (0-100)
    let healthScore = 0
    let healthStatus: "Excellent" | "Good" | "Fair" | "Poor" = "Poor"
    let healthColor = "text-red-600"
    let healthBgColor = "bg-red-50 dark:bg-red-950/20"

    // Factor 1: Net Worth Ratio (40% weight)
    if (totalResources > 0) {
      const netWorthRatio = (netWorth / totalResources) * 100
      healthScore += Math.max(0, Math.min(40, (netWorthRatio + 100) / 2))
    }

    // Factor 2: Income vs Expense (30% weight)
    if (data.totalIncome > 0) {
      const incomeRatio = (netIncome / data.totalIncome) * 100
      healthScore += Math.max(0, Math.min(30, (incomeRatio + 100) / 2))
    } else if (data.totalExpense === 0) {
      healthScore += 15 // Neutral if no income or expenses
    }

    // Factor 3: Liability Coverage (30% weight)
    if (data.totalAssets > 0) {
      const liabilityRatio = (data.totalLiabilities / data.totalAssets) * 100
      healthScore += Math.max(0, Math.min(30, 30 - (liabilityRatio / 3.33))) // Lower liabilities = higher score
    } else if (data.totalLiabilities === 0) {
      healthScore += 30 // Perfect if no liabilities
    }

    // Determine status
    if (healthScore >= 75) {
      healthStatus = "Excellent"
      healthColor = "text-green-600"
      healthBgColor = "bg-green-50 dark:bg-green-950/20"
    } else if (healthScore >= 60) {
      healthStatus = "Good"
      healthColor = "text-blue-600"
      healthBgColor = "bg-blue-50 dark:bg-blue-950/20"
    } else if (healthScore >= 45) {
      healthStatus = "Fair"
      healthColor = "text-yellow-600"
      healthBgColor = "bg-yellow-50 dark:bg-yellow-950/20"
    }

    return {
      score: Math.round(healthScore),
      status: healthStatus,
      color: healthColor,
      bgColor: healthBgColor,
      netWorth,
      netIncome,
    }
  }, [data])

  return (
    <div className="space-y-6">
      {/* Financial Health Card */}
      <Card className={`${financialHealth.bgColor} border-2`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${financialHealth.color}`} />
            <CardTitle>Financial Health</CardTitle>
          </div>
          <span className={`text-2xl font-bold ${financialHealth.color}`}>
            {financialHealth.status}
          </span>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">Overall financial position based on assets, income, expenses, and liabilities</CardDescription>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Health Score</span>
                <span className={`text-lg font-bold ${financialHealth.color}`}>
                  {financialHealth.score}/100
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    financialHealth.score >= 75
                      ? "bg-green-600"
                      : financialHealth.score >= 60
                      ? "bg-blue-600"
                      : financialHealth.score >= 45
                      ? "bg-yellow-600"
                      : "bg-red-600"
                  }`}
                  style={{ width: `${financialHealth.score}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net Worth</p>
                <p className={`text-lg font-semibold ${financialHealth.netWorth >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(financialHealth.netWorth, currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Net Income</p>
                <p className={`text-lg font-semibold ${financialHealth.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(financialHealth.netIncome, currency)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-400">Assets</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-medium">Fixed Assets</span>
            </div>
          </div>
          <div className="divide-y">
            {data.assets.length > 0 ? (
              data.assets.map((item, index) => (
                <div key={index} className="px-4 py-3 flex justify-between items-center hover:bg-muted/50">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-medium">{formatCurrency(item.value, currency)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No assets available</div>
            )}
          </div>
          <div className="bg-muted/50 px-4 py-3 border-t font-semibold flex justify-between">
            <span>Total Assets</span>
            <span>{formatCurrency(data.totalAssets, currency)}</span>
          </div>
        </div>
      </div>

      {/* Income Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-green-700 dark:text-green-400">Income</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-medium">Income Categories</span>
            </div>
          </div>
          <div className="divide-y">
            {data.income.length > 0 ? (
              data.income.map((item, index) => (
                <div key={index} className="px-4 py-3 flex justify-between items-center hover:bg-muted/50">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(item.amount, currency)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No income recorded</div>
            )}
          </div>
          <div className="bg-muted/50 px-4 py-3 border-t font-semibold flex justify-between">
            <span>Total Income</span>
            <span className="text-green-700 dark:text-green-400">{formatCurrency(data.totalIncome, currency)}</span>
          </div>
        </div>
      </div>

      {/* Expense Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-red-700 dark:text-red-400">Expense</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-medium">Expenditure Categories</span>
            </div>
          </div>
          <div className="divide-y">
            {data.expense.length > 0 ? (
              data.expense.map((item, index) => (
                <div key={index} className="px-4 py-3 flex justify-between items-center hover:bg-muted/50">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(item.amount, currency)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No expenses recorded</div>
            )}
          </div>
          <div className="bg-muted/50 px-4 py-3 border-t font-semibold flex justify-between">
            <span>Total Expense</span>
            <span className="text-red-700 dark:text-red-400">{formatCurrency(data.totalExpense, currency)}</span>
          </div>
        </div>
      </div>

      {/* Liabilities Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-orange-700 dark:text-orange-400">Liabilities</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <div className="flex justify-between items-center">
              <span className="font-medium">Liability Categories</span>
            </div>
          </div>
          <div className="divide-y">
            {data.liabilities.length > 0 ? (
              data.liabilities.map((item, index) => (
                <div key={index} className="px-4 py-3 flex justify-between items-center hover:bg-muted/50">
                  <span className="text-sm">{item.category}</span>
                  <span className="font-medium text-orange-600 dark:text-orange-400">{formatCurrency(item.balance, currency)}</span>
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-muted-foreground">No outstanding liabilities</div>
            )}
          </div>
          <div className="bg-muted/50 px-4 py-3 border-t font-semibold flex justify-between">
            <span>Total Liabilities (Balance Remaining)</span>
            <span className="text-orange-700 dark:text-orange-400">{formatCurrency(data.totalLiabilities, currency)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Income Statement View Component
function IncomeStatementView({
  summary,
  dateRange,
  records,
  currency,
}: {
  summary: FinancialSummary
  dateRange: DateRange
  records: IncomeRecord[]
  currency: string
}) {
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryPageSize, setCategoryPageSize] = useState(10)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(10)

  // Paginate categories
  const categoryStartIndex = (categoryPage - 1) * categoryPageSize
  const categoryEndIndex = categoryStartIndex + categoryPageSize
  const paginatedCategories = summary.incomeByCategory.slice(categoryStartIndex, categoryEndIndex)
  const categoryTotalPages = Math.ceil(summary.incomeByCategory.length / categoryPageSize)

  // Paginate records
  const recordsStartIndex = (recordsPage - 1) * recordsPageSize
  const recordsEndIndex = recordsStartIndex + recordsPageSize
  const paginatedRecords = records.slice(recordsStartIndex, recordsEndIndex)
  const recordsTotalPages = Math.ceil(records.length / recordsPageSize)

  const hasData = records.length > 0 || summary.incomeByCategory.length > 0

  return (
    <div className="space-y-6">
      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No Income Records Found</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              No income records found for the selected period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Total Income Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalIncome, currency)}</div>
            </CardContent>
          </Card>

      {/* Income by Category Table */}
      <Card>
        <CardHeader>
          <CardTitle>Income by Category</CardTitle>
          <CardDescription>Breakdown of income by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <StickyTableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </StickyTableHeader>
              <TableBody>
                {paginatedCategories.length > 0 ? (
                  paginatedCategories.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(item.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      No income categories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {categoryTotalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={categoryPage}
                totalPages={categoryTotalPages}
                onPageChange={setCategoryPage}
                pageSize={categoryPageSize}
                totalItems={summary.incomeByCategory.length}
                showPageSizeSelector={true}
                onPageSizeChange={(newSize) => {
                  setCategoryPageSize(newSize)
                  setCategoryPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Income Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Income Records</CardTitle>
          <CardDescription>Detailed list of all income transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <StickyTableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </StickyTableHeader>
              <TableBody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{record.source}</TableCell>
                      <TableCell>{record.method}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(record.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No income records found for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {recordsTotalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={recordsPage}
                totalPages={recordsTotalPages}
                onPageChange={setRecordsPage}
                pageSize={recordsPageSize}
                totalItems={records.length}
                showPageSizeSelector={true}
                onPageSizeChange={(newSize) => {
                  setRecordsPageSize(newSize)
                  setRecordsPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}

// Expenditure Statement View Component
function ExpenditureStatementView({
  summary,
  dateRange,
  records,
  currency,
}: {
  summary: FinancialSummary
  dateRange: DateRange
  records: ExpenditureRecord[]
  currency: string
}) {
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryPageSize, setCategoryPageSize] = useState(10)
  const [recordsPage, setRecordsPage] = useState(1)
  const [recordsPageSize, setRecordsPageSize] = useState(10)

  // Paginate categories
  const categoryStartIndex = (categoryPage - 1) * categoryPageSize
  const categoryEndIndex = categoryStartIndex + categoryPageSize
  const paginatedCategories = summary.expenditureByCategory.slice(categoryStartIndex, categoryEndIndex)
  const categoryTotalPages = Math.ceil(summary.expenditureByCategory.length / categoryPageSize)

  // Paginate records
  const recordsStartIndex = (recordsPage - 1) * recordsPageSize
  const recordsEndIndex = recordsStartIndex + recordsPageSize
  const paginatedRecords = records.slice(recordsStartIndex, recordsEndIndex)
  const recordsTotalPages = Math.ceil(records.length / recordsPageSize)
  const hasData = records.length > 0 || summary.expenditureByCategory.length > 0

  return (
    <div className="space-y-6">
      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingDown className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No Expenditure Records Found</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              No expenditure records found for the selected period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Total Expenditure Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenditure</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalExpenditure, currency)}</div>
            </CardContent>
          </Card>

      {/* Expenditure by Category Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expenditure by Category</CardTitle>
          <CardDescription>Breakdown of expenditure by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <StickyTableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </StickyTableHeader>
              <TableBody>
                {paginatedCategories.length > 0 ? (
                  paginatedCategories.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.category}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(item.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      No expenditure categories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {categoryTotalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={categoryPage}
                totalPages={categoryTotalPages}
                onPageChange={setCategoryPage}
                pageSize={categoryPageSize}
                totalItems={summary.expenditureByCategory.length}
                showPageSizeSelector={true}
                onPageSizeChange={(newSize) => {
                  setCategoryPageSize(newSize)
                  setCategoryPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Expenditure Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Expenditure Records</CardTitle>
          <CardDescription>Detailed list of all expenditure transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <StickyTableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </StickyTableHeader>
              <TableBody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{record.category}</TableCell>
                      <TableCell>{record.description}</TableCell>
                      <TableCell>{record.method}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">
                        {formatCurrency(record.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No expenditure records found for this period
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {recordsTotalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={recordsPage}
                totalPages={recordsTotalPages}
                onPageChange={setRecordsPage}
                pageSize={recordsPageSize}
                totalItems={records.length}
                showPageSizeSelector={true}
                onPageSizeChange={(newSize) => {
                  setRecordsPageSize(newSize)
                  setRecordsPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}

// Liability Statement View Component
function LiabilityStatementView({
  liabilities,
  dateRange,
  currency,
}: {
  liabilities: Liability[]
  dateRange: DateRange
  currency: string
}) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter outstanding liabilities
  const outstandingLiabilities = useMemo(() => {
    return liabilities.filter((liability) => liability.status !== "Paid" && liability.balance > 0)
  }, [liabilities])

  // Calculate totals
  const totalOriginal = useMemo(() => {
    return outstandingLiabilities.reduce((sum, liability) => sum + liability.originalAmount, 0)
  }, [outstandingLiabilities])

  const totalPaid = useMemo(() => {
    return outstandingLiabilities.reduce((sum, liability) => sum + liability.amountPaid, 0)
  }, [outstandingLiabilities])

  const totalBalance = useMemo(() => {
    return outstandingLiabilities.reduce((sum, liability) => sum + liability.balance, 0)
  }, [outstandingLiabilities])

  // Paginate liabilities
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedLiabilities = outstandingLiabilities.slice(startIndex, endIndex)
  const totalPages = Math.ceil(outstandingLiabilities.length / pageSize)

  const hasData = outstandingLiabilities.length > 0

  return (
    <div className="space-y-6">
      {!hasData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium text-muted-foreground">No Outstanding Liabilities Found</p>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              No outstanding liabilities found for the selected period: {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Total Outstanding Balance Card */}
          <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Outstanding Balance</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalBalance, currency)}</div>
          <div className="mt-2 text-xs text-muted-foreground">
            Original: {formatCurrency(totalOriginal, currency)} | Paid: {formatCurrency(totalPaid, currency)}
          </div>
        </CardContent>
      </Card>

      {/* Individual Liability Records Table */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Liabilities</CardTitle>
          <CardDescription>Detailed list of all outstanding liabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto border rounded-lg">
            <Table>
              <StickyTableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Creditor</TableHead>
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Balance Remaining</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </StickyTableHeader>
              <TableBody>
                {paginatedLiabilities.length > 0 ? (
                  paginatedLiabilities.map((liability) => (
                    <TableRow key={liability.id}>
                      <TableCell>{formatDate(liability.date)}</TableCell>
                      <TableCell>{liability.category}</TableCell>
                      <TableCell>{liability.description}</TableCell>
                      <TableCell>{liability.creditor}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(liability.originalAmount, currency)}
                      </TableCell>
                      <TableCell className="text-right text-blue-600 font-medium">
                        {formatCurrency(liability.amountPaid, currency)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-orange-600">
                        {formatCurrency(liability.balance, currency)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            liability.status === "Paid"
                              ? "bg-green-100 text-green-700"
                              : liability.status === "Partially Paid"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {liability.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No outstanding liabilities found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                pageSize={pageSize}
                totalItems={outstandingLiabilities.length}
                showPageSizeSelector={true}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize)
                  setPage(1)
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  )
}
