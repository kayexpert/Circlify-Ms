// Finance Module Utility Functions

import { formatCurrency as formatCurrencyUtil } from "@/app/(dashboard)/dashboard/projects/utils"

export function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, "0")
  const month = date.toLocaleString("default", { month: "short" })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  const year = date.getFullYear().toString().slice(-2)
  return `${day}-${capitalizedMonth}-${year}`
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return formatCurrencyUtil(amount, currency)
}
