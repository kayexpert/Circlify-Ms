import type { Metadata } from "next"
import { MembersPageClient } from "./members-page-client"

export const metadata: Metadata = {
  title: "Members",
  description: "Manage your organization's members, visitors, attendance, and birthdays",
}

export default function MembersPage() {
  return <MembersPageClient />
}
