import type { Metadata } from "next"
import { FinancePageClient } from "./finance-page-client"

export const metadata: Metadata = {
  title: "Finance",
  description: "Manage organization finances, budgets, and accounts",
}

export default function FinancePage() {
  return <FinancePageClient />
}
