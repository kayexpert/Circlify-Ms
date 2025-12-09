import type { Metadata } from "next"
import { DashboardPageClient } from "./dashboard-client"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Overview of your organization's activities, members, and statistics",
}

export default function DashboardPage() {
  return <DashboardPageClient />
}
