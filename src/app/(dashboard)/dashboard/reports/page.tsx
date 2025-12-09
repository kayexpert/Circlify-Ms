import type { Metadata } from "next"
import { ReportsPageClient } from "./reports-page-client"

export const metadata: Metadata = {
  title: "Reports",
  description: "View comprehensive reports and analytics",
}

export default function ReportsPage() {
  return <ReportsPageClient />
}
