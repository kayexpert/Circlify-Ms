import type { Metadata } from "next"
import { ProjectsPageClient } from "./projects-page-client"

export const metadata: Metadata = {
  title: "Projects",
  description: "Manage projects, track income and expenditure",
}

export default function ProjectsPage() {
  return <ProjectsPageClient />
}

