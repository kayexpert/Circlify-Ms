import type { Metadata } from "next"
import { EventsPageClient } from "./events-page-client"

export const metadata: Metadata = {
  title: "Events",
  description: "Manage organization events and activities",
}

export default function EventsPage() {
  return <EventsPageClient />
}
