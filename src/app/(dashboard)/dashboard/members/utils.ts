// Members Module Utility Functions

// Re-export formatDate from global utils for consistency
export { formatDate } from "@/lib/utils/date"

// Format date for record display (e.g., "28-Jan-24")
export function formatRecordDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  const day = dateObj.getDate().toString().padStart(2, "0")
  const month = dateObj.toLocaleString("default", { month: "short" })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  const year = dateObj.getFullYear().toString().slice(-2)
  return `${day}-${capitalizedMonth}-${year}`
}

// Format currency amount
export function formatCurrency(amount: number): string {
  return `GH₵ ${amount.toLocaleString()}`
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}
