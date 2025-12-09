import type { Metadata } from "next"
import { SettingsPageClient } from "./settings-page-client"

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage system settings and configurations",
}

export default function SettingsPage() {
  return <SettingsPageClient />
}
