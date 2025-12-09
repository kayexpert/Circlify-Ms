import type { Metadata } from "next"
import { MessagingPageClient } from "./messaging-page-client"

export const metadata: Metadata = {
  title: "Messaging",
  description: "Send SMS, emails, and notifications to members",
}

export default function MessagingPage() {
  return <MessagingPageClient />
}
