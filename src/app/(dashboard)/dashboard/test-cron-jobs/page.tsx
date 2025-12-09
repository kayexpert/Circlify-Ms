import type { Metadata } from "next"
import { TestCronJobsPageClient } from "./test-cron-jobs-page-client"

export const metadata: Metadata = {
  title: "Test Cron Jobs",
  description: "Test birthday and event reminder cron jobs",
}

export default function TestCronJobsPage() {
  return <TestCronJobsPageClient />
}

