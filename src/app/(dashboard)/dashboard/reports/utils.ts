// Reports Module Utility Functions

import type { DateRange, PeriodType } from "./types"

/**
 * Get date range for a given period type
 */
export function getDateRangeForPeriod(period: PeriodType, customRange?: DateRange): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (period) {
    case "today":
      return {
        startDate: new Date(today),
        endDate: new Date(today),
      }

    case "week":
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay()) // Start of week (Sunday)
      return {
        startDate: weekStart,
        endDate: new Date(today),
      }

    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        startDate: monthStart,
        endDate: new Date(today),
      }

    case "quarter":
      const quarter = Math.floor(today.getMonth() / 3)
      const quarterStart = new Date(today.getFullYear(), quarter * 3, 1)
      return {
        startDate: quarterStart,
        endDate: new Date(today),
      }

    case "year":
      const yearStart = new Date(today.getFullYear(), 0, 1)
      return {
        startDate: yearStart,
        endDate: new Date(today),
      }

    case "custom":
      if (customRange) {
        return customRange
      }
      // Fallback to month if no custom range provided
      const fallbackStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        startDate: fallbackStart,
        endDate: new Date(today),
      }

    default:
      const defaultStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return {
        startDate: defaultStart,
        endDate: new Date(today),
      }
  }
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const day = d.getDate().toString().padStart(2, "0")
  const month = d.toLocaleString("default", { month: "short" })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  const year = d.getFullYear().toString().slice(-2)
  return `${day}-${capitalizedMonth}-${year}`
}

/**
 * Format date for chart display (day and month only, no year)
 */
export function formatDateForChart(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  const day = d.getDate().toString().padStart(2, "0")
  const month = d.toLocaleString("default", { month: "short" })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  return `${day}-${capitalizedMonth}`
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return `GH₵ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US")
}

/**
 * Get month name from date
 */
export function getMonthName(date: Date): string {
  return date.toLocaleString("default", { month: "short" })
}

/**
 * Get month-year string
 */
export function getMonthYear(date: Date): string {
  const month = date.toLocaleString("default", { month: "short" })
  const year = date.getFullYear()
  return `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

/**
 * Get age group from date of birth
 */
export function getAgeGroup(dateOfBirth: string | undefined): string {
  if (!dateOfBirth) return "Unknown"
  
  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  const age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age

  if (actualAge < 13) return "Children (0-12)"
  if (actualAge < 18) return "Youth (13-17)"
  if (actualAge < 30) return "Young Adults (18-29)"
  if (actualAge < 50) return "Adults (30-49)"
  if (actualAge < 65) return "Middle-Aged (50-64)"
  return "Seniors (65+)"
}

/**
 * Generate CSV content from data
 */
export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const csvRows = [headers.join(",")]
  
  rows.forEach((row) => {
    const csvRow = row.map((cell) => {
      if (typeof cell === "string" && cell.includes(",")) {
        return `"${cell}"`
      }
      return cell.toString()
    })
    csvRows.push(csvRow.join(","))
  })

  return csvRows.join("\n")
}

/**
 * Download CSV file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  
  link.setAttribute("href", url)
  link.setAttribute("download", filename)
  link.style.visibility = "hidden"
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
